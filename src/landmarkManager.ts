import * as THREE from "three";
import type tellux from "tellux";
import { loadLandmarkBuilder } from "./landmarks";
import type { SurfaceKit } from "./surfaces";
import { WONDERS, type Wonder } from "./wonders";

export class LandmarkManager {
  private viewer: InstanceType<typeof tellux.Viewer>;
  private surfaceKit: SurfaceKit;
  public landmarksRoot: THREE.Group;
  public landmarkGroups: Map<string, THREE.Group> = new Map();
  private loadingLandmarks: Map<string, Promise<THREE.Group | undefined>> = new Map();
  private proximityRefPos: THREE.Vector3 | null = null;
  private _tempWorldPos = new THREE.Vector3();

  constructor(viewer: InstanceType<typeof tellux.Viewer>, surfaceKit: SurfaceKit) {
    this.viewer = viewer;
    this.surfaceKit = surfaceKit;

    const root = new THREE.Group();
    root.name = "earth-wonders-landmarks";
    viewer.scene.raw.add(root);
    this.landmarksRoot = root;
  }

  public async loadLandmark(wonder: Wonder): Promise<THREE.Group | undefined> {
    const existing = this.landmarkGroups.get(wonder.id);
    if (existing) return existing;

    const inFlight = this.loadingLandmarks.get(wonder.id);
    if (inFlight) return inFlight;

    const promise = (async () => {
      try {
        const build = await loadLandmarkBuilder(wonder.id);
        if (!build || !this.landmarksRoot) return undefined;
        const group = build(this.surfaceKit);
        group.name = wonder.id;
        group.userData.wonderId = wonder.id;
        group.matrixAutoUpdate = false;
        this.viewer.cartographicToMatrix4(
          [wonder.longitude, wonder.latitude, wonder.modelHeight ?? 0],
          { heading: wonder.modelHeading ?? 0 },
          group.matrix,
        );
        group.updateMatrixWorld(true);
        group.traverse((object) => {
          object.frustumCulled = false;
          object.raycast = () => {};
        });
        this.landmarksRoot.add(group);
        this.landmarkGroups.set(wonder.id, group);
        this.applyGroupProximity(group);
        return group;
      } catch (err) {
        console.error(`加载地标 ${wonder.nameZh} 失败:`, err);
        return undefined;
      } finally {
        this.loadingLandmarks.delete(wonder.id);
      }
    })();

    this.loadingLandmarks.set(wonder.id, promise);
    return promise;
  }

  public getLandmarkGroup(id: string): THREE.Group | undefined {
    return this.landmarkGroups.get(id);
  }

  /**
   * 基于当前聚焦地标更新场景中各模型的可见性：
   * 仅保留当前地标及其周边 50km 内的邻近建筑（例如巴黎埃菲尔与拉德芳斯），削减远端多余绘制调用
   */
  public updateProximityVisibility(referencePos: THREE.Vector3 | null, maxDistanceMeters = 50_000): void {
    this.proximityRefPos = referencePos ? referencePos.clone() : null;
    for (const [, group] of this.landmarkGroups) {
      this.applyGroupProximity(group, maxDistanceMeters);
    }
  }

  private applyGroupProximity(group: THREE.Group, maxDistanceMeters = 50_000): void {
    if (!this.proximityRefPos) {
      group.visible = true;
      return;
    }
    this._tempWorldPos.setFromMatrixPosition(group.matrix);
    group.visible = this._tempWorldPos.distanceTo(this.proximityRefPos) <= maxDistanceMeters;
  }

  public setWireframe(wonderId: string, enabled: boolean): void {
    const grp = this.landmarkGroups.get(wonderId);
    if (!grp) return;
    grp.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const m = (c as THREE.Mesh).material;
        if (Array.isArray(m)) {
          m.forEach((mat) => {
            if ("wireframe" in mat) (mat as THREE.MeshStandardMaterial).wireframe = enabled;
          });
        } else if (m && "wireframe" in m) {
          (m as THREE.MeshStandardMaterial).wireframe = enabled;
        }
      }
    });
  }

  public setNightMode(wonderId: string, enabled: boolean): void {
    const grp = this.landmarkGroups.get(wonderId);
    if (grp && typeof grp.userData?.setNightMode === "function") {
      grp.userData.setNightMode(enabled);
    }
  }

  public preloadBackground(): void {
    let idx = 0;
    const preloadNext = () => {
      if (idx >= WONDERS.length) return;
      const w = WONDERS[idx++];
      if (!this.landmarkGroups.has(w.id)) {
        void this.loadLandmark(w);
      }
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(preloadNext, { timeout: 3000 });
      } else {
        setTimeout(preloadNext, 1000);
      }
    };
    setTimeout(preloadNext, 2000);
  }

  public destroy(): void {
    for (const [, group] of this.landmarkGroups) {
      this.landmarksRoot.remove(group);
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    }
    this.landmarkGroups.clear();
    this.loadingLandmarks.clear();
    if (this.landmarksRoot.parent) {
      this.landmarksRoot.parent.remove(this.landmarksRoot);
    }
  }
}
