import type * as THREE from "three";
import type tellux from "tellux";
import type { TelluxRawControls } from "./types/global";

function getRawControls(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): TelluxRawControls | undefined {
  if (!viewer) return undefined;
  const ctrl = viewer.controls as unknown as { raw?: TelluxRawControls } & TelluxRawControls;
  return ctrl.raw ?? ctrl;
}

/**
 * 彻底重置相机控制器的累积旋转、拖拽和地球惯性，避免飞行交接时镜头被意外弹飞或甩失
 */
export function resetControlsInertia(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): void {
  const raw = getRawControls(viewer);
  if (!raw) return;
  try {
    raw.rotationInertia?.set(0, 0);
    raw.dragInertia?.set(0, 0, 0);
    raw.globeInertia?.identity();
    if (typeof raw.globeInertiaFactor === "number") raw.globeInertiaFactor = 0;
    if (typeof raw.zoomDelta === "number") raw.zoomDelta = 0;
    if (typeof raw.needsUpdate === "boolean") raw.needsUpdate = false;
    if (typeof raw.actionHeightOffset === "number") raw.actionHeightOffset = 0;
    raw.resetState?.();
  } catch (err) {
    console.debug("resetControlsInertia handled:", err);
  }
}

/**
 * 精确同步 GlobeControls 旋转轴心点到指定的三维世界坐标
 */
export function updateControlsPivot(
  viewer: InstanceType<typeof tellux.Viewer> | null | undefined,
  pivotPos: THREE.Vector3,
): void {
  const raw = getRawControls(viewer);
  if (!raw) return;
  try {
    if (raw.pivotPoint) {
      raw.pivotPoint.copy(pivotPos);
      raw.pivotMesh?.position.copy(pivotPos);
    }
  } catch (err) {
    console.debug("updateControlsPivot handled:", err);
  }
}

/**
 * 启用或禁用控制器并清除残留动量
 */
export function setControlsEnabled(
  viewer: InstanceType<typeof tellux.Viewer> | null | undefined,
  enabled: boolean,
): void {
  if (!viewer) return;
  if (!enabled) {
    resetControlsInertia(viewer);
  }
  viewer.controls.enabled = enabled;
}

/**
 * 动态调整相机近/远裁剪平面并屏蔽射线误触高度偏移
 */
export function keepCameraTuned(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): void {
  if (!viewer) return;
  const raw = getRawControls(viewer);
  if (!raw) return;
  try {
    raw.adjustHeight = false;
    if (typeof raw.adjustCamera === "function") {
      raw.adjustCamera(viewer.camera.raw);
    }
  } catch (err) {
    console.debug("keepCameraTuned handled:", err);
  }
}

/**
 * 屏蔽 ANGLE / Windows 平台下导致黑屏的多余后处理 Pass
 */
export function suppressBlackscreenEffects(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): void {
  if (!viewer) return;
  try {
    const rawRenderer = viewer.renderer.raw as unknown as { setEffects?: (effects: unknown[]) => void };
    if (typeof rawRenderer.setEffects === "function") {
      const orig = rawRenderer.setEffects.bind(rawRenderer);
      rawRenderer.setEffects = () => orig([]);
      orig([]);
    }
    const pp = (viewer as unknown as { postProcessing?: { activeEffects?: unknown[]; applyEffects?: () => void } }).postProcessing;
    if (pp) {
      pp.activeEffects = [];
      pp.applyEffects = () => {
        pp.activeEffects = [];
        rawRenderer.setEffects?.([]);
      };
    }
  } catch (err) {
    console.debug("suppressBlackscreenEffects handled:", err);
  }
}
