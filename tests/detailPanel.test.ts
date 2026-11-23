import { describe, expect, it, vi } from "vitest";
import { DetailPanelController } from "../src/ui/detailPanel";

function createMockElement() {
  const classes = new Set<string>();
  const listeners: Record<string, Function[]> = {};
  return {
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    addEventListener: (event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    click: () => {
      listeners["click"]?.forEach((fn) => fn({ stopPropagation: () => {} }));
    },
    textContent: "",
    title: "",
    setAttribute: vi.fn(),
  } as any;
}

function createMockDetailElements() {
  return {
    detailEl: createMockElement(),
    detailKicker: createMockElement(),
    detailTitle: createMockElement(),
    detailEn: createMockElement(),
    detailBlurb: createMockElement(),
    specsEl: createMockElement(),
    inspectBar: createMockElement(),
    comparisonEl: createMockElement(),
    comparisonImage: createMockElement(),
    comparisonSource: createMockElement(),
    comparisonCredit: createMockElement(),
    panelEl: createMockElement(),
    btnWireframe: createMockElement(),
    btnNightmode: createMockElement(),
    btnMinimize: createMockElement(),
    headingRow: createMockElement(),
  };
}

describe("DetailPanelController - Minimize & Expand", () => {
  it("should initialize unminimized and toggle correctly", () => {
    const els = createMockDetailElements();
    const controller = new DetailPanelController(els);

    expect(controller.isMinimized).toBe(false);
    expect(els.detailEl.classList.contains("minimized")).toBe(false);

    // Minimize
    controller.minimize();
    expect(controller.isMinimized).toBe(true);
    expect(els.detailEl.classList.contains("minimized")).toBe(true);
    expect(els.btnMinimize.textContent).toBe("▼");
    expect(els.btnMinimize.title).toBe("展开详情卡 [M]");

    // Expand
    controller.expand();
    expect(controller.isMinimized).toBe(false);
    expect(els.detailEl.classList.contains("minimized")).toBe(false);
    expect(els.btnMinimize.textContent).toBe("▲");
    expect(els.btnMinimize.title).toBe("收起详情卡 [M]");

    // Toggle
    controller.toggleMinimize();
    expect(controller.isMinimized).toBe(true);
    controller.toggleMinimize();
    expect(controller.isMinimized).toBe(false);
  });

  it("should expand when clicking minimized pill header or card", () => {
    const els = createMockDetailElements();
    const controller = new DetailPanelController(els);

    controller.minimize();
    expect(controller.isMinimized).toBe(true);

    // Clicking headingRow should expand
    els.headingRow.click();
    expect(controller.isMinimized).toBe(false);

    // Re-minimize and click card body to expand
    controller.minimize();
    expect(controller.isMinimized).toBe(true);
    els.detailEl.click();
    expect(controller.isMinimized).toBe(false);
  });
});
