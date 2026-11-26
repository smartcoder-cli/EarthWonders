/**
 * 智能级联瓦片加载与快速超分重采样 (Fast Tile Fallback & Resampler)
 *
 * 核心目标：
 * 1. 解决偏远山区/海域（如马丘比丘等）ArcGIS 返回占位图或 404 的问题。
 * 2. 解决斜视角地标背后远景瓦片因超时、HTTP 429/5xx 限流、网络抖动或低层级（z <= 10）缺失导致的永久黑洞/不加载问题。
 *
 * 性能架构原则：
 * 1. 零开销透传 (Zero-overhead Pass-through)：
 *    对于正常高清卫星瓦片（HTTP 200、非文本错误页且 Content-Length > 3500 字节），直接原样返回原生 Response，
 *    完全走浏览器原生流式加载与硬盘缓存。
 * 2. 独立超时与短退避重试 (Bounded Timeout & Transient Retry)：
 *    为外网瓦片请求附加独立的 AbortController 超时上限（避免挂死连接长期占满 4/25 并发槽位），
 *    遇到超时、网络异常或 408/429/5xx 时先短退避重试 1 次；仍失败则立即回退到祖先重采样。
 * 3. 全层级祖先重采样兜底 (Full-range Coalesced Ancestor Reuse)：
 *    对任意层级 z >= 1（不再局限于 z >= 10）在内存中合并拉取最近可用祖先瓦片并重采样为 256x256 JPEG，
 *    优先复用已解码的 LRU 祖先位图，消除空白块并避免底层 DataCache 永久锁死在 rejected Promise。
 */

export interface TileCoords {
  baseUrl: string;
  z: number;
  y: number;
  x: number;
  search: string;
}

export interface TileProviderOptions {
  /** 单次外部瓦片网络请求超时毫秒数（默认 9000ms） */
  timeoutMs?: number;
  /** 遇到临时网络错误或 408/429/5xx 的快速重试次数（默认 1 次） */
  retryCount?: number;
  /** 重试退避基础等待毫秒数（默认 280ms） */
  retryDelayMs?: number;
  /** 可选自定义重采样回调（供无 DOM 单测注入） */
  resampleTile?: (coords: TileCoords, originalFetch: typeof fetch, signal: AbortSignal | null) => Promise<ArrayBuffer | null>;
}

const TILE_URL_PATTERN = /(https?:\/\/[^\/]+(?:\/[^\/]+)*\/tile\/)(\d+)\/(\d+)\/(\d+)(\?.*)?$/i;

const DEFAULT_TILE_TIMEOUT_MS = 9000;
const DEFAULT_TRANSIENT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 280;

// 缓存已解码的父级卫星图，供同区域多块子瓦片瞬间重采样（带 LRU 容量限制防内存无界增长）
const MAX_PARENT_BITMAP_CACHE = 96;
const parentBitmapCache = new Map<string, ImageBitmap>();
const inFlightParentFetches = new Map<string, Promise<ImageBitmap | null>>();

function setParentBitmapCache(key: string, bitmap: ImageBitmap): void {
  if (parentBitmapCache.has(key)) {
    parentBitmapCache.delete(key);
  } else if (parentBitmapCache.size >= MAX_PARENT_BITMAP_CACHE) {
    const oldestKey = parentBitmapCache.keys().next().value;
    if (oldestKey !== undefined) {
      const oldestBitmap = parentBitmapCache.get(oldestKey);
      parentBitmapCache.delete(oldestKey);
      oldestBitmap?.close?.();
    }
  }
  parentBitmapCache.set(key, bitmap);
}

export function clearParentBitmapCache(): void {
  for (const bitmap of parentBitmapCache.values()) {
    bitmap?.close?.();
  }
  parentBitmapCache.clear();
  inFlightParentFetches.clear();
}

export function parseTileUrl(url: string): TileCoords | null {
  const match = url.match(TILE_URL_PATTERN);
  if (!match) return null;
  return {
    baseUrl: match[1],
    z: parseInt(match[2], 10),
    y: parseInt(match[3], 10),
    x: parseInt(match[4], 10),
    search: match[5] ?? "",
  };
}

export function makeTileUrl(baseUrl: string, z: number, y: number, x: number, search = ""): string {
  return `${baseUrl}${z}/${y}/${x}${search}`;
}

function coordKey(baseUrl: string, z: number, y: number, x: number): string {
  return `${baseUrl}${z}/${y}/${x}`;
}

// 占位图常见精确字节大小
const PLACEHOLDER_EXACT_SIZES = new Set([2521, 1033, 2419, 2568, 2816]);

/**
 * 快速 32 位 FNV-1a 哈希计算，替代庞大的历史 MD5 实现
 */
export function fastHash32(buffer: ArrayBuffer): number {
  const bytes = new Uint8Array(buffer);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * 判断给定瓦片数据是否为已知 ArcGIS 缺失占位图或无效空包
 */
export function isPlaceholderTile(buffer: ArrayBuffer): boolean {
  const byteLen = buffer.byteLength;
  if (byteLen === 0 || PLACEHOLDER_EXACT_SIZES.has(byteLen)) {
    return true;
  }
  if (byteLen <= 3500) {
    const text = new TextDecoder("latin1").decode(new Uint8Array(buffer, 0, Math.min(byteLen, 1024)));
    if (
      text.includes("not yet available") ||
      text.includes("Map data not yet") ||
      text.includes("No Data Available")
    ) {
      return true;
    }
  }
  return false;
}

export function isNonImageContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return (
    lower.includes("text/") ||
    lower.includes("application/json") ||
    lower.includes("application/xml") ||
    lower.includes("application/xhtml")
  );
}

function isErrorPayloadText(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength === 0 || buffer.byteLength > 3500) return false;
  const sample = new TextDecoder("latin1")
    .decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 256)))
    .trimStart()
    .toLowerCase();
  return (
    sample.startsWith("<html") ||
    sample.startsWith("<!doctype") ||
    sample.startsWith("<?xml") ||
    sample.startsWith('{"error"')
  );
}

export function shouldRetryTileStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * 构建用于回退采样的祖先层级顺序（覆盖高、中、低所有 zoom >= 1 层级，避免 z <= 10 远景失去兜底）
 */
export function buildFallbackLevels(z: number): number[] {
  if (!Number.isFinite(z) || z <= 0) return [];

  const candidates =
    z > 16
      ? [16, 15, 14, 12]
      : [z - 1, z - 2, z - 3, z - 5];

  const unique: number[] = [];
  for (const lvl of candidates) {
    if (lvl >= 0 && lvl < z && !unique.includes(lvl)) {
      unique.push(lvl);
    }
  }
  return unique;
}

function createAbortError(): DOMException {
  return new DOMException("The user aborted a request.", "AbortError");
}

function createTimeoutError(timeoutMs: number): Error {
  const err = new Error(`Tile fetch timed out after ${timeoutMs}ms`);
  err.name = "TimeoutError";
  return err;
}

function sleepWithSignal(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  if (signal?.aborted) return Promise.reject(createAbortError());
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchOnceWithTimeout(
  originalFetch: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): Promise<Response> {
  if (callerSignal?.aborted) {
    throw createAbortError();
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onCallerAbort = () => {
    controller?.abort();
  };

  if (controller) {
    callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
    if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }
  }

  try {
    const nextInit: RequestInit = controller
      ? { ...(init ?? {}), signal: controller.signal }
      : (init ?? {});
    return await originalFetch(input, nextInit);
  } catch (err) {
    if (callerSignal?.aborted) {
      throw createAbortError();
    }
    if (timedOut) {
      throw createTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
}

/**
 * 获取指定祖先瓦片的解码位图（带内存缓存与并发请求合并）
 */
async function getAncestorBitmap(
  baseUrl: string,
  z: number,
  y: number,
  x: number,
  search: string,
  originalFetch: typeof fetch,
  timeoutMs: number,
): Promise<ImageBitmap | null> {
  const key = coordKey(baseUrl, z, y, x);
  const cached = parentBitmapCache.get(key);
  if (cached) {
    parentBitmapCache.delete(key);
    parentBitmapCache.set(key, cached);
    return cached;
  }

  const inFlight = inFlightParentFetches.get(key);
  if (inFlight) return inFlight;

  const fetchPromise = (async () => {
    try {
      const url = makeTileUrl(baseUrl, z, y, x, search);
      const res = await fetchOnceWithTimeout(originalFetch, url, undefined, null, timeoutMs);
      if (res.status !== 200 || isNonImageContentType(res.headers.get("content-type"))) {
        return null;
      }
      const buf = await res.arrayBuffer();
      if (isPlaceholderTile(buf)) return null;

      const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
      const blob = new Blob([buf], { type: mime });
      const bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
      });
      setParentBitmapCache(key, bitmap);
      return bitmap;
    } catch {
      return null;
    } finally {
      inFlightParentFetches.delete(key);
    }
  })();

  inFlightParentFetches.set(key, fetchPromise);
  return fetchPromise;
}

let supportsOffscreenCanvas2D: boolean | null = null;
function checkOffscreenCanvas2DSupport(): boolean {
  if (supportsOffscreenCanvas2D !== null) return supportsOffscreenCanvas2D;
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const testCanvas = new OffscreenCanvas(1, 1);
      supportsOffscreenCanvas2D = Boolean(testCanvas.getContext("2d"));
      return supportsOffscreenCanvas2D;
    }
  } catch {
    // ignore
  }
  supportsOffscreenCanvas2D = false;
  return false;
}

/**
 * 从祖先位图按四叉树象限截取并超分辨率合成 256x256 瓦片
 */
async function resampleFromBitmap(
  ancestorBitmap: ImageBitmap,
  childZ: number,
  childY: number,
  childX: number,
  ancestorZ: number,
): Promise<ArrayBuffer> {
  const depth = childZ - ancestorZ;
  const scale = 2 ** depth;
  const subW = ancestorBitmap.width / scale;
  const subH = ancestorBitmap.height / scale;
  const subX = (childX % scale) * subW;
  const subY = (childY % scale) * subH;

  const useOffscreen = checkOffscreenCanvas2DSupport();
  const canvas = useOffscreen ? new OffscreenCanvas(256, 256) : document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error("Canvas context failed");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(ancestorBitmap, subX, subY, subW, subH, 0, 0, 256, 256);

  if (useOffscreen && "convertToBlob" in canvas) {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({
      type: "image/jpeg",
      quality: 0.88,
    });
    return await blob.arrayBuffer();
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? b.arrayBuffer().then(resolve, reject) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.88,
    );
  });
}

/**
 * 针对缺失、占位或网络失败瓦片，先零开销检索已缓存祖先位图，再按层级链拉取并重采样
 */
async function synthesizeFallbackTile(
  coords: TileCoords,
  originalFetch: typeof fetch,
  signal: AbortSignal | null | undefined,
  timeoutMs: number,
): Promise<ArrayBuffer | null> {
  const { baseUrl, z, y, x, search } = coords;

  // 1. 先检查最近几层祖先位图是否已在内存中命中（0ms 无网络兜底）
  const minCachedAncestor = Math.max(0, z - 6);
  for (let pz = z - 1; pz >= minCachedAncestor; pz--) {
    if (signal?.aborted) return null;
    const scale = 2 ** (z - pz);
    const px = Math.floor(x / scale);
    const py = Math.floor(y / scale);
    const cached = parentBitmapCache.get(coordKey(baseUrl, pz, py, px));
    if (cached) {
      parentBitmapCache.delete(coordKey(baseUrl, pz, py, px));
      parentBitmapCache.set(coordKey(baseUrl, pz, py, px), cached);
      try {
        return await resampleFromBitmap(cached, z, y, x, pz);
      } catch {
        // fallback to network fetch below
      }
    }
  }

  // 2. 依次尝试从较近的祖先层级抓取并解码
  const targetLevels = buildFallbackLevels(z);
  for (const pz of targetLevels) {
    if (signal?.aborted) return null;
    const scale = 2 ** (z - pz);
    const px = Math.floor(x / scale);
    const py = Math.floor(y / scale);

    const ancestor = await getAncestorBitmap(baseUrl, pz, py, px, search, originalFetch, timeoutMs);
    if (ancestor && !signal?.aborted) {
      try {
        return await resampleFromBitmap(ancestor, z, y, x, pz);
      } catch {
        // 继续尝试更上一层
      }
    }
  }

  return null;
}

/**
 * 创建带超时控制、短退避重试与全层级重采样兜底的 fetch 处理器（方便单测与注入复用）
 */
export function createTileFetchHandler(
  originalFetch: typeof fetch,
  options: TileProviderOptions = {},
): typeof fetch {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TILE_TIMEOUT_MS;
  const retryCount = Math.max(0, options.retryCount ?? DEFAULT_TRANSIENT_RETRIES);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const resampleFn = options.resampleTile;

  return async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    const coords = parseTileUrl(url);
    if (!coords) {
      return originalFetch(input, init);
    }

    const signal = init?.signal ?? (typeof Request !== "undefined" && input instanceof Request ? input.signal : null);
    if (signal?.aborted) {
      throw createAbortError();
    }

    let lastRes: Response | null = null;
    let rawBuf: ArrayBuffer | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const res = await fetchOnceWithTimeout(originalFetch, input, init, signal, timeoutMs);
        lastRes = res;

        if (res.status === 200) {
          const contentType = res.headers.get("content-type");
          const lenHeader = res.headers.get("content-length");
          const len = lenHeader ? parseInt(lenHeader, 10) : 0;

          // (A) 正常高清卫星图直接零拷贝透传
          if (len > 3500 && !isNonImageContentType(contentType)) {
            return res;
          }

          // (B) 小尺寸或未标明长度的响应需检验正文，排除占位图及 HTTP 200 伪装的文本/JSON 错误页
          rawBuf = await res.arrayBuffer();
          if (
            rawBuf.byteLength > 0 &&
            !isNonImageContentType(contentType) &&
            !isPlaceholderTile(rawBuf) &&
            !isErrorPayloadText(rawBuf)
          ) {
            return new Response(rawBuf, {
              status: 200,
              statusText: "OK",
              headers: res.headers,
            });
          }

          // 命中占位图或错误文本页，无需重试同 URL，直接回退祖先重采样
          break;
        }

        // (C) 404 通常为固定缺块，无需重试直接进祖先重采样
        if (res.status === 404) {
          break;
        }

        // (D) 408/425/429/5xx 等临时服务端异常：短退避后重试
        if (shouldRetryTileStatus(res.status) && attempt < retryCount) {
          await sleepWithSignal(retryDelayMs * (attempt + 1), signal);
          continue;
        }
        break;
      } catch (err) {
        if ((err instanceof DOMException && err.name === "AbortError") || signal?.aborted) {
          throw createAbortError();
        }
        lastError = err;
        if (attempt < retryCount) {
          await sleepWithSignal(retryDelayMs * (attempt + 1), signal);
          continue;
        }
      }
    }

    if (signal?.aborted) {
      throw createAbortError();
    }

    // 启动祖先快速重采样兜底（含 z <= 10 低层级及网络/5xx/429 异常）
    const synthesizedBuf = resampleFn
      ? await resampleFn(coords, originalFetch, signal ?? null)
      : await synthesizeFallbackTile(coords, originalFetch, signal, timeoutMs);

    if (synthesizedBuf) {
      return new Response(synthesizedBuf, {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(synthesizedBuf.byteLength),
          "X-Earth-Wonders-Fallback": "resampled",
        },
      });
    }

    if (lastRes && (lastRes.status === 404 || rawBuf !== null)) {
      return rawBuf !== null
        ? new Response(rawBuf, {
            status: lastRes.status,
            statusText: lastRes.statusText,
            headers: lastRes.headers,
          })
        : lastRes;
    }

    if (lastError !== null) {
      throw lastError;
    }
    throw new Error(`Failed to load tile (${lastRes?.status ?? "unknown"}): ${url}`);
  };
}

let providerInstalled = false;

/**
 * 安装智能瓦片提供器拦截器
 */
export function installTileProvider(options: TileProviderOptions = {}): void {
  if (providerInstalled || typeof window === "undefined") return;
  providerInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = createTileFetchHandler(originalFetch, options);

  console.info("✨ [EarthWonders] 增强版卫星瓦片超时保护、自动重试与全层级重采样层已就绪。");
}
