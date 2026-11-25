export interface MobileInteractionsConfig {
  panelEl: HTMLElement | null;
  detailEl: HTMLElement | null;
  viewerEl: HTMLElement | null;
  btnMobileList: HTMLElement | null;
  btnPanelClose: HTMLElement | null;
  panelGrabber: HTMLElement | null;
  detailGrabber: HTMLElement | null;
  detailClose: HTMLElement | null;
  sheetExpandHint: HTMLElement | null;
  onFlyToSpace: () => void;
  onTogglePanel?: () => void;
  onCollapsePanel?: () => void;
}

export function setupMobileInteractions(config: MobileInteractionsConfig): () => void {
  const {
    panelEl,
    detailEl,
    viewerEl,
    btnMobileList,
    btnPanelClose,
    panelGrabber,
    detailGrabber,
    detailClose,
    sheetExpandHint,
    onFlyToSpace,
    onTogglePanel,
    onCollapsePanel,
  } = config;

  const toggleDetailExpansion = () => {
    if (!detailEl) return;
    if (detailEl.classList.contains("mobile-expanded")) {
      detailEl.classList.remove("mobile-expanded");
      detailEl.classList.add("mobile-peek");
    } else {
      detailEl.classList.remove("mobile-peek");
      detailEl.classList.add("mobile-expanded");
    }
  };

  detailGrabber?.addEventListener("click", toggleDetailExpansion);
  sheetExpandHint?.addEventListener("click", toggleDetailExpansion);

  const handleDetailClose = (e: MouseEvent) => {
    e.stopPropagation();
    if (detailEl?.classList.contains("mobile-expanded")) {
      detailEl.classList.remove("mobile-expanded");
      detailEl.classList.add("mobile-peek");
    } else {
      onFlyToSpace();
    }
  };
  detailClose?.addEventListener("click", handleDetailClose);

  // 移动端手势滑动：上滑展开，下滑折叠至常驻 Peek 状态
  let touchStartY = 0;
  let touchStartX = 0;

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches.length > 0) {
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
      if (Math.abs(deltaY) > 35 && Math.abs(deltaY) > deltaX) {
        if (deltaY < 0) {
          detailEl?.classList.remove("mobile-peek");
          detailEl?.classList.add("mobile-expanded");
        } else {
          if (!detailEl || detailEl.scrollTop <= 10) {
            detailEl?.classList.remove("mobile-expanded");
            detailEl?.classList.add("mobile-peek");
          }
        }
      }
    }
  };

  detailEl?.addEventListener("touchstart", handleTouchStart, { passive: true });
  detailEl?.addEventListener("touchend", handleTouchEnd, { passive: true });

  const handleOpenList = (e: MouseEvent) => {
    e.stopPropagation();
    if (onTogglePanel) {
      onTogglePanel();
      return;
    }
    panelEl?.classList.toggle("mobile-open");
    panelEl?.classList.remove("mobile-hidden");
  };
  btnMobileList?.addEventListener("click", handleOpenList);

  const handleClosePanel = (e: MouseEvent) => {
    e.stopPropagation();
    if (onCollapsePanel) {
      onCollapsePanel();
      return;
    }
    panelEl?.classList.remove("mobile-open");
    panelEl?.classList.add("mobile-hidden");
  };
  btnPanelClose?.addEventListener("click", handleClosePanel);

  const handleTogglePanel = () => {
    if (onTogglePanel) {
      onTogglePanel();
      return;
    }
    panelEl?.classList.toggle("mobile-open");
  };
  panelGrabber?.addEventListener("click", handleTogglePanel);

  // 点击 3D 画布空白处时，自动收起抽屉与面板
  const handleViewerClick = () => {
    if (window.innerWidth <= 768) {
      if (detailEl?.classList.contains("mobile-expanded")) {
        detailEl.classList.remove("mobile-expanded");
        detailEl.classList.add("mobile-peek");
      }
      if (panelEl?.classList.contains("mobile-open")) {
        if (onCollapsePanel) {
          onCollapsePanel();
        } else {
          panelEl.classList.remove("mobile-open");
          panelEl.classList.add("mobile-hidden");
        }
      }
    }
  };
  viewerEl?.addEventListener("click", handleViewerClick);

  return () => {
    detailGrabber?.removeEventListener("click", toggleDetailExpansion);
    sheetExpandHint?.removeEventListener("click", toggleDetailExpansion);
    detailClose?.removeEventListener("click", handleDetailClose);
    detailEl?.removeEventListener("touchstart", handleTouchStart);
    detailEl?.removeEventListener("touchend", handleTouchEnd);
    btnMobileList?.removeEventListener("click", handleOpenList);
    btnPanelClose?.removeEventListener("click", handleClosePanel);
    panelGrabber?.removeEventListener("click", handleTogglePanel);
    viewerEl?.removeEventListener("click", handleViewerClick);
  };
}
