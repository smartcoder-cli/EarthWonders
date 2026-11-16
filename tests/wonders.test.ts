import { describe, expect, it } from "vitest";
import { CATEGORIES, WONDERS } from "../src/wonders";

describe("Wonders Metadata Verification", () => {
  it("should have exactly 23 global landmarks", () => {
    expect(WONDERS).toHaveLength(23);
  });

  it("should have unique IDs and consecutive 1-based indices", () => {
    const ids = new Set<string>();
    const indices = new Set<number>();

    WONDERS.forEach((w, i) => {
      expect(ids.has(w.id)).toBe(false);
      ids.add(w.id);

      expect(w.index).toBe(i + 1);
      indices.add(w.index);
    });

    expect(ids.size).toBe(23);
    expect(indices.size).toBe(23);
  });

  it("should have valid latitude [-90, 90] and longitude [-180, 180]", () => {
    for (const w of WONDERS) {
      expect(w.latitude).toBeGreaterThanOrEqual(-90);
      expect(w.latitude).toBeLessThanOrEqual(90);
      expect(w.longitude).toBeGreaterThanOrEqual(-180);
      expect(w.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("should have valid category matching CATEGORIES definition", () => {
    const validCategoryIds = new Set(CATEGORIES.map((c) => c.id));
    for (const w of WONDERS) {
      expect(validCategoryIds.has(w.category)).toBe(true);
      expect(w.nameZh.length).toBeGreaterThan(0);
      expect(w.nameEn.length).toBeGreaterThan(0);
      expect(w.flyDistance).toBeGreaterThan(0);
    }
  });
});
