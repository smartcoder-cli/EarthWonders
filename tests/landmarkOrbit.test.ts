import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { LandmarkOrbitManager } from "../src/landmarkOrbit";
import { WONDERS } from "../src/wonders";

function createMockViewer() {
  const camera = {
    raw: new THREE.PerspectiveCamera(50, 1.5, 0.1, 10000),
  };
  camera.raw.position.set(100, 50, 100);
  camera.raw.lookAt(0, 0, 0);

  const controls = {
    enabled: true,
    pivotPoint: new THREE.Vector3(0, 0, 0),
    pivotMesh: new THREE.Object3D(),
    rotationInertia: new THREE.Vector2(),
    dragInertia: new THREE.Vector3(),
    globeInertia: new THREE.Matrix4(),
    getUpDirection(pivot: THREE.Vector3, target: THREE.Vector3) {
      target.copy(pivot).normalize();
    },
  };

  return {
    camera,
    controls,
  } as any;
}

function createMockContainer() {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as any;
}

describe("LandmarkOrbitManager Unit Tests", () => {
  it("should initialize in inactive state and activate on wonder arrival", () => {
    const viewer = createMockViewer();
    const container = createMockContainer();
    const manager = new LandmarkOrbitManager({ viewer, container });

    expect(manager.isActive).toBe(false);

    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(0, 6378137, 0); // 北极地表

    manager.activate(wonder, pivot);
    expect(manager.isActive).toBe(true);
    expect(viewer.controls.enabled).toBe(false); // 暂时接管原生控制

    manager.deactivate();
    expect(manager.isActive).toBe(false);
    expect(viewer.controls.enabled).toBe(true); // 归还控制权
    manager.destroy();
  });

  it("should switch between golden, topdown, and eyelevel presets accurately", () => {
    const viewer = createMockViewer();
    const container = createMockContainer();
    const manager = new LandmarkOrbitManager({ viewer, container });

    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(6378137, 0, 0);

    manager.activate(wonder, pivot);

    // 切换至正顶俯瞰
    manager.setPreset("topdown");

    // 步进多次更新使得阻尼到达目标值
    for (let i = 0; i < 30; i++) {
      manager.update(0.05);
    }
    expect(manager.pitch).toBeLessThan(0); // 负仰角 (俯视)
    expect(Math.abs(manager.pitch - (-88))).toBeLessThan(1.0);

    // 切换至地面平视仰望
    manager.setPreset("eyelevel");
    for (let i = 0; i < 30; i++) {
      manager.update(0.05);
    }
    expect(Math.abs(manager.pitch - (-2))).toBeLessThan(1.0);

    manager.destroy();
  });

  it("should zoom and clamp distance within safe bounds without clipping underground", () => {
    const viewer = createMockViewer();
    const container = createMockContainer();
    const manager = new LandmarkOrbitManager({ viewer, container });

    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(0, 0, 6378137);

    manager.activate(wonder, pivot);
    const initialDist = manager.distance;

    // 放大拉近
    manager.zoomBy(-50);
    for (let i = 0; i < 30; i++) manager.update(0.05);
    expect(manager.distance).toBeLessThan(initialDist);

    // 极限制放缩防越界
    manager.zoomBy(-10000);
    for (let i = 0; i < 30; i++) manager.update(0.05);
    expect(manager.distance).toBeGreaterThanOrEqual(15); // 安全距离钳位

    manager.destroy();
  });

  it("should align north correctly when alignNorth is triggered", () => {
    const viewer = createMockViewer();
    const container = createMockContainer();
    const manager = new LandmarkOrbitManager({ viewer, container });

    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(0, 6378137, 0);

    manager.activate(wonder, pivot);
    manager.alignNorth();

    for (let i = 0; i < 40; i++) manager.update(0.05);
    const normH = ((manager.heading % 360) + 360) % 360;
    expect(normH < 1.0 || normH > 359.0).toBe(true);

    manager.destroy();
  });

  it("should orbit monotonically across 0°/360° north boundary without snapping backwards", () => {
    type Listener = (e: any) => void;
    const winListeners = new Map<string, Listener[]>();
    const elListeners = new Map<string, Listener[]>();
    const prevWindow = (globalThis as any).window;
    (globalThis as any).window = {
      addEventListener: (type: string, fn: Listener) => {
        const list = winListeners.get(type) ?? [];
        list.push(fn);
        winListeners.set(type, list);
      },
      removeEventListener: vi.fn(),
    };

    try {
      const viewer = createMockViewer();
      // Place camera slightly west of due South so camera-to-pivot azimuth is ~3.18° (East of North)
      viewer.camera.raw.position.set(10, 6378137 + 100, -180);
      const container = {
        addEventListener: (type: string, fn: Listener) => {
          const list = elListeners.get(type) ?? [];
          list.push(fn);
          elListeners.set(type, list);
        },
        removeEventListener: vi.fn(),
      } as any;

      const manager = new LandmarkOrbitManager({ viewer, container });
      const taj = WONDERS.find((w) => w.id === "taj") ?? WONDERS[0];
      const pivot = new THREE.Vector3(0, 6378137, 0);
      manager.activate(taj, pivot);

      const startHeading = manager.heading;
      expect(startHeading).toBeGreaterThan(0);
      expect(startHeading).toBeLessThan(20);

      // Drag right across 0° -> ~335° without rebounding via 180°
      const downHandlers = elListeners.get("pointerdown") ?? [];
      const moveHandlers = winListeners.get("pointermove") ?? [];
      const upHandlers = winListeners.get("pointerup") ?? [];
      const targetMock = { closest: () => null };
      downHandlers.forEach((fn) => fn({ pointerId: 1, button: 0, clientX: 200, clientY: 200, target: targetMock }));

      const samples: number[] = [];
      for (let step = 1; step <= 8; step++) {
        moveHandlers.forEach((fn) =>
          fn({ pointerId: 1, pointerType: "mouse", buttons: 1, clientX: 200 + step * 10, clientY: 200 }),
        );
        manager.update(0.016);
        samples.push(manager.heading);
      }
      upHandlers.forEach((fn) => fn({ pointerId: 1 }));

      for (let i = 0; i < 30; i++) {
        manager.update(0.03);
        samples.push(manager.heading);
      }

      // Heading must cross 0° -> 359°..320° monotonically, never jumping into (30, 320)
      for (const h of samples) {
        expect(h < 30 || h > 320).toBe(true);
      }
      expect(samples[samples.length - 1]).toBeGreaterThan(320);

      // Drag back left across 360° -> ~10° without snapping backwards
      downHandlers.forEach((fn) => fn({ pointerId: 2, button: 0, clientX: 300, clientY: 200, target: targetMock }));
      const reverseSamples: number[] = [];
      for (let step = 1; step <= 10; step++) {
        moveHandlers.forEach((fn) =>
          fn({ pointerId: 2, pointerType: "mouse", buttons: 1, clientX: 300 - step * 10, clientY: 200 }),
        );
        manager.update(0.016);
        reverseSamples.push(manager.heading);
      }
      upHandlers.forEach((fn) => fn({ pointerId: 2 }));
      for (let i = 0; i < 30; i++) {
        manager.update(0.03);
        reverseSamples.push(manager.heading);
      }
      for (const h of reverseSamples) {
        expect(h < 35 || h > 320).toBe(true);
      }
      expect(reverseSamples[reverseSamples.length - 1]).toBeLessThan(35);

      // Switching back to golden preset (heading 0°) must take the short path across 0°, not via 180°
      manager.setPreset("golden");
      for (let i = 0; i < 15; i++) {
        manager.update(0.03);
        const h = manager.heading;
        expect(h < 35 || h > 320).toBe(true);
      }

      manager.destroy();
    } finally {
      (globalThis as any).window = prevWindow;
    }
  });
});
