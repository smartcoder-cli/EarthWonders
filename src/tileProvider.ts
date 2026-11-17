/**
 * 智能级联瓦片加载与快速超分重采样 (Fast Tile Fallback & Resampler)
 *
 * 核心目标：
 * 解决偏远山区（如马丘比丘等）ArcGIS 返回 2521 字节 "Map data not yet available" 灰色占位贴图或 404 的问题。
 *
 * 性能架构原则：
 * 1. 零开销透传 (Zero-overhead Pass-through)：
 *    对于 99% 的正常高清卫星瓦片（尺寸 > 3500 字节），直接原样返回原生 Response，
 *    完全走浏览器原生流式加载、原生 HTTP/2 多路复用与硬盘缓存，0ms 额外开销，绝对不堵塞并发网络。
 * 2. 精准占位图拦截 (Surgical Placeholder Interception)：
 *    仅当瓦片为 404 或尺寸 <= 3500 字节且确认为 ArcGIS 灰色占位图时触发回退。
 * 3. 祖先瓦片聚合共享缓存 (Coalesced Ancestor Reuse)：
 *    缺失区域的所有子瓦片共享同一块已覆盖的父级卫星瓦片 (z=15 或 16)。
 *    仅需 1 次网络请求即可在内存中毫秒级为周边所有缺失瓦片完成四叉树平滑重采样合成，
 *    杜绝递归深层瀑布请求对浏览器连接槽位的死锁耗尽。
 */

export interface TileCoords {
  baseUrl: string;
  z: number;
  y: number;
  x: number;
  search: string;
}

const TILE_URL_PATTERN = /(https?:\/\/[^\/]+(?:\/[^\/]+)*\/tile\/)(\d+)\/(\d+)\/(\d+)(\?.*)?$/i;

// 缓存已解码的父级卫星图，供同区域多块子瓦片瞬间重采样
const parentBitmapCache = new Map<string, ImageBitmap>();
const inFlightParentFetches = new Map<string, Promise<ImageBitmap | null>>();

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
 * 判断给定瓦片数据是否为已知 ArcGIS 缺失占位图
 */
export function isPlaceholderTile(buffer: ArrayBuffer): boolean {
  const byteLen = buffer.byteLength;
  if (PLACEHOLDER_EXACT_SIZES.has(byteLen)) {
    return true;
  }
  if (byteLen <= 3500) {
    const text = new TextDecoder("latin1").decode(new Uint8Array(buffer, 0, Math.min(byteLen, 1024)));
    if (text.includes("not yet available") || text.includes("Map data not yet") || text.includes("No Data Available")) {
      return true;
    }
  }
  return false;
}

/**
 * 获取指定祖先瓦片的解码位图（带内存缓存与请求合并）
 */
async function getAncestorBitmap(
  baseUrl: string,
  z: number,
  y: number,
  x: number,
  search: string,
  originalFetch: typeof window.fetch,
): Promise<ImageBitmap | null> {
  const key = coordKey(baseUrl, z, y, x);
  const cached = parentBitmapCache.get(key);
  if (cached) return cached;

  const inFlight = inFlightParentFetches.get(key);
  if (inFlight) return inFlight;

  const fetchPromise = (async () => {
    try {
      const url = makeTileUrl(baseUrl, z, y, x, search);
      const res = await originalFetch(url);
      if (res.status !== 200) return null;
      const buf = await res.arrayBuffer();
      if (isPlaceholderTile(buf)) return null;

      const blob = new Blob([buf], { type: "image/jpeg" });
      const bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
      });
      parentBitmapCache.set(key, bitmap);
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
  const scale = 1 << depth;
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
 * 针对缺失或占位瓦片，快速匹配其可用祖先层级并重采样
 */
async function synthesizeFallbackTile(
  coords: TileCoords,
  originalFetch: typeof window.fetch,
): Promise<ArrayBuffer | null> {
  const { baseUrl, z, y, x, search } = coords;
  const targetLevels = [Math.min(16, z - 1), 15, 14].filter((lvl) => lvl < z && lvl >= 10);

  for (const pz of targetLevels) {
    const depth = z - pz;
    const scale = 1 << depth;
    const px = Math.floor(x / scale);
    const py = Math.floor(y / scale);

    const ancestor = await getAncestorBitmap(baseUrl, pz, py, px, search, originalFetch);
    if (ancestor) {
      try {
        return await resampleFromBitmap(ancestor, z, y, x, pz);
      } catch {
        // 继续尝试更上一层
      }
    }
  }

  return null;
}

let providerInstalled = false;

/**
 * 安装智能瓦片提供器拦截器
 */
export function installTileProvider(): void {
  if (providerInstalled) return;
  providerInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    const coords = parseTileUrl(url);

    // 非卫星瓦片请求，完全走原生 fetch
    if (!coords) {
      return originalFetch(input, init);
    }

    const signal = init?.signal ?? (input instanceof Request ? input.signal : null);
    if (signal?.aborted) {
      throw new DOMException("The user aborted a request.", "AbortError");
    }

    try {
      const res = await originalFetch(input, init);

      // (A) 若正常返回 200 且数据体正常（> 3500 字节），绝不可能是占位图，零开销直接透传原生 Response
      const lenHeader = res.headers.get("content-length");
      const len = lenHeader ? parseInt(lenHeader, 10) : 0;
      if (res.status === 200 && len > 3500) {
        return res;
      }

      // (B) 若为 200 但尺寸极小 (<= 3500 字节)，检验是否为带有占位图标记的残缺图
      let rawBuf: ArrayBuffer | null = null;
      if (res.status === 200) {
        rawBuf = await res.arrayBuffer();
        if (!isPlaceholderTile(rawBuf)) {
          return new Response(rawBuf, {
            status: 200,
            statusText: "OK",
            headers: res.headers,
          });
        }
      }

      // (C) 404 或命中占位图，启动祖先快速重采样
      if (!signal?.aborted) {
        const synthesizedBuf = await synthesizeFallbackTile(coords, originalFetch);
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
      }

      if (rawBuf) {
        return new Response(rawBuf, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }
      return res;
    } catch (err) {
      if ((err instanceof DOMException && err.name === "AbortError") || signal?.aborted) {
        throw err instanceof DOMException ? err : new DOMException("The user aborted a request.", "AbortError");
      }
      throw err;
    }
  };

  console.info("✨ [EarthWonders] 轻量高效的卫星瓦片无缝回退层已就绪。");
}
