import { describe, expect, it, vi } from "vitest";
import { setupMobileInteractions } from "../src/ui/mobile";

function createMockBtn() {
  const listeners: Record<string, Function[]> = {};
  const classes = new Set<string>();
  return {
    classList: {
      add: (...cs: string[]) => cs.forEach((c) => classes.add(c)),
      remove: (...cs: string[]) => cs.forEach((c) => classes.delete(c)),
      toggle: (c: string) => (classes.has(c) ? classes.delete(c) : classes.add(c)),
      contains: (c: string) => classes.has(c),
    },
    addEventListener: (ev: string, fn: Function) => {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    },
    removeEventListener: vi.fn(),
    click: () => listeners["click"]?.forEach((fn) => fn({ stopPropagation: vi.fn() })),
  } as any;
}

describe("Mobile & Panel Toggle Interactions", () => {
  it("delegates list toggle and collapse through single callbacks without double-toggling", () => {
    const panelEl = createMockBtn();
    panelEl.classList.add("mobile-hidden");

    const togglePanel = () => {
      if (panelEl.classList.contains("collapsed") || panelEl.classList.contains("mobile-hidden")) {
        panelEl.classList.remove("collapsed", "mobile-hidden");
        panelEl.classList.add("mobile-open");
      } else {
        panelEl.classList.add("collapsed", "mobile-hidden");
        panelEl.classList.remove("mobile-open");
      }
    };
    const collapsePanel = () => {
      panelEl.classList.add("collapsed", "mobile-hidden");
      panelEl.classList.remove("mobile-open");
    };

    const btnMobileList = createMockBtn();
    const btnPanelClose = createMockBtn();

    const cleanup = setupMobileInteractions({
      panelEl,
      detailEl: createMockBtn(),
      viewerEl: createMockBtn(),
      btnMobileList,
      btnPanelClose,
      panelGrabber: createMockBtn(),
      detailGrabber: createMockBtn(),
      detailClose: createMockBtn(),
      sheetExpandHint: createMockBtn(),
      onFlyToSpace: vi.fn(),
      onTogglePanel: togglePanel,
      onCollapsePanel: collapsePanel,
    });

    btnMobileList.click();
    expect(panelEl.classList.contains("mobile-open")).toBe(true);
    expect(panelEl.classList.contains("mobile-hidden")).toBe(false);

    btnPanelClose.click();
    expect(panelEl.classList.contains("mobile-open")).toBe(false);
    expect(panelEl.classList.contains("mobile-hidden")).toBe(true);
    expect(panelEl.classList.contains("collapsed")).toBe(true);

    cleanup();
  });
});
