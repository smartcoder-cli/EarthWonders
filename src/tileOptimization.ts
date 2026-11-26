import type tellux from "tellux";
import type { OptimizedTileset, TilesetPluginLike } from "./types/global";

const DEFAULT_BASE_ERROR_TARGET = 2;
const DEFAULT_BASE_MAX_TILES_PROCESSED = 360;
const DEFAULT_BASE_MAX_JOBS = 25;
const MIN_PARSE_QUEUE_JOBS = 16;
const MIN_OVERLAY_PROCESS_JOBS = 16;
const ORBIT_ERROR_TARGET = 5.5;
const ORBIT_MAX_TILES_PROCESSED = 180;
const ORBIT_MAX_DOWNLOAD_JOBS = 10;
const MIN_LRU_TILE_COUNT = 10_000;
const MAX_LRU_TILE_COUNT = 15_000;
const MIN_LRU_BYTES = 512 * 1024 * 1024;
const MAX_LRU_BYTES = 768 * 1024 * 1024;
const MAX_CONSECUTIVE_RECOVERY_ROUNDS = 4;

let baseErrorTarget = DEFAULT_BASE_ERROR_TARGET;
let baseMaxTilesProcessed = DEFAULT_BASE_MAX_TILES_PROCESSED;
let baseMaxJobs = DEFAULT_BASE_MAX_JOBS;

const configuredTilesets = new WeakSet<object>();

export function getSurfaceTileset(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): OptimizedTileset | undefined {
  if (!viewer) return undefined;
  const untyped = viewer as unknown as { tilesetManager?: { surfaceTileset?: OptimizedTileset } };
  return untyped.tilesetManager?.surfaceTileset;
}

export function getBaseErrorTarget(): number {
  return baseErrorTarget;
}

function getImageOverlayPlugins(tileset: OptimizedTileset): TilesetPluginLike[] {
  if (!Array.isArray(tileset.plugins)) return [];
  return tileset.plugins.filter(
    (plugin) =>
      typeof plugin?.resetFailedOverlays === "function" ||
      plugin?.name === "IMAGE_OVERLAY_PLUGIN" ||
      plugin?.name === "TELLUX_WEBGPU_TERRAIN_OVERLAY_SPLITTING_PLUGIN",
  );
}

/**
 * 构建 3D-Tiles 下载队列优先级比较器：
 * 注意 3d-tiles-renderer PriorityQueue 通过 Array.sort 后 pop() 队尾元素优先执行，
 * ImageOverlayPlugin 传入的是负时间戳 (-performance.now())。
 * 比较结果 > 0 时排在队尾最先出队：
 * - 几何瓦片（无 numeric priority -> +Infinity）优先于底图影像请求；
 * - 同为影像请求时保持 FIFO（较早入队者 priority 较大/较接近 0，先于新请求出队），避免远景/背景瓦片被持续饿死。
 */
export function createDownloadPriorityComparator(
  originalCallback: ((a: unknown, b: unknown) => number) | null | undefined,
): (a: unknown, b: unknown) => number {
  return (a: unknown, b: unknown) => {
    const rawA = (a as { priority?: unknown } | null | undefined)?.priority;
    const rawB = (b as { priority?: unknown } | null | undefined)?.priority;
    const keyA = typeof rawA === "number" && Number.isFinite(rawA) ? rawA : Number.POSITIVE_INFINITY;
    const keyB = typeof rawB === "number" && Number.isFinite(rawB) ? rawB : Number.POSITIVE_INFINITY;

    if (keyA !== keyB) {
      return keyA > keyB ? 1 : -1;
    }
    return originalCallback ? originalCallback(a, b) : 0;
  };
}

/**
 * 主动触发一次失败瓦片与失败影像叠层的复位重抓，并在下一帧唤醒 UpdateOnChangePlugin 重新遍历
 */
export function triggerTilesetRecovery(tileset: OptimizedTileset | undefined): void {
  if (!tileset) return;

  try {
    tileset.resetFailedTiles?.();
  } catch (err) {
    console.debug("resetFailedTiles handled:", err);
  }

  for (const plugin of getImageOverlayPlugins(tileset)) {
    try {
      plugin.resetFailedOverlays?.();
    } catch (err) {
      console.debug("resetFailedOverlays handled:", err);
    }
  }

  tileset.dispatchEvent?.({ type: "needs-update" });
  tileset.dispatchEvent?.({ type: "needs-render" });

  // resetFailedOverlays 内部在 requestAnimationFrame 中重锁纹理，完成后再次轻推渲染刷新
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      tileset.dispatchEvent?.({ type: "needs-update" });
      tileset.dispatchEvent?.({ type: "needs-render" });
    });
  }
}

function attachFailureRecovery(tileset: OptimizedTileset): void {
  if (configuredTilesets.has(tileset)) return;
  configuredTilesets.add(tileset);

  let consecutiveFailures = 0;
  let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  let endNudgeSent = false;

  const scheduleRecovery = () => {
    if (recoveryTimer !== null || consecutiveFailures >= MAX_CONSECUTIVE_RECOVERY_ROUNDS) {
      return;
    }
    const delayMs = 1500 * 2 ** consecutiveFailures;
    recoveryTimer = setTimeout(() => {
      recoveryTimer = null;
      if (consecutiveFailures >= MAX_CONSECUTIVE_RECOVERY_ROUNDS) return;
      consecutiveFailures += 1;
      triggerTilesetRecovery(tileset);
    }, delayMs);
  };

  tileset.addEventListener?.("load-error", () => {
    endNudgeSent = false;
    scheduleRecovery();
  });

  const markProgress = () => {
    consecutiveFailures = 0;
    endNudgeSent = false;
  };
  tileset.addEventListener?.("load-content", markProgress);
  tileset.addEventListener?.("load-model", markProgress);

  tileset.addEventListener?.("tiles-load-end", () => {
    if (endNudgeSent) return;
    endNudgeSent = true;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        tileset.dispatchEvent?.({ type: "needs-update" });
        tileset.dispatchEvent?.({ type: "needs-render" });
      });
    }
  });

  if (typeof window !== "undefined" && typeof WeakRef !== "undefined") {
    const tilesetRef = new WeakRef(tileset);
    const onOnline = () => {
      const target = tilesetRef.deref();
      if (!target) {
        window.removeEventListener("online", onOnline);
        return;
      }
      consecutiveFailures = 0;
      endNudgeSent = false;
      if (recoveryTimer !== null) {
        clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
      triggerTilesetRecovery(target);
    };
    window.addEventListener("online", onOnline);
  }
}

/**
 * 配置 3D-Tiles 下载/解析队列调度与失败恢复机制：
 * 1. 修复负时间戳被反排导致的远景/背景瓦片队列饥饿
 * 2. 放宽 parseQueue 并发上限，防止 5 个纹理网络等待反卡住后续全部解析槽位
 * 3. 适度抬升视锥遍历与显存字节上限，兼顾斜视角地标背后延伸至地平线的海量瓦片
 * 4. 监听 load-error 与浏览器恢复联网事件，自动有界限流重抓失败贴图并唤醒渲染更新
 */
export function configureTilesetOptimization(viewer: InstanceType<typeof tellux.Viewer> | null | undefined): void {
  const tileset = getSurfaceTileset(viewer);
  if (!tileset) return;

  baseErrorTarget = Math.max(tileset.errorTarget ?? DEFAULT_BASE_ERROR_TARGET, DEFAULT_BASE_ERROR_TARGET);
  baseMaxTilesProcessed = Math.max(tileset.maxTilesProcessed ?? DEFAULT_BASE_MAX_TILES_PROCESSED, DEFAULT_BASE_MAX_TILES_PROCESSED);
  baseMaxJobs = Math.max(tileset.downloadQueue?.maxJobs ?? DEFAULT_BASE_MAX_JOBS, DEFAULT_BASE_MAX_JOBS);

  tileset.errorTarget = baseErrorTarget;
  tileset.maxTilesProcessed = baseMaxTilesProcessed;

  const dlQueue = tileset.downloadQueue;
  if (dlQueue) {
    dlQueue.maxJobs = baseMaxJobs;
    dlQueue.priorityCallback = createDownloadPriorityComparator(dlQueue.priorityCallback);
  }

  if (tileset.parseQueue) {
    tileset.parseQueue.maxJobs = Math.max(tileset.parseQueue.maxJobs ?? 5, MIN_PARSE_QUEUE_JOBS);
  }

  for (const plugin of getImageOverlayPlugins(tileset)) {
    if (plugin.processQueue) {
      plugin.processQueue.maxJobs = Math.max(plugin.processQueue.maxJobs ?? 10, MIN_OVERLAY_PROCESS_JOBS);
    }
  }

  if (tileset.lruCache) {
    tileset.lruCache.minSize = Math.max(tileset.lruCache.minSize ?? 6000, MIN_LRU_TILE_COUNT);
    tileset.lruCache.maxSize = Math.max(tileset.lruCache.maxSize ?? 8000, MAX_LRU_TILE_COUNT);
    tileset.lruCache.minBytesSize = Math.max(tileset.lruCache.minBytesSize ?? 0, MIN_LRU_BYTES);
    tileset.lruCache.maxBytesSize = Math.max(tileset.lruCache.maxBytesSize ?? 0, MAX_LRU_BYTES);
  }

  attachFailureRecovery(tileset);
}

/**
 * 飞行中动态调整瓦片精度，飞抵后立即唤醒队列与恢复检查
 */
export function setTilesetFlightMode(viewer: InstanceType<typeof tellux.Viewer> | null | undefined, isFlying: boolean): void {
  const tileset = getSurfaceTileset(viewer);
  if (!tileset) return;

  tileset.errorTarget = isFlying ? 120 : baseErrorTarget;
  if (!isFlying) {
    triggerTilesetRecovery(tileset);
  }
}

/**
 * 航拍环绕瓦片调度优化：
 * 保持足够的网络并发 (10) 与遍历节点预算 (180)，既稳住旋转帧率，又不让地标背后远景瓦片停顿饥饿
 */
export function setTilesetOrbitMode(viewer: InstanceType<typeof tellux.Viewer> | null | undefined, isOrbiting: boolean): void {
  const tileset = getSurfaceTileset(viewer);
  if (!tileset) return;

  if (isOrbiting) {
    if (typeof tileset.errorTarget === "number" && tileset.errorTarget < ORBIT_ERROR_TARGET) {
      baseErrorTarget = tileset.errorTarget;
    }
    if (typeof tileset.maxTilesProcessed === "number" && tileset.maxTilesProcessed > ORBIT_MAX_TILES_PROCESSED) {
      baseMaxTilesProcessed = tileset.maxTilesProcessed;
    }
    if (tileset.downloadQueue && typeof tileset.downloadQueue.maxJobs === "number" && tileset.downloadQueue.maxJobs > ORBIT_MAX_DOWNLOAD_JOBS) {
      baseMaxJobs = tileset.downloadQueue.maxJobs;
    }

    tileset.errorTarget = ORBIT_ERROR_TARGET;
    tileset.maxTilesProcessed = Math.max(ORBIT_MAX_TILES_PROCESSED, Math.min(baseMaxTilesProcessed, 240));
    if (tileset.downloadQueue) {
      tileset.downloadQueue.maxJobs = Math.max(ORBIT_MAX_DOWNLOAD_JOBS, Math.min(baseMaxJobs, 12));
    }
    if (tileset.lruCache) {
      tileset.lruCache.minSize = Math.max(tileset.lruCache.minSize ?? 6000, MIN_LRU_TILE_COUNT);
      tileset.lruCache.maxSize = Math.max(tileset.lruCache.maxSize ?? 8000, MAX_LRU_TILE_COUNT);
      tileset.lruCache.minBytesSize = Math.max(tileset.lruCache.minBytesSize ?? 0, MIN_LRU_BYTES);
      tileset.lruCache.maxBytesSize = Math.max(tileset.lruCache.maxBytesSize ?? 0, MAX_LRU_BYTES);
    }
  } else {
    tileset.errorTarget = baseErrorTarget;
    tileset.maxTilesProcessed = baseMaxTilesProcessed;
    if (tileset.downloadQueue) {
      tileset.downloadQueue.maxJobs = baseMaxJobs;
    }
    tileset.dispatchEvent?.({ type: "needs-update" });
  }
}

/**
 * 等待当前景点的地图瓦片下载并渲染完成。
 * 监控 3D-Tiles downloadQueue 与 parseQueue，排空且稳定 quietMs 毫秒后放行。
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
    const parseQueue = tileset?.parseQueue;
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

      const dlItems = dlQueue?.items?.length ?? 0;
      const dlJobs = dlQueue?.currJobs ?? 0;
      const parseItems = parseQueue?.items?.length ?? 0;
      const parseJobs = parseQueue?.currJobs ?? 0;

      // 当下载与解析队列中既无等待任务也无正在进行的工作时，确认处于完全就绪状态
      if (dlItems === 0 && dlJobs === 0 && parseItems === 0 && parseJobs === 0) {
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
