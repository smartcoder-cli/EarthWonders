import type { Wonder } from "../wonders";
import { WONDERS } from "../wonders";
import { getReferencePhoto, resolvePhotoUrl } from "../data/referencePhotos";

export interface DetailPanelElements {
  detailEl: HTMLElement | null;
  detailKicker: HTMLElement | null;
  detailTitle: HTMLElement | null;
  detailEn: HTMLElement | null;
  detailBlurb: HTMLElement | null;
  specsEl: HTMLElement | null;
  inspectBar: HTMLElement | null;
  comparisonEl: HTMLElement | null;
  comparisonImage: HTMLImageElement | null;
  comparisonSource: HTMLAnchorElement | null;
  comparisonCredit: HTMLElement | null;
  panelEl: HTMLElement | null;
  btnWireframe: HTMLElement | null;
  btnNightmode: HTMLElement | null;
}

export class DetailPanelController {
  private els: DetailPanelElements;

  constructor(elements: DetailPanelElements) {
    this.els = elements;
  }

  public resetInspectionMode(): void {
    const { btnWireframe, btnNightmode } = this.els;
    if (btnWireframe) {
      btnWireframe.classList.remove("active");
      btnWireframe.textContent = "📐 线框网格";
    }
    if (btnNightmode) {
      btnNightmode.classList.remove("active");
      btnNightmode.textContent = "🌓 窗光夜景";
    }
  }

  public showDetail(wonder: Wonder, onRenderList?: () => void): void {
    const {
      detailEl,
      detailKicker,
      detailTitle,
      detailEn,
      detailBlurb,
      specsEl,
      inspectBar,
      comparisonEl,
      comparisonImage,
      comparisonSource,
      comparisonCredit,
      panelEl,
    } = this.els;

    onRenderList?.();

    if (detailKicker) {
      detailKicker.textContent = `${String(wonder.index).padStart(2, "0")} / ${String(WONDERS.length).padStart(2, "0")} · ${wonder.completed}`;
    }
    if (detailTitle) detailTitle.textContent = wonder.nameZh;
    if (detailEn) detailEn.textContent = `${wonder.nameEn} · ${wonder.place}`;
    if (detailBlurb) detailBlurb.textContent = wonder.blurb;

    // 渲染技术与工程规格参数 (Specs)
    if (specsEl) {
      if (wonder.specs && Object.keys(wonder.specs).length > 0) {
        specsEl.replaceChildren();
        for (const [lbl, val] of Object.entries(wonder.specs)) {
          const item = document.createElement("div");
          item.className = "spec-item";
          const lSpan = document.createElement("span");
          lSpan.className = "spec-label";
          lSpan.textContent = lbl;
          const vSpan = document.createElement("span");
          vSpan.className = "spec-val";
          vSpan.textContent = val;
          item.append(lSpan, vSpan);
          specsEl.append(item);
        }
        specsEl.classList.remove("hidden");
      } else {
        specsEl.classList.add("hidden");
      }
    }

    // 深度工程剖析栏 (Pentagon3D 模式)
    if (inspectBar) {
      if (wonder.hasInspection) {
        inspectBar.classList.remove("hidden");
      } else {
        inspectBar.classList.add("hidden");
      }
    }
    this.resetInspectionMode();

    // 实景对照照片渲染与安全加载
    const photo = getReferencePhoto(wonder.id);
    if (comparisonEl && comparisonImage && comparisonSource && comparisonCredit) {
      if (photo) {
        comparisonImage.classList.remove("image-unavailable");
        comparisonImage.alt = photo.alt;
        comparisonSource.href = photo.page;
        comparisonCredit.textContent = photo.credit;

        const primaryUrl = resolvePhotoUrl(photo.image);
        let triedFallback = false;

        comparisonImage.onerror = () => {
          if (!triedFallback && photo.fallbackImage && comparisonImage.src !== photo.fallbackImage) {
            triedFallback = true;
            comparisonImage.src = photo.fallbackImage;
            return;
          }
          comparisonImage.classList.add("image-unavailable");
          comparisonCredit.textContent = `${photo.credit} · 照片加载失败，可打开来源页面查看`;
        };

        comparisonImage.onload = () => {
          comparisonImage.classList.remove("image-unavailable");
        };

        comparisonImage.src = primaryUrl;
        comparisonEl.classList.remove("hidden");
      } else {
        comparisonImage.removeAttribute("src");
        comparisonImage.alt = "";
        comparisonImage.onerror = null;
        comparisonSource.href = "#";
        comparisonCredit.textContent = "";
        comparisonEl.classList.add("hidden");
      }
    }

    document.body.classList.add("has-selected");
    panelEl?.classList.remove("mobile-open");
    panelEl?.classList.add("mobile-hidden");
    if (detailEl) {
      detailEl.classList.remove("hidden");
      detailEl.classList.remove("mobile-expanded");
      detailEl.classList.add("mobile-peek");
    }
  }

  public hideDetail(): void {
    const { detailEl, panelEl } = this.els;
    document.body.classList.remove("has-selected");
    panelEl?.classList.remove("mobile-hidden", "mobile-open");
    if (detailEl) {
      detailEl.classList.add("hidden");
      detailEl.classList.remove("mobile-peek", "mobile-expanded");
    }
    this.resetInspectionMode();
  }
}
