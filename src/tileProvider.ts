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
 *    仅当瓦片为 404 或尺寸 <= 3500 字节且确认为 ArcGIS 灰色占位图（2521 字节或 MD5 命中）时触发回退。
 * 3. 祖先瓦片聚合共享缓存 (Coalesced Ancestor Reuse)：
 *    缺失区域的所有子瓦片共享同一块已覆盖的父级卫星瓦片 (z=15 或 16)。
 *    仅需 1 次网络请求即可在内存中毫秒级为周边所有缺失瓦片完成四叉树平滑重采样合成，
 *    杜绝递归深层瀑布请求对浏览器 6 个 HTTP 连接槽位的死锁耗尽。
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

// 已知 ArcGIS "Map data not yet available" 占位图 MD5 指纹
const KNOWN_PLACEHOLDER_MD5 = new Set([
  "f27d9de7f80c13501f470595e327aa6d",
  "8faad7340d8aa531473fa5812eefcceb",
  "ae3e9ff740f9c2d7f8a7e0a81d77cbef",
  "97dd8fc2d226de59b369527ec3c3fe70",
  "2eec5a8120fa26f6ebff2a30364d9f78",
  "c8df81c81cf63d085df5e2361d7a36cb",
  "0bfeb0ef6ab0c7329fbfa56fa08ddab4",
  "3fb15de7361cd8c16ca61c80ae55f417",
  "df3a8d11624c96aa91136cbb8a379374",
  "21e25e983ba4353cbaf8ec3ee5aa8cfb",
]);

function computeMd5(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  const words: number[] = new Array(Math.ceil((len + 8) / 4) + 16).fill(0);
  for (let i = 0; i < len; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  words[len >> 2] |= 0x80 << ((len % 4) * 8);
  words[(((len + 8) >> 6) << 4) + 14] = (len * 8) & 0xffffffff;
  words[(((len + 8) >> 6) << 4) + 15] = Math.floor((len * 8) / 0x100000000);

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < words.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    a = ff(a, b, c, d, words[i + 0] || 0, 7, -680876936);
    d = ff(d, a, b, c, words[i + 1] || 0, 12, -389564586);
    c = ff(c, d, a, b, words[i + 2] || 0, 17, 606105819);
    b = ff(b, c, d, a, words[i + 3] || 0, 22, -1044525330);
    a = ff(a, b, c, d, words[i + 4] || 0, 7, -176418897);
    d = ff(d, a, b, c, words[i + 5] || 0, 12, 1200080426);
    c = ff(c, d, a, b, words[i + 6] || 0, 17, -1473231341);
    b = ff(b, c, d, a, words[i + 7] || 0, 22, -45705983);
    a = ff(a, b, c, d, words[i + 8] || 0, 7, 1770035416);
    d = ff(d, a, b, c, words[i + 9] || 0, 12, -1958414417);
    c = ff(c, d, a, b, words[i + 10] || 0, 17, -42063);
    b = ff(b, c, d, a, words[i + 11] || 0, 22, -1990404162);
    a = ff(a, b, c, d, words[i + 12] || 0, 7, 1804603682);
    d = ff(d, a, b, c, words[i + 13] || 0, 12, -40341101);
    c = ff(c, d, a, b, words[i + 14] || 0, 17, -1502002290);
    b = ff(b, c, d, a, words[i + 15] || 0, 22, 1236535329);

    a = gg(a, b, c, d, words[i + 1] || 0, 5, -165796510);
    d = gg(d, a, b, c, words[i + 6] || 0, 9, -1069501632);
    c = gg(c, d, a, b, words[i + 11] || 0, 14, 643717713);
    b = gg(b, c, d, a, words[i + 0] || 0, 20, -373897302);
    a = gg(a, b, c, d, words[i + 5] || 0, 5, -701558691);
    d = gg(d, a, b, c, words[i + 10] || 0, 9, 38016083);
    c = gg(c, d, a, b, words[i + 15] || 0, 14, -660478335);
    b = gg(b, c, d, a, words[i + 4] || 0, 20, -405537848);
    a = gg(a, b, c, d, words[i + 9] || 0, 5, 568446438);
    d = gg(d, a, b, c, words[i + 14] || 0, 9, -1019803690);
    c = gg(c, d, a, b, words[i + 3] || 0, 14, -187363961);
    b = gg(b, c, d, a, words[i + 8] || 0, 20, 1163531501);
    a = gg(a, b, c, d, words[i + 13] || 0, 5, -1444681467);
    d = gg(d, a, b, c, words[i + 2] || 0, 9, -51403784);
    c = gg(c, d, a, b, words[i + 7] || 0, 14, 1735328473);
    b = gg(b, c, d, a, words[i + 12] || 0, 20, -1926607734);

    a = hh(a, b, c, d, words[i + 5] || 0, 4, -378558);
    d = hh(d, a, b, c, words[i + 8] || 0, 11, -2022574463);
    c = hh(c, d, a, b, words[i + 11] || 0, 16, 1839030562);
    b = hh(b, c, d, a, words[i + 14] || 0, 23, -35309556);
    a = hh(a, b, c, d, words[i + 1] || 0, 4, -1530992060);
    d = hh(d, a, b, c, words[i + 4] || 0, 11, 1272893353);
    c = hh(c, d, a, b, words[i + 7] || 0, 16, -155497632);
    b = hh(b, c, d, a, words[i + 10] || 0, 23, -1094730640);
    a = hh(a, b, c, d, words[i + 13] || 0, 4, 681279174);
    d = hh(d, a, b, c, words[i + 0] || 0, 11, -358537222);
    c = hh(c, d, a, b, words[i + 3] || 0, 16, -722521979);
    b = hh(b, c, d, a, words[i + 6] || 0, 23, 76029189);
    a = hh(a, b, c, d, words[i + 9] || 0, 4, -640364487);
    d = hh(d, a, b, c, words[i + 12] || 0, 11, -421815835);
    c = hh(c, d, a, b, words[i + 15] || 0, 16, 530742520);
    b = hh(b, c, d, a, words[i + 2] || 0, 23, -995338651);

    a = ii(a, b, c, d, words[i + 0] || 0, 6, -198630844);
    d = ii(d, a, b, c, words[i + 7] || 0, 10, 1126891415);
    c = ii(c, d, a, b, words[i + 14] || 0, 15, -1416354905);
    b = ii(b, c, d, a, words[i + 5] || 0, 21, -57434055);
    a = ii(a, b, c, d, words[i + 12] || 0, 6, 1700485571);
    d = ii(d, a, b, c, words[i + 3] || 0, 10, -1894986606);
    c = ii(c, d, a, b, words[i + 10] || 0, 15, -1051523);
    b = ii(b, c, d, a, words[i + 1] || 0, 21, -2054922799);
    a = ii(a, b, c, d, words[i + 8] || 0, 6, 1873313359);
    d = ii(d, a, b, c, words[i + 15] || 0, 10, -30611744);
    c = ii(c, d, a, b, words[i + 6] || 0, 15, -1560198380);
    b = ii(b, c, d, a, words[i + 13] || 0, 21, 1309151649);
    a = ii(a, b, c, d, words[i + 4] || 0, 6, -145523070);
    d = ii(d, a, b, c, words[i + 11] || 0, 10, -1120210379);
    c = ii(c, d, a, b, words[i + 2] || 0, 15, 718787259);
    b = ii(b, c, d, a, words[i + 9] || 0, 21, -343485551);

    a = (a + olda) | 0;
    b = (b + oldb) | 0;
    c = (c + oldc) | 0;
    d = (d + oldd) | 0;
  }

  let out = "";
  for (const v of [a, b, c, d]) {
    for (let j = 0; j < 4; j++) {
      out += ((v >>> (j * 8)) & 0xff).toString(16).padStart(2, "0");
    }
  }
  return out;
}

export function isPlaceholderTile(buffer: ArrayBuffer): boolean {
  const byteLen = buffer.byteLength;
  if (byteLen === 2521 || byteLen === 1033 || byteLen === 2419 || byteLen === 2568 || byteLen === 2816) {
    return true;
  }
  if (byteLen <= 3500) {
    const hash = computeMd5(buffer);
    if (KNOWN_PLACEHOLDER_MD5.has(hash)) return true;
    const text = new TextDecoder("latin1").decode(new Uint8Array(buffer, 0, Math.min(byteLen, 1024)));
    if (text.includes("not yet available") || text.includes("Map data not yet")) return true;
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

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(256, 256)
      : document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context failed");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(ancestorBitmap, subX, subY, subW, subH, 0, 0, 256, 256);

  if ("convertToBlob" in canvas) {
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

  // 优先尝试寻找最近的有效祖先：对于高放大区域（如 z=17/18），直接定位覆盖完备的 z=15 或 z=16
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
 * 安装智能瓦片提供器
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

      // (B) 若为 200 但尺寸极小 (<= 3500 字节)，检验是否为带有“Map data not yet available”的占位图
      let rawBuf: ArrayBuffer | null = null;
      if (res.status === 200) {
        rawBuf = await res.arrayBuffer();
        if (!isPlaceholderTile(rawBuf)) {
          // 真实的小图（如某些特定单色地貌），返回包装 Response
          return new Response(rawBuf, {
            status: 200,
            statusText: "OK",
            headers: res.headers,
          });
        }
        // 是占位图，继续向下执行合成逻辑
      }

      // (C) 走到这里说明是 404 或拦截到了占位图，立即启动祖先快速重采样
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
      // 遇到中止直接抛出，让 3D 引擎正常清理
      if ((err instanceof DOMException && err.name === "AbortError") || signal?.aborted) {
        throw err instanceof DOMException ? err : new DOMException("The user aborted a request.", "AbortError");
      }
      throw err;
    }
  };

  console.info("✨ [EarthWonders] 轻量高效的卫星瓦片无缝回退层已就绪。");
}
