import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ExplorationState } from "../src/state/explorationState";
import { WONDERS } from "../src/wonders";

describe("ExplorationState", () => {
  it("tracks visit, arrival, stale flight guard, and resetToSpace cleanly", () => {
    const state = new ExplorationState();
    const giza = WONDERS[0];
    const wall = WONDERS[1];

    expect(state.selectedId).toBeNull();
    expect(state.hasArrivedCurrentWonder).toBe(false);

    state.beginVisit(giza);
    expect(state.selectedId).toBe(giza.id);
    expect(state.currentWonder).toBe(giza);
    expect(state.hasArrivedCurrentWonder).toBe(false);
    expect(state.activePivotPos).toBeNull();

    // User switches to Wall mid-flight -> stale Giza arrival must be ignored
    state.beginVisit(wall);
    const staleAccepted = state.markArrived(giza.id, new THREE.Vector3(1, 2, 3));
    expect(staleAccepted).toBe(false);
    expect(state.hasArrivedCurrentWonder).toBe(false);
    expect(state.activePivotPos).toBeNull();

    const pivot = new THREE.Vector3(10, 20, 30);
    expect(state.markArrived(wall.id, pivot)).toBe(true);
    expect(state.hasArrivedCurrentWonder).toBe(true);
    expect(state.activePivotPos).toBe(pivot);

    state.resetToSpace();
    expect(state.selectedId).toBeNull();
    expect(state.currentWonder).toBeNull();
    expect(state.hasArrivedCurrentWonder).toBe(false);
    expect(state.activePivotPos).toBeNull();
  });
});
