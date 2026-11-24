import * as THREE from "three";
import type tellux from "tellux";
import type { Wonder } from "./wonders";

export interface LandmarkMarkerInfo {
  id: string;
  index: number;
  category: string;
  nameZh: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

export function initLandmarkMarkers(
  viewer: InstanceType<typeof tellux.Viewer>,
  wonders: Wonder[],
): LandmarkMarkerInfo[] {
  const list: LandmarkMarkerInfo[] = [];
  const tempMat = new THREE.Matrix4();

  for (const w of wonders) {
    try {
      viewer.cartographicToMatrix4(
        [w.longitude, w.latitude, w.labelHeight ?? 0],
        {},
        tempMat,
      );
      const position = new THREE.Vector3().setFromMatrixPosition(tempMat);
      const normal = position.clone().normalize();
      list.push({
        id: w.id,
        index: w.index,
        category: w.category,
        nameZh: w.nameZh,
        position,
        normal,
      });
    } catch {
      // 容错后备：按标准 WGS84 椭球计算坐标
      const phi = (w.latitude * Math.PI) / 180;
      const theta = (w.longitude * Math.PI) / 180;
      const r = 6378137 + (w.labelHeight ?? 0);
      const position = new THREE.Vector3(
        r * Math.cos(phi) * Math.sin(theta),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.cos(theta),
      );
      const normal = position.clone().normalize();
      list.push({
        id: w.id,
        index: w.index,
        category: w.category,
        nameZh: w.nameZh,
        position,
        normal,
      });
    }
  }

  return list;
}

export interface MarkerOcclusionUpdateOptions {
  camera: THREE.Camera;
  canvasWidth: number;
  canvasHeight: number;
  markers: LandmarkMarkerInfo[];
  selectedId: string | null;
  activeCategory: string;
  setEntityVisibility: (id: string, visible: boolean) => void;
}

export interface PlacedScreenBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 计算地表背面地平线剔除与屏幕空间避让
 */
export function updateMarkerOcclusion(options: MarkerOcclusionUpdateOptions): void {
  const {
    camera,
    canvasWidth,
    canvasHeight,
    markers,
    selectedId,
    activeCategory,
    setEntityVisibility,
  } = options;

  if (canvasWidth <= 0 || canvasHeight <= 0) return;

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);

  const camDistToEarth = camPos.length();
  // 当相机距离地心大于 9500km 时认定为太空/远距离概览视角
  const isSpaceOrGlobalView = camDistToEarth > 9500000;

  // 待放置与已放置屏幕标签框 (用于 2D 碰撞避让)
  const placedBoxes: PlacedScreenBox[] = [];

  const tempDir = new THREE.Vector3();
  const tempProj = new THREE.Vector3();

  // 优先级排序：选中的地标排最前，其次为当前分类，最后按索引顺序
  const sortedMarkers = [...markers].sort((a, b) => {
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;
    const aMatchCat = activeCategory === "all" || a.category === activeCategory;
    const bMatchCat = activeCategory === "all" || b.category === activeCategory;
    if (aMatchCat && !bMatchCat) return -1;
    if (!aMatchCat && bMatchCat) return 1;
    return a.index - b.index;
  });

  for (const marker of sortedMarkers) {
    // 1. 分类过滤
    if (activeCategory !== "all" && marker.category !== activeCategory && marker.id !== selectedId) {
      setEntityVisibility(marker.id, false);
      continue;
    }

    // 2. 地球背面地平线剔除 (Backface Horizon Culling)
    // 视线向量从地标指向相机：V = Cam - Pos
    tempDir.copy(camPos).sub(marker.position);
    const distToCam = tempDir.length();
    if (distToCam > 0.001) {
      tempDir.divideScalar(distToCam); // 归一化视线方向
    }

    // 地表法线与视线向量的点积
    // 若点积 <= -0.04，说明该地标在地平线背面下方，地球自身阻挡完全不可视
    const cosAngle = marker.normal.dot(tempDir);
    if (cosAngle <= -0.04 && marker.id !== selectedId) {
      setEntityVisibility(marker.id, false);
      continue;
    }

    // 3. 投影到视口屏幕坐标
    tempProj.copy(marker.position).project(camera);

    // 在相机视锥背面（NDC z > 1 或 z < -1）
    if (tempProj.z < -1.0 || tempProj.z > 1.0) {
      setEntityVisibility(marker.id, false);
      continue;
    }

    const screenX = (tempProj.x * 0.5 + 0.5) * canvasWidth;
    const screenY = (-tempProj.y * 0.5 + 0.5) * canvasHeight;

    // 超出屏幕边界安全边距
    if (screenX < -40 || screenX > canvasWidth + 40 || screenY < -40 || screenY > canvasHeight + 40) {
      setEntityVisibility(marker.id, false);
      continue;
    }

    // 4. 太空全局视角下的 2D 屏幕碰撞避让
    if (isSpaceOrGlobalView && marker.id !== selectedId) {
      // 评估标签占据的大致屏幕矩形 (约 110px 宽, 32px 高)
      const boxW = 100;
      const boxH = 32;

      let collides = false;
      for (const placed of placedBoxes) {
        const dx = Math.abs(screenX - placed.x);
        const dy = Math.abs(screenY - placed.y);
        // 如果两标签在屏幕上距离过近，说明聚成一团
        if (dx < boxW * 0.85 && dy < boxH * 0.95) {
          collides = true;
          break;
        }
      }

      if (collides) {
        setEntityVisibility(marker.id, false);
        continue;
      }

      placedBoxes.push({
        id: marker.id,
        x: screenX,
        y: screenY,
        width: boxW,
        height: boxH,
      });
    }

    // 通过所有测试：显示该标签
    setEntityVisibility(marker.id, true);
  }
}
