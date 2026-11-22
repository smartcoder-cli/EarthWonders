import type tellux from "tellux";
import type { OptimizedTileset } from "./types/global";

let baseErrorTarget = 2;
let baseMaxTilesProcessed = 250;
let baseMaxJobs = 25;

export function getSurfaceTileset(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): OptimizedTileset | undefined {
  if (!viewer) return undefined;
  const untyped = viewer as unknown as { tilesetManager?: { surfaceTileset?: OptimizedTileset } };
  return untyped.tilesetManager?.surfaceTileset;
}

export function getBaseErrorTarget(): number {
  return baseErrorTarget;
}

/**
 * 配置 3D-Tiles 下载队列调度：
 * 反转 priorityCallback 为 LIFO 策略，确保飞抵新景点时优先下载最新请求的高清瓦片
 */
export function configureTilesetOptimization(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): void {
  const tileset = getSurfaceTileset(viewer);
  if (!tileset) return;

  baseErrorTarget = tileset.errorTarget ?? 2;
  baseMaxTilesProcessed = tileset.maxTilesProcessed ?? 250;
  baseMaxJobs = tileset.downloadQueue?.maxJobs ?? 25;

  const dlQueue = tileset.downloadQueue;
  if (dlQueue) {
    const originalCallback = dlQueue.priorityCallback;
    dlQueue.priorityCallback = (a: any, b: any) => {
      const pa = a?.priority;
      const pb = b?.priority;
      if (typeof pa === "number" && typeof pb === "number") {
        return pa < pb ? 1 : pa > pb ? -1 : 0;
      }
      return originalCallback ? originalCallback(a, b) : 0;
    };
  }
}

/**
 * 飞行中动态调整瓦片精度，杜绝万米高空过路瓦片泛滥
 */
export function setTilesetFlightMode(viewer: InstanceType<typeof tellux.Viewer> | null | undefined, isFlying: boolean): void {
  const tileset = getSurfaceTileset(viewer);
  if (tileset) {
    tileset.errorTarget = isFlying ? 120 : baseErrorTarget;
  }
}

/**
 * 航拍环绕专属瓦片调度优化：
 * 1. 适度放宽几何误差目标 (5.5)，避免相机 360° 旋转时视锥在每个方位狂刷极限层级瓦片
 * 2. 调低每帧最大瓦片遍历数 (maxTilesProcessed: 80)，切除单帧 20ms+ 的 BVH 空间树遍历开销
 * 3. 适度节流网络并发数 (maxJobs: 4)，杜绝并发纹理提交造成 500ms+ 的主线程冻结
 * 4. 动态扩充 LRU 瓦片显存容量，避免环绕前半圈加载好的周围远景瓦片在转到后半圈时被驱逐，使第二圈起维持极致平滑 (35ms 以内稳定帧)
 */
export function setTilesetOrbitMode(viewer: InstanceType<typeof tellux.Viewer> | null | undefined, isOrbiting: boolean): void {
  const tileset = getSurfaceTileset(viewer);
  if (!tileset) return;

  if (isOrbiting) {
    if (typeof tileset.errorTarget === "number" && tileset.errorTarget < 5.5) {
      baseErrorTarget = tileset.errorTarget;
    }
    if (typeof tileset.maxTilesProcessed === "number" && tileset.maxTilesProcessed > 100) {
      baseMaxTilesProcessed = tileset.maxTilesProcessed;
    }
    if (tileset.downloadQueue && typeof tileset.downloadQueue.maxJobs === "number" && tileset.downloadQueue.maxJobs > 8) {
      baseMaxJobs = tileset.downloadQueue.maxJobs;
    }

    tileset.errorTarget = 5.5;
    tileset.maxTilesProcessed = 80;
    if (tileset.downloadQueue) {
      tileset.downloadQueue.maxJobs = 4;
    }
    if (tileset.lruCache) {
      tileset.lruCache.minSize = Math.max(tileset.lruCache.minSize ?? 6000, 10000);
      tileset.lruCache.maxSize = Math.max(tileset.lruCache.maxSize ?? 8000, 15000);
    }
  } else {
    tileset.errorTarget = baseErrorTarget;
    tileset.maxTilesProcessed = baseMaxTilesProcessed;
    if (tileset.downloadQueue) {
      tileset.downloadQueue.maxJobs = baseMaxJobs;
    }
  }
}

/**
 * 等待当前景点的地图瓦片下载并渲染完成。
 * 监控 3D-Tiles downloadQueue，排空且稳定 quietMs 毫秒后放行。
 */
export function waitForMapTiles(
  viewer: InstanceType<typeof tellux.Viewer> | null | undefined,
  shouldContinue: () => boolean,
  maxWaitMs = 14_000,
  quietMs = 1_000,
): Promise<void> {
  return new Promise((resolve) => {
    const tileset = getSurfaceTileset(viewer);
    const dlQueue = tileset?.downloadQueue;
    const startedAt = performance.now();
    let quietSince: number | null = null;
    let initialGraceDone = false;

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;

      // 允许最初 350ms 宽限期，以便镜头刚停稳时 3D-Tiles 发起视口遍历并将当前景点的瓦片推入队列
      if (!initialGraceDone) {
        if (elapsed < 350) return;
        initialGraceDone = true;
      }

      // 若外部已打断（例如巡礼停止），立即结束等待
      if (!shouldContinue()) {
        window.clearInterval(timer);
        resolve();
        return;
      }

      const items = dlQueue?.items?.length ?? 0;
      const jobs = dlQueue?.currJobs ?? 0;

      // 当队列中既无等待任务也无正在进行的网络连接时，确认处于完全就绪状态
      if (items === 0 && jobs === 0) {
        if (quietSince === null) {
          quietSince = performance.now();
        }
        if (performance.now() - quietSince >= quietMs) {
          window.clearInterval(timer);
          resolve();
          return;
        }
      } else {
        quietSince = null;
      }

      // 达到最长超时保底，放行
      if (elapsed >= maxWaitMs) {
        window.clearInterval(timer);
        resolve();
      }
    }, 120);
  });
}
