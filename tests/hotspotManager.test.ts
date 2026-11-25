import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { HotspotManager } from "../src/hotspotManager";
import { LANDMARK_HOTSPOTS } from "../src/hotspots";
import { WONDERS } from "../src/wonders";

function createMockElement(tag = "div") {
  const classes = new Set<string>();
  const listeners: Record<string, Function[]> = {};
  const attrs: Record<string, string> = {};
  const children: any[] = [];
  const el: any = {
    tagName: tag.toUpperCase(),
    className: "",
    innerHTML: "",
    textContent: "",
    style: {} as Record<string, string>,
    clientWidth: 1440,
    clientHeight: 900,
    classList: {
      add: (...cs: string[]) => cs.forEach((c) => classes.add(c)),
      remove: (...cs: string[]) => cs.forEach((c) => classes.delete(c)),
      contains: (c: string) => classes.has(c),
    },
    setAttribute: (k: string, v: string) => {
      attrs[k] = v;
    },
    getAttribute: (k: string) => attrs[k] ?? null,
    addEventListener: (event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    appendChild: (child: any) => {
      children.push(child);
      return child;
    },
    remove: vi.fn(),
    click: () => {
      listeners["click"]?.forEach((fn) => fn({ stopPropagation: vi.fn() }));
    },
    querySelector: (selector: string) => el._queryMap?.[selector] ?? null,
    _queryMap: {} as Record<string, any>,
    _children: children,
  };
  return el;
}

function setupHotspotManager() {
  const wonder = WONDERS[0];
  const group = new THREE.Group();
  group.matrix.identity();
  group.updateMatrixWorld(true);

  const groups = new Map<string, THREE.Group>([[wonder.id, group]]);
  const camera = new THREE.PerspectiveCamera(50, 1440 / 900, 0.1, 10000);
  camera.position.set(0, 0, 300);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);

  const viewer = {
    camera: { raw: camera },
    flyToTarget: vi.fn(),
    controls: {},
  } as any;

  const layerEl = createMockElement("div");
  const cardEl = createMockElement("aside");
  const closeBtn = createMockElement("button");
  const returnBtn = createMockElement("button");
  cardEl._queryMap = {
    ".hotspot-card-close": closeBtn,
    "#btn-hotspot-return": returnBtn,
    ".hotspot-card-badge": createMockElement("span"),
    ".hotspot-card-title-zh": createMockElement("h4"),
    ".hotspot-card-title-en": createMockElement("div"),
    ".hotspot-card-summary": createMockElement("p"),
    ".hotspot-card-desc": createMockElement("div"),
    ".hotspot-card-fact-text": createMockElement("p"),
  };

  const onReturnToOverview = vi.fn();
  const onSelectHotspot = vi.fn();
  const onCloseHotspot = vi.fn();

  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag: string) => createMockElement(tag),
  } as any;

  const manager = new HotspotManager(
    viewer,
    groups,
    layerEl,
    cardEl,
    onReturnToOverview,
    onSelectHotspot,
    onCloseHotspot,
  );

  return {
    wonder,
    group,
    camera,
    layerEl,
    cardEl,
    closeBtn,
    returnBtn,
    onReturnToOverview,
    onSelectHotspot,
    onCloseHotspot,
    manager,
    restoreDoc: () => {
      globalThis.document = prevDoc;
    },
  };
}

describe("HotspotManager - State Switching & Panel Occlusion", () => {
  it("should close card silently on setActiveWonder(null) without triggering resetToOverview", () => {
    const ctx = setupHotspotManager();
    try {
      ctx.manager.setActiveWonder(ctx.wonder);
      const firstSpot = LANDMARK_HOTSPOTS[ctx.wonder.id][0];
      ctx.manager.selectHotspot(firstSpot);

      expect(ctx.manager.isCardOpen).toBe(true);
      expect(ctx.cardEl.classList.contains("visible")).toBe(true);
      expect(ctx.onSelectHotspot).toHaveBeenCalledTimes(1);

      // Switching to another wonder clears active wonder via setActiveWonder(null)
      ctx.manager.setActiveWonder(null);

      expect(ctx.manager.isCardOpen).toBe(false);
      expect(ctx.cardEl.classList.contains("hidden")).toBe(true);
      // Crucial: must NOT trigger old landmark reset callbacks while starting flight to new wonder
      expect(ctx.onCloseHotspot).not.toHaveBeenCalled();
      expect(ctx.onReturnToOverview).not.toHaveBeenCalled();
    } finally {
      ctx.restoreDoc();
    }
  });

  it("should trigger overview return exactly once when clicking close or return button", () => {
    const ctx = setupHotspotManager();
    try {
      ctx.manager.setActiveWonder(ctx.wonder);
      const firstSpot = LANDMARK_HOTSPOTS[ctx.wonder.id][0];
      ctx.manager.selectHotspot(firstSpot);

      ctx.closeBtn.click();
      expect(ctx.manager.isCardOpen).toBe(false);
      expect(ctx.onReturnToOverview).toHaveBeenCalledTimes(1);
      expect(ctx.onCloseHotspot).not.toHaveBeenCalled();

      ctx.manager.selectHotspot(firstSpot);
      ctx.returnBtn.click();
      expect(ctx.manager.isCardOpen).toBe(false);
      expect(ctx.onReturnToOverview).toHaveBeenCalledTimes(2);
    } finally {
      ctx.restoreDoc();
    }
  });

  it("should hide hotspot pins that project behind the open right-side panel", () => {
    const ctx = setupHotspotManager();
    try {
      ctx.manager.setActiveWonder(ctx.wonder);
      const spots = LANDMARK_HOTSPOTS[ctx.wonder.id];
      expect(spots.length).toBeGreaterThanOrEqual(2);

      // Place spot 0 near center and spot 1 far right inside the 340px panel area
      const origPos0 = [...spots[0].position] as [number, number, number];
      const origPos1 = [...spots[1].position] as [number, number, number];
      spots[0].position = [0, 0, 0];
      spots[1].position = [180, 0, 0];

      try {
        ctx.manager.update(340);
        const pin0 = ctx.layerEl._children[0];
        const pin1 = ctx.layerEl._children[1];
        expect(pin0.style.display).toBe("flex");
        expect(pin1.style.display).toBe("none");

        // When panel is collapsed (rightOcclusionWidth = 0), spot 1 becomes visible
        ctx.manager.update(0);
        expect(pin1.style.display).toBe("flex");
      } finally {
        spots[0].position = origPos0;
        spots[1].position = origPos1;
      }
    } finally {
      ctx.restoreDoc();
    }
  });
});
