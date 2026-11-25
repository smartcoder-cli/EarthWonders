import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { AtmosphereManager } from "../src/atmosphereEffects";
import { WONDERS } from "../src/wonders";

function installMockCanvas() {
  const prevDoc = globalThis.document;
  const mockGrad = { addColorStop: vi.fn() };
  const mockCtx = {
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => mockGrad),
    createRadialGradient: vi.fn(() => mockGrad),
    fillRect: vi.fn(),
    fillStyle: "",
  };
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => mockCtx }),
  } as any;
  return () => {
    globalThis.document = prevDoc;
  };
}

describe("AtmosphereManager Lifecycle & Animation", () => {
  it("disposes geometries, materials, and textures on cleanup and keeps aurora oscillating around baseY", () => {
    const restoreDoc = installMockCanvas();
    try {
      const svalbard = WONDERS.find((w) => w.id === "svalbard")!;
      const group = new THREE.Group();
      const manager = new AtmosphereManager();

      manager.setWonder(svalbard, group);
      expect(group.children.length).toBeGreaterThan(0);

      // Spy on unique resource disposal
      const seen = new Set<object>();
      const disposeSpies: ReturnType<typeof vi.spyOn>[] = [];
      const addSpy = (target: any) => {
        if (target && typeof target.dispose === "function" && !seen.has(target)) {
          seen.add(target);
          disposeSpies.push(vi.spyOn(target, "dispose"));
        }
      };
      group.traverse((obj) => {
        const anyObj = obj as any;
        addSpy(anyObj.geometry);
        addSpy(anyObj.material);
        addSpy(anyObj.material?.map);
        addSpy(anyObj);
      });

      const auroraMesh = group.children.find((c) => typeof c.userData.baseY === "number") as THREE.Mesh;
      expect(auroraMesh).toBeDefined();
      const baseY = auroraMesh.userData.baseY as number;

      // Advance many frames — position must stay bounded around baseY (no drift)
      for (let i = 0; i < 200; i++) {
        manager.update(0.05);
      }
      expect(Math.abs(auroraMesh.position.y - baseY)).toBeLessThanOrEqual(1.41);

      manager.dispose();
      expect(group.children.length).toBe(0);
      expect(disposeSpies.length).toBeGreaterThan(0);
      for (const spy of disposeSpies) {
        expect(spy).toHaveBeenCalledTimes(1);
      }
    } finally {
      restoreDoc();
    }
  });
});
