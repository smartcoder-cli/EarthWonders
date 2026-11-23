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
});
