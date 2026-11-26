import { describe, expect, it, vi } from "vitest";
import {
  configureTilesetOptimization,
  createDownloadPriorityComparator,
  setTilesetFlightMode,
  setTilesetOrbitMode,
  triggerTilesetRecovery,
} from "../src/tileOptimization";

function createFakeTileset() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const dispatched: Array<{ type: string }> = [];
  const resetFailedTiles = vi.fn();
  const resetFailedOverlays = vi.fn();

  const surfaceTileset = {
    errorTarget: 1,
    maxTilesProcessed: 250,
    downloadQueue: {
      items: [] as unknown[],
      currJobs: 0,
      maxJobs: 25,
      priorityCallback: ((a: unknown, b: unknown) => {
        const pa = (a as { priority?: number })?.priority ?? Number.POSITIVE_INFINITY;
        const pb = (b as { priority?: number })?.priority ?? Number.POSITIVE_INFINITY;
        return pa !== pb ? (pa > pb ? 1 : -1) : 0;
      }) as ((a: unknown, b: unknown) => number) | null,
    },
    parseQueue: {
      items: [] as unknown[],
      currJobs: 0,
      maxJobs: 5,
    },
    lruCache: {
      minSize: 6000,
      maxSize: 8000,
      minBytesSize: 0.3 * 2 ** 30,
      maxBytesSize: 0.4 * 2 ** 30,
    },
    plugins: [
      {
        name: "IMAGE_OVERLAY_PLUGIN",
        processQueue: { items: [], currJobs: 0, maxJobs: 10 },
        resetFailedOverlays,
      },
    ],
    resetFailedTiles,
    addEventListener(type: string, cb: (event: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener(type: string, cb: (event: unknown) => void) {
      listeners.get(type)?.delete(cb);
    },
    dispatchEvent(event: { type: string }) {
      dispatched.push(event);
      listeners.get(event.type)?.forEach((cb) => cb(event));
    },
  };

  const viewer = {
    tilesetManager: {
      surfaceTileset,
    },
  } as unknown as Parameters<typeof configureTilesetOptimization>[0];

  return { viewer, surfaceTileset, dispatched, resetFailedTiles, resetFailedOverlays };
}

describe("tileOptimization queue scheduling and recovery", () => {
  it("orders negative-timestamp overlay requests FIFO so earlier horizon tiles do not starve", () => {
    const comparator = createDownloadPriorityComparator(null);
    const olderHorizonOverlay = { id: "horizon-older", priority: -1000 };
    const newerForegroundOverlay = { id: "foreground-newer", priority: -5000 };
    const geometryTile = { id: "tile-mesh" };

    // PriorityQueue pops from tail after Array.sort(): last element runs first
    const queue = [newerForegroundOverlay, olderHorizonOverlay, geometryTile];
    queue.sort(comparator);

    expect(queue.pop()).toBe(geometryTile);
    expect(queue.pop()).toBe(olderHorizonOverlay);
    expect(queue.pop()).toBe(newerForegroundOverlay);
  });

  it("raises parse/overlay concurrency, errorTarget baseline, and LRU byte budget without choking orbit mode", () => {
    const { viewer, surfaceTileset } = createFakeTileset();

    configureTilesetOptimization(viewer);

    expect(surfaceTileset.errorTarget).toBe(2);
    expect(surfaceTileset.maxTilesProcessed).toBeGreaterThanOrEqual(360);
    expect(surfaceTileset.parseQueue.maxJobs).toBeGreaterThanOrEqual(16);
    expect(surfaceTileset.plugins[0].processQueue.maxJobs).toBeGreaterThanOrEqual(16);
    expect(surfaceTileset.lruCache.maxBytesSize).toBeGreaterThanOrEqual(768 * 1024 * 1024);

    setTilesetOrbitMode(viewer, true);
    expect(surfaceTileset.errorTarget).toBe(5.5);
    expect(surfaceTileset.downloadQueue.maxJobs).toBeGreaterThanOrEqual(10);
    expect(surfaceTileset.maxTilesProcessed).toBeGreaterThanOrEqual(180);

    setTilesetOrbitMode(viewer, false);
    expect(surfaceTileset.errorTarget).toBe(2);
    expect(surfaceTileset.downloadQueue.maxJobs).toBe(25);
    expect(surfaceTileset.maxTilesProcessed).toBeGreaterThanOrEqual(360);
  });

  it("triggers bounded failed tile & overlay recovery on load-error and resets backoff after progress", () => {
    vi.useFakeTimers();
    try {
      const { viewer, surfaceTileset, resetFailedTiles, resetFailedOverlays, dispatched } = createFakeTileset();
      configureTilesetOptimization(viewer);

      // Simulate a transient error burst
      surfaceTileset.dispatchEvent({ type: "load-error" });
      surfaceTileset.dispatchEvent({ type: "load-error" });
      expect(resetFailedTiles).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1500);
      expect(resetFailedTiles).toHaveBeenCalledTimes(1);
      expect(resetFailedOverlays).toHaveBeenCalledTimes(1);
      expect(dispatched.some((e) => e.type === "needs-update")).toBe(true);

      // Further error resets back off exponentially (3000ms), capped instead of spinning forever
      surfaceTileset.dispatchEvent({ type: "load-error" });
      vi.advanceTimersByTime(2999);
      expect(resetFailedTiles).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(resetFailedTiles).toHaveBeenCalledTimes(2);

      // Successful progress resets backoff delay back to 1500ms
      surfaceTileset.dispatchEvent({ type: "load-content" });
      surfaceTileset.dispatchEvent({ type: "load-error" });
      vi.advanceTimersByTime(1500);
      expect(resetFailedTiles).toHaveBeenCalledTimes(3);

      // Direct recovery works when flight ends
      setTilesetFlightMode(viewer, true);
      expect(surfaceTileset.errorTarget).toBe(120);
      setTilesetFlightMode(viewer, false);
      expect(surfaceTileset.errorTarget).toBe(2);
      expect(resetFailedTiles).toHaveBeenCalledTimes(4);

      triggerTilesetRecovery(surfaceTileset);
      expect(resetFailedTiles).toHaveBeenCalledTimes(5);
    } finally {
      vi.useRealTimers();
    }
  });
});
