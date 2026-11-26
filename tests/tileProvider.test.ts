import { describe, expect, it } from "vitest";
import {
  buildFallbackLevels,
  createTileFetchHandler,
  fastHash32,
  isNonImageContentType,
  isPlaceholderTile,
  makeTileUrl,
  parseTileUrl,
  shouldRetryTileStatus,
} from "../src/tileProvider";

describe("Tile Provider Utility Functions", () => {
  it("parseTileUrl parses standard XYZ tile URL correctly", () => {
    const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/12345/6789?token=abc";
    const parsed = parseTileUrl(url);

    expect(parsed).not.toBeNull();
    expect(parsed?.baseUrl).toBe("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/");
    expect(parsed?.z).toBe(15);
    expect(parsed?.y).toBe(12345);
    expect(parsed?.x).toBe(6789);
    expect(parsed?.search).toBe("?token=abc");
  });

  it("parseTileUrl returns null for non-tile URLs", () => {
    expect(parseTileUrl("https://example.com/api/status")).toBeNull();
    expect(parseTileUrl("/photos/giza.jpg")).toBeNull();
  });

  it("makeTileUrl reconstructs tile URLs with query params", () => {
    const url = makeTileUrl("https://tiles.example.com/tile/", 12, 34, 56, "?v=2");
    expect(url).toBe("https://tiles.example.com/tile/12/34/56?v=2");
  });

  it("isPlaceholderTile identifies exact placeholder sizes, empty buffers, and text watermarks", () => {
    expect(isPlaceholderTile(new ArrayBuffer(0))).toBe(true);
    expect(isPlaceholderTile(new Uint8Array(2521).buffer)).toBe(true);
    expect(isPlaceholderTile(new Uint8Array(1033).buffer)).toBe(true);

    const normalBuf = new Uint8Array(15000).buffer;
    expect(isPlaceholderTile(normalBuf)).toBe(false);

    const watermarkedText = new TextEncoder().encode("GIF89a... Map data not yet available in this region");
    expect(isPlaceholderTile(watermarkedText.buffer)).toBe(true);
  });

  it("fastHash32 produces consistent positive integers for given buffers", () => {
    const data1 = new TextEncoder().encode("tile-coordinate-z15-x123-y456");
    const h1 = fastHash32(data1.buffer);
    const h2 = fastHash32(data1.buffer);

    expect(h1).toBe(h2);
    expect(h1).toBeGreaterThanOrEqual(0);

    const data2 = new TextEncoder().encode("different-content");
    expect(fastHash32(data2.buffer)).not.toBe(h1);
  });

  it("buildFallbackLevels covers low-zoom horizon levels (z <= 10) as well as high-zoom levels", () => {
    expect(buildFallbackLevels(19)).toEqual([16, 15, 14, 12]);
    expect(buildFallbackLevels(13)).toEqual([12, 11, 10, 8]);
    expect(buildFallbackLevels(10)).toEqual([9, 8, 7, 5]);
    expect(buildFallbackLevels(4)).toEqual([3, 2, 1]);
    expect(buildFallbackLevels(1)).toEqual([0]);
    expect(buildFallbackLevels(0)).toEqual([]);
  });

  it("identifies non-image MIME types and retryable HTTP status codes", () => {
    expect(isNonImageContentType("text/html; charset=utf-8")).toBe(true);
    expect(isNonImageContentType("application/json")).toBe(true);
    expect(isNonImageContentType("image/jpeg")).toBe(false);

    expect(shouldRetryTileStatus(429)).toBe(true);
    expect(shouldRetryTileStatus(503)).toBe(true);
    expect(shouldRetryTileStatus(408)).toBe(true);
    expect(shouldRetryTileStatus(404)).toBe(false);
    expect(shouldRetryTileStatus(200)).toBe(false);
  });
});

describe("createTileFetchHandler", () => {
  it("retries transient 503/network failures once and recovers when retry succeeds", async () => {
    let calls = 0;
    const validTile = new Uint8Array(6000).fill(7);
    const mockFetch: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("upstream error", { status: 503 });
      }
      return new Response(validTile, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": String(validTile.byteLength),
        },
      });
    };

    const handler = createTileFetchHandler(mockFetch, {
      timeoutMs: 200,
      retryCount: 1,
      retryDelayMs: 5,
    });

    const res = await handler("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/9/200/410");
    expect(calls).toBe(2);
    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBe(6000);
  });

  it("aborts stalled fetches after timeoutMs and falls back to ancestor resampling even at z <= 10", async () => {
    const requestedUrls: string[] = [];
    const mockFetch: typeof fetch = (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      requestedUrls.push(url);
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    };

    const fakeFallback = new Uint8Array([1, 2, 3, 4]).buffer;
    const handler = createTileFetchHandler(mockFetch, {
      timeoutMs: 25,
      retryCount: 1,
      retryDelayMs: 5,
      resampleTile: async (coords) => {
        expect(coords.z).toBe(8);
        return fakeFallback;
      },
    });

    const res = await handler("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/8/100/200");
    expect(requestedUrls.length).toBe(2);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Earth-Wonders-Fallback")).toBe("resampled");
    expect((await res.arrayBuffer()).byteLength).toBe(4);
  });

  it("intercepts HTTP 200 JSON error payloads and triggers fallback", async () => {
    let calls = 0;
    const mockFetch: typeof fetch = async () => {
      calls += 1;
      return new Response('{"error":{"code":400,"message":"Invalid tile"}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const handler = createTileFetchHandler(mockFetch, {
      timeoutMs: 100,
      retryCount: 1,
      retryDelayMs: 5,
      resampleTile: async () => new Uint8Array(128).buffer,
    });

    const res = await handler("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/10/20");
    expect(calls).toBe(1);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Earth-Wonders-Fallback")).toBe("resampled");
  });

  it("propagates caller AbortError immediately without retrying or falling back", async () => {
    const controller = new AbortController();
    let calls = 0;
    let fallbackCalled = false;

    const mockFetch: typeof fetch = async () => {
      calls += 1;
      controller.abort();
      throw new DOMException("caller cancelled", "AbortError");
    };

    const handler = createTileFetchHandler(mockFetch, {
      timeoutMs: 200,
      retryCount: 2,
      retryDelayMs: 5,
      resampleTile: async () => {
        fallbackCalled = true;
        return new Uint8Array(16).buffer;
      },
    });

    await expect(
      handler("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/10/20", {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toBe(1);
    expect(fallbackCalled).toBe(false);
  });
});
