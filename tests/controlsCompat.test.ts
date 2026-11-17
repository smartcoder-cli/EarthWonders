import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  keepCameraTuned,
  resetControlsInertia,
  setControlsEnabled,
  suppressBlackscreenEffects,
  updateControlsPivot,
} from "../src/controlsCompat";

describe("Controls Compatibility & Robustness Suite", () => {
  it("safely handles null and undefined viewers without throwing", () => {
    expect(() => resetControlsInertia(null)).not.toThrow();
    expect(() => resetControlsInertia(undefined)).not.toThrow();
    expect(() => updateControlsPivot(null, new THREE.Vector3())).not.toThrow();
    expect(() => setControlsEnabled(null, true)).not.toThrow();
    expect(() => keepCameraTuned(null)).not.toThrow();
    expect(() => suppressBlackscreenEffects(null)).not.toThrow();
  });

  it("resets inertia properties on mocked raw controls", () => {
    const mockRotationInertia = new THREE.Vector2(10, 20);
    const mockDragInertia = new THREE.Vector3(1, 2, 3);
    const mockGlobeInertia = new THREE.Matrix4().makeTranslation(1, 2, 3);
    const resetStateSpy = vi.fn();

    const mockViewer = {
      controls: {
        raw: {
          rotationInertia: mockRotationInertia,
          dragInertia: mockDragInertia,
          globeInertia: mockGlobeInertia,
          globeInertiaFactor: 0.8,
          zoomDelta: 5,
          needsUpdate: true,
          actionHeightOffset: 12,
          resetState: resetStateSpy,
        },
      },
    } as any;

    resetControlsInertia(mockViewer);

    expect(mockRotationInertia.x).toBe(0);
    expect(mockRotationInertia.y).toBe(0);
    expect(mockDragInertia.length()).toBe(0);
    expect(mockViewer.controls.raw.globeInertiaFactor).toBe(0);
    expect(mockViewer.controls.raw.zoomDelta).toBe(0);
    expect(mockViewer.controls.raw.needsUpdate).toBe(false);
    expect(mockViewer.controls.raw.actionHeightOffset).toBe(0);
    expect(resetStateSpy).toHaveBeenCalled();
  });

  it("updates controls pivotPoint and pivotMesh position", () => {
    const pivotPoint = new THREE.Vector3();
    const pivotMesh = new THREE.Mesh();
    const mockViewer = {
      controls: {
        raw: {
          pivotPoint,
          pivotMesh,
        },
      },
    } as any;

    const targetPos = new THREE.Vector3(100, 200, 300);
    updateControlsPivot(mockViewer, targetPos);

    expect(pivotPoint.x).toBe(100);
    expect(pivotPoint.y).toBe(200);
    expect(pivotPoint.z).toBe(300);
    expect(pivotMesh.position.x).toBe(100);
    expect(pivotMesh.position.y).toBe(200);
    expect(pivotMesh.position.z).toBe(300);
  });
});
