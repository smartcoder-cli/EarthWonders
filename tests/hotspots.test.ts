import { describe, expect, it } from "vitest";
import { LANDMARK_HOTSPOTS } from "../src/hotspots";
import { WONDERS } from "../src/wonders";

describe("Landmark Hotspots Integrity", () => {
  it("every wonder should have at least 3 defined hotspots with valid 3D positions", () => {
    for (const w of WONDERS) {
      const spots = LANDMARK_HOTSPOTS[w.id];
      expect(spots, `Wonder ${w.id} must have hotspots defined`).toBeDefined();
      expect(spots.length, `Wonder ${w.id} should have at least 3 hotspots`).toBeGreaterThanOrEqual(3);

      for (const spot of spots) {
        expect(spot.wonderId).toBe(w.id);
        expect(spot.nameZh.length).toBeGreaterThan(0);
        expect(spot.nameEn.length).toBeGreaterThan(0);
        expect(spot.summary.length).toBeGreaterThan(0);
        expect(spot.description.length).toBeGreaterThan(0);
        expect(spot.funFact.length).toBeGreaterThan(0);
        expect(spot.position).toHaveLength(3);
        expect(spot.position.every((val) => typeof val === "number" && !Number.isNaN(val))).toBe(true);
        expect(spot.focusDistance).toBeGreaterThan(0);
      }
    }
  });

  it("hotspot IDs should be unique across the whole system", () => {
    const allIds = new Set<string>();
    for (const [, list] of Object.entries(LANDMARK_HOTSPOTS)) {
      for (const spot of list) {
        expect(allIds.has(spot.id), `Duplicate hotspot id: ${spot.id}`).toBe(false);
        allIds.add(spot.id);
      }
    }
    expect(allIds.size).toBeGreaterThanOrEqual(72);
  });
});
