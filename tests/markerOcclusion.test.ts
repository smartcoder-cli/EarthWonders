import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  initLandmarkMarkers,
  updateMarkerOcclusion,
  type LandmarkMarkerInfo,
} from "../src/markerOcclusion";
import { WONDERS } from "../src/wonders";

describe("markerOcclusion - Backface Culling & Screen Collision", () => {
  it("should initialize markers with valid positions and normals", () => {
    const mockViewer = {
      cartographicToMatrix4: vi.fn((pos, _opts, mat: THREE.Matrix4) => {
        // Simple sphere mapping for test
        const [lon, lat] = pos;
        const phi = (lat * Math.PI) / 180;
        const theta = (lon * Math.PI) / 180;
        const r = 6378137;
        mat.makeTranslation(
          r * Math.cos(phi) * Math.sin(theta),
          r * Math.sin(phi),
          r * Math.cos(phi) * Math.cos(theta),
        );
      }),
    } as any;

    const list = initLandmarkMarkers(mockViewer, WONDERS.slice(0, 5));
    expect(list.length).toBe(5);
    for (const m of list) {
      expect(m.position.length()).toBeGreaterThan(6000000);
      expect(Math.abs(m.normal.length() - 1.0)).toBeLessThan(0.001);
    }
  });

  it("should cull backface markers when facing away from camera", () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 50000000);
    // Camera looking down +Z towards origin (Earth center)
    camera.position.set(0, 0, 20000000);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    // Front-facing marker (at +Z)
    const frontMarker: LandmarkMarkerInfo = {
      id: "front",
      index: 1,
      category: "ancient",
      nameZh: "正面地标",
      position: new THREE.Vector3(0, 0, 6378137),
      normal: new THREE.Vector3(0, 0, 1),
    };

    // Back-facing marker (at -Z, on opposite side of Earth)
    const backMarker: LandmarkMarkerInfo = {
      id: "back",
      index: 2,
      category: "ancient",
      nameZh: "背面地标",
      position: new THREE.Vector3(0, 0, -6378137),
      normal: new THREE.Vector3(0, 0, -1),
    };

    const visibilityMap = new Map<string, boolean>();
    updateMarkerOcclusion({
      camera,
      canvasWidth: 1440,
      canvasHeight: 900,
      markers: [frontMarker, backMarker],
      selectedId: null,
      activeCategory: "all",
      setEntityVisibility: (id, visible) => visibilityMap.set(id, visible),
    });

    expect(visibilityMap.get("front")).toBe(true);
    expect(visibilityMap.get("back")).toBe(false);
  });

  it("should cull overlapping markers in space view and preserve selected", () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 50000000);
    camera.position.set(0, 0, 20000000); // Space view (> 9500km)
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    // Two landmarks very close together in space (e.g. Paris Eiffel + Defense)
    const marker1: LandmarkMarkerInfo = {
      id: "paris1",
      index: 19,
      category: "skyline",
      nameZh: "拉德芳斯",
      position: new THREE.Vector3(100, 100, 6378137),
      normal: new THREE.Vector3(0, 0, 1),
    };
    const marker2: LandmarkMarkerInfo = {
      id: "paris2",
      index: 20,
      category: "skyline",
      nameZh: "埃菲尔铁塔",
      position: new THREE.Vector3(120, 110, 6378137),
      normal: new THREE.Vector3(0, 0, 1),
    };

    const visibilityMap = new Map<string, boolean>();
    updateMarkerOcclusion({
      camera,
      canvasWidth: 1440,
      canvasHeight: 900,
      markers: [marker1, marker2],
      selectedId: null,
      activeCategory: "all",
      setEntityVisibility: (id, visible) => visibilityMap.set(id, visible),
    });

    // One should be visible, and the overlapping one suppressed to prevent merging text
    const m1Visible = visibilityMap.get("paris1");
    const m2Visible = visibilityMap.get("paris2");
    expect((m1Visible ? 1 : 0) + (m2Visible ? 1 : 0)).toBe(1);

    // If marker2 is selected, marker2 MUST be visible
    updateMarkerOcclusion({
      camera,
      canvasWidth: 1440,
      canvasHeight: 900,
      markers: [marker1, marker2],
      selectedId: "paris2",
      activeCategory: "all",
      setEntityVisibility: (id, visible) => visibilityMap.set(id, visible),
    });
    expect(visibilityMap.get("paris2")).toBe(true);
  });
});
