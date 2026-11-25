import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LandmarkManager } from "../src/landmarkManager";

describe("LandmarkManager Proximity Visibility", () => {
  it("keeps active and neighboring landmarks (<50km) visible while hiding distant ones", () => {
    const scene = new THREE.Scene();
    const mockViewer = {
      scene: { raw: scene },
      cartographicToMatrix4: () => {},
    } as any;
    const manager = new LandmarkManager(mockViewer, {} as any);

    const eiffel = new THREE.Group();
    eiffel.matrix.makeTranslation(0, 0, 0);
    const defense = new THREE.Group();
    defense.matrix.makeTranslation(8_000, 0, 0); // 8km away (same metro area)
    const giza = new THREE.Group();
    giza.matrix.makeTranslation(3_000_000, 0, 0); // 3,000km away

    manager.landmarkGroups.set("eiffel", eiffel);
    manager.landmarkGroups.set("defense", defense);
    manager.landmarkGroups.set("giza", giza);

    manager.updateProximityVisibility(new THREE.Vector3(0, 0, 0));
    expect(eiffel.visible).toBe(true);
    expect(defense.visible).toBe(true);
    expect(giza.visible).toBe(false);

    // Space view restores all visibility
    manager.updateProximityVisibility(null);
    expect(eiffel.visible).toBe(true);
    expect(defense.visible).toBe(true);
    expect(giza.visible).toBe(true);

    manager.destroy();
  });
});
