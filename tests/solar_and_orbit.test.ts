import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { DroneOrbitController, SolarController, SOLAR_PRESET_HOURS } from "../src/solarAndOrbit";
import { WONDERS } from "../src/wonders";

// Mock minimal tellux viewer
function createMockViewer() {
  const camera = {
    raw: new THREE.PerspectiveCamera(50, 1.5, 0.1, 10000),
  };
  camera.raw.position.set(100, 50, 100);
  camera.raw.lookAt(0, 0, 0);

  const clock = {
    currentTime: new Date("2026-06-21T12:00:00Z"),
    multiplier: 1,
    shouldAnimate: false,
    handlers: new Map<string, Array<() => void>>(),
    on(event: string, fn: () => void) {
      if (!this.handlers.has(event)) this.handlers.set(event, []);
      this.handlers.get(event)!.push(fn);
    },
    emit(event: string) {
      this.handlers.get(event)?.forEach((fn) => fn());
    },
  };

  const domElement = {
    listeners: new Map<string, Array<() => void>>(),
    addEventListener(event: string, fn: () => void) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event)!.push(fn);
    },
    emit(event: string) {
      this.listeners.get(event)?.forEach((fn) => fn());
    },
  };

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

  const tilesetManager = {
    surfaceTileset: {
      errorTarget: 1.0,
      maxTilesProcessed: 250,
      downloadQueue: {
        maxJobs: 25,
        items: [],
        currJobs: 0,
        priorityCallback: null,
      },
      lruCache: {
        minSize: 6000,
        maxSize: 8000,
      },
    },
  };

  return {
    camera,
    clock,
    domElement,
    controls,
    tilesetManager,
  } as any;
}

describe("SolarController Unit Tests", () => {
  it("should initialize with default noon preset", () => {
    const viewer = createMockViewer();
    const timeChanged = vi.fn();
    const sc = new SolarController(viewer, timeChanged);

    expect(sc.isPlaying).toBe(false);
    expect(sc.isLive).toBe(false);
  });

  it("should switch correctly between dawn, noon, golden, and night presets", () => {
    const viewer = createMockViewer();
    const timeChanged = vi.fn();
    const sc = new SolarController(viewer, timeChanged);
    const giza = WONDERS[0];
    sc.setWonder(giza);

    sc.setPreset("dawn");
    expect(timeChanged).toHaveBeenCalledWith(SOLAR_PRESET_HOURS.dawn, false);

    sc.setPreset("golden");
    expect(timeChanged).toHaveBeenCalledWith(SOLAR_PRESET_HOURS.golden, false);

    sc.setPreset("night");
    expect(timeChanged).toHaveBeenCalledWith(SOLAR_PRESET_HOURS.night, false);
  });

  it("should toggle timelapse mode and adjust clock multipliers", () => {
    const viewer = createMockViewer();
    const sc = new SolarController(viewer);

    const playing = sc.toggleTimelapse();
    expect(playing).toBe(true);
    expect(viewer.clock.multiplier).toBe(1800);
    expect(viewer.clock.shouldAnimate).toBe(true);

    const paused = sc.toggleTimelapse();
    expect(paused).toBe(false);
    expect(viewer.clock.shouldAnimate).toBe(false);
  });
});

describe("DroneOrbitController Unit Tests", () => {
  it("should toggle and start/stop orbiting with state callbacks", () => {
    const viewer = createMockViewer();
    const stateChange = vi.fn();
    const orbit = new DroneOrbitController(viewer, stateChange);

    expect(orbit.isOrbiting).toBe(false);

    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(10, 20, 30);

    orbit.start(wonder, pivot);
    expect(orbit.isOrbiting).toBe(true);
    expect(stateChange).toHaveBeenCalledWith(true);
    expect(viewer.controls.pivotPoint.x).toBe(10);

    orbit.stop();
    expect(orbit.isOrbiting).toBe(false);
    expect(stateChange).toHaveBeenCalledWith(false);
  });

  it("should smoothly rotate camera world matrix around local normal during update", () => {
    const viewer = createMockViewer();
    const orbit = new DroneOrbitController(viewer);
    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(0, 6378137, 0); // 地球北极附近地表

    orbit.start(wonder, pivot);

    const initialPos = viewer.camera.raw.position.clone();
    const initialQuat = viewer.camera.raw.quaternion.clone();

    // 模拟 1.0 秒更新
    orbit.update(1.0);

    const nextPos = viewer.camera.raw.position;
    const nextQuat = viewer.camera.raw.quaternion;

    // 验证位置和旋转发生了有效且有限的旋转位移，未出现 NaN 或 Infinity
    expect(Number.isFinite(nextPos.x)).toBe(true);
    expect(Number.isFinite(nextPos.y)).toBe(true);
    expect(Number.isFinite(nextPos.z)).toBe(true);

    expect(nextPos.distanceTo(initialPos)).toBeGreaterThan(0.1);
    expect(nextQuat.angleTo(initialQuat)).toBeGreaterThan(0.001);
  });

  it("should gracefully stop orbiting when user interacts with canvas", () => {
    const viewer = createMockViewer();
    const stateChange = vi.fn();
    const orbit = new DroneOrbitController(viewer, stateChange);
    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(0, 0, 0);

    orbit.start(wonder, pivot);
    expect(orbit.isOrbiting).toBe(true);

    // 模拟用户在画布上按下指针
    viewer.domElement.emit("pointerdown");
    expect(orbit.isOrbiting).toBe(false);
    expect(stateChange).toHaveBeenCalledWith(false);

    // 再次开启并测试滚轮打断
    orbit.start(wonder, pivot);
    expect(orbit.isOrbiting).toBe(true);
    viewer.domElement.emit("wheel");
    expect(orbit.isOrbiting).toBe(false);
  });

  it("should adaptively switch tileset errorTarget, maxTilesProcessed and download queue on orbit start/stop", () => {
    const viewer = createMockViewer();
    const orbit = new DroneOrbitController(viewer);
    const wonder = WONDERS[0];
    const pivot = new THREE.Vector3(0, 0, 0);

    const tileset = viewer.tilesetManager.surfaceTileset;
    expect(tileset.errorTarget).toBe(1.0);
    expect(tileset.maxTilesProcessed).toBe(250);
    expect(tileset.downloadQueue.maxJobs).toBe(25);

    // 开启航拍：适度放宽 errorTarget 同时保留足够遍历深度与下载并发，防止背后远景瓦片饿死
    orbit.start(wonder, pivot);
    expect(tileset.errorTarget).toBe(5.5);
    expect(tileset.maxTilesProcessed).toBe(240);
    expect(tileset.downloadQueue.maxJobs).toBe(12);
    expect(tileset.lruCache.maxSize).toBe(15000);

    // 退出航拍：恢复极清与初始并发
    orbit.stop();
    expect(tileset.errorTarget).toBe(1.0);
    expect(tileset.maxTilesProcessed).toBe(250);
    expect(tileset.downloadQueue.maxJobs).toBe(25);
  });
});
