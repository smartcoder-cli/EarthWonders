import type * as THREE from "three";
import type tellux from "tellux";

export interface TelluxRawControls {
  pivotPoint?: THREE.Vector3;
  pivotMesh?: THREE.Object3D;
  rotationInertia?: THREE.Vector2;
  dragInertia?: THREE.Vector3;
  globeInertia?: THREE.Matrix4;
  globeInertiaFactor?: number;
  zoomDelta?: number;
  needsUpdate?: boolean;
  actionHeightOffset?: number;
  adjustHeight?: boolean;
  rotationSpeed?: number;
  resetState?: () => void;
  adjustCamera?: (camera: THREE.Camera) => void;
  _applyRotation?: (x: number, y: number, pivotPoint: THREE.Vector3) => void;
  getUpDirection?: (point: THREE.Vector3, target: THREE.Vector3) => void;
}

export interface OptimizedTileset {
  errorTarget?: number;
  downloadQueue?: {
    items: unknown[];
    currJobs: number;
    priorityCallback: ((a: unknown, b: unknown) => number) | null;
  };
}

declare global {
  interface Window {
    __viewer?: InstanceType<typeof tellux.Viewer>;
    THREE?: typeof THREE;
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  }
}
