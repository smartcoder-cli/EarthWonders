import { describe, expect, it } from "vitest";
import { LANDMARK_LOADERS, loadLandmarkBuilder } from "../src/landmarks";
import { WONDERS } from "../src/wonders";

describe("Dynamic Landmark Loaders", () => {
  it("should have a loader entry for all 24 wonders", () => {
    for (const w of WONDERS) {
      expect(LANDMARK_LOADERS[w.id], `Missing loader for wonder: ${w.id}`).toBeDefined();
    }
  });

  it("should dynamically import and return a builder function for sample landmarks", async () => {
    // 抽取几个代表性建筑进行动态加载验证
    const testIds = ["giza", "hzmb", "eiffel", "sagrada", "defense", "futuremuseum", "himeji"];

    for (const id of testIds) {
      const builder = await loadLandmarkBuilder(id);
      expect(typeof builder, `Builder for ${id} should be a function`).toBe("function");
    }
  });
});
