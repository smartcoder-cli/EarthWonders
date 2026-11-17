import { describe, expect, it } from "vitest";
import {
  parseTileUrl,
  makeTileUrl,
  isPlaceholderTile,
  fastHash32,
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

  it("isPlaceholderTile identifies exact placeholder sizes and text watermarks", () => {
    // 2521 is standard ArcGIS "Map data not yet available" placeholder
    const buf2521 = new Uint8Array(2521).buffer;
    expect(isPlaceholderTile(buf2521)).toBe(true);

    const buf1033 = new Uint8Array(1033).buffer;
    expect(isPlaceholderTile(buf1033)).toBe(true);

    // Normal sized image (e.g. 15,000 bytes) should not be treated as placeholder
    const normalBuf = new Uint8Array(15000).buffer;
    expect(isPlaceholderTile(normalBuf)).toBe(false);

    // Small buffer with placeholder watermark text
    const encoder = new TextEncoder();
    const watermarkedText = encoder.encode("GIF89a... Map data not yet available in this region");
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
});
