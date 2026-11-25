import * as THREE from "three";
import type tellux from "tellux";
import { LANDMARK_HOTSPOTS, type Hotspot } from "./hotspots";
import type { Wonder } from "./wonders";

export class HotspotManager {
  private viewer: InstanceType<typeof tellux.Viewer>;
  private layerEl: HTMLElement;
  private cardEl: HTMLElement | null;
  private currentWonder: Wonder | null = null;
  private landmarkGroups: Map<string, THREE.Group>;
  private pinElements: Map<string, HTMLElement> = new Map();
  private activeHotspot: Hotspot | null = null;
  private onReturnToOverview?: () => void;
  private onSelectHotspot?: (hotspot: Hotspot, worldPos: THREE.Vector3) => void;
  private onCloseHotspot?: () => void;

  private _tempVec = new THREE.Vector3();
  private _camPos = new THREE.Vector3();
  private _dirToHotspot = new THREE.Vector3();
  private _projected = new THREE.Vector3();
  private _isOrbiting = false;
  private _dummyTarget = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));

  constructor(
    viewer: InstanceType<typeof tellux.Viewer>,
    landmarkGroups: Map<string, THREE.Group>,
    layerEl: HTMLElement,
    cardEl: HTMLElement | null,
    onReturnToOverview?: () => void,
    onSelectHotspot?: (hotspot: Hotspot, worldPos: THREE.Vector3) => void,
    onCloseHotspot?: () => void,
  ) {
    this.viewer = viewer;
    this.landmarkGroups = landmarkGroups;
    this.layerEl = layerEl;
    this.cardEl = cardEl;
    this.onReturnToOverview = onReturnToOverview;
    this.onSelectHotspot = onSelectHotspot;
    this.onCloseHotspot = onCloseHotspot;

    this.bindCardEvents();
  }

  private bindCardEvents() {
    if (!this.cardEl) return;
    const handleDismiss = () => {
      const hadWonder = Boolean(this.currentWonder);
      this.closeCard(true);
      if (hadWonder) {
        if (this.onReturnToOverview) {
          this.onReturnToOverview();
        } else {
          this.onCloseHotspot?.();
        }
      }
    };

    const closeBtn = this.cardEl.querySelector<HTMLButtonElement>(".hotspot-card-close");
    closeBtn?.addEventListener("click", handleDismiss);

    const returnBtn = this.cardEl.querySelector<HTMLButtonElement>("#btn-hotspot-return");
    returnBtn?.addEventListener("click", handleDismiss);
  }

  public setActiveWonder(wonder: Wonder | null) {
    if (this.currentWonder?.id === wonder?.id) return;
    this.currentWonder = wonder;
    // 切换地标或清空时静默关闭旧热点卡片，避免反向触发旧地标的 resetToOverview
    this.closeCard(true);
    this.clearPins();

    if (!wonder) return;
    const list = LANDMARK_HOTSPOTS[wonder.id];
    if (!list || list.length === 0) return;

    for (const hotspot of list) {
      this.createPinElement(hotspot);
    }
  }

  private clearPins() {
    for (const [, el] of this.pinElements) {
      el.remove();
    }
    this.pinElements.clear();
  }

  private createPinElement(hotspot: Hotspot) {
    const pin = document.createElement("button");
    pin.className = "hotspot-pin";
    pin.setAttribute("type", "button");
    pin.setAttribute("title", hotspot.nameZh);
    pin.innerHTML = `
      <div class="hotspot-pin-glow"></div>
      <div class="hotspot-pin-dot">
        <svg class="hotspot-pin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="hotspot-pin-label">
        <span class="hotspot-pin-badge">${hotspot.category}</span>
        <span class="hotspot-pin-title">${hotspot.nameZh}</span>
      </div>
    `;

    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectHotspot(hotspot);
    });

    this.layerEl.appendChild(pin);
    this.pinElements.set(hotspot.id, pin);
  }

  public selectHotspot(hotspot: Hotspot) {
    this.activeHotspot = hotspot;
    this.showCard(hotspot);

    const wonder = this.currentWonder;
    const group = wonder ? this.landmarkGroups.get(wonder.id) : undefined;
    if (!wonder || !group) return;

    // 计算热点在世界坐标系中的位置
    this._tempVec.set(...hotspot.position);
    this._tempVec.applyMatrix4(group.matrix);

    if (this.onSelectHotspot) {
      this.onSelectHotspot(hotspot, this._tempVec);
      return;
    }

    this._dummyTarget.position.copy(this._tempVec);
    this._dummyTarget.updateMatrixWorld(true);

    // 平滑飞行到该构件特写
    this.viewer.flyToTarget(
      this._dummyTarget,
      {
        offset: {
          heading: hotspot.focusHeading ?? wonder.flyHeading,
          pitch: hotspot.focusPitch ?? -16,
          distance: hotspot.focusDistance,
        },
        duration: 2.2,
        complete: () => {
          this.updateControlsPivot(this._tempVec);
        },
      },
    );
  }

  private updateControlsPivot(pos: THREE.Vector3) {
    try {
      const rawControls = (this.viewer.controls as { raw?: { pivotPoint?: THREE.Vector3; pivotMesh?: THREE.Object3D } })?.raw ?? (this.viewer.controls as { pivotPoint?: THREE.Vector3; pivotMesh?: THREE.Object3D });
      if (rawControls?.pivotPoint) {
        rawControls.pivotPoint.copy(pos);
        rawControls.pivotMesh?.position.copy(pos);
      }
    } catch {
      // 忽略非致命异常
    }
  }

  private showCard(hotspot: Hotspot) {
    if (!this.cardEl) return;
    const badgeEl = this.cardEl.querySelector(".hotspot-card-badge");
    const titleZhEl = this.cardEl.querySelector(".hotspot-card-title-zh");
    const titleEnEl = this.cardEl.querySelector(".hotspot-card-title-en");
    const summaryEl = this.cardEl.querySelector(".hotspot-card-summary");
    const descEl = this.cardEl.querySelector(".hotspot-card-desc");
    const factEl = this.cardEl.querySelector(".hotspot-card-fact-text");

    if (badgeEl) badgeEl.textContent = hotspot.category;
    if (titleZhEl) titleZhEl.textContent = hotspot.nameZh;
    if (titleEnEl) titleEnEl.textContent = hotspot.nameEn;
    if (summaryEl) summaryEl.textContent = hotspot.summary;
    if (descEl) descEl.textContent = hotspot.description;
    if (factEl) factEl.textContent = hotspot.funFact;

    this.cardEl.classList.remove("hidden");
    this.cardEl.classList.add("visible");
  }

  public closeCard(silent = false) {
    const wasOpen = this.activeHotspot !== null || Boolean(this.cardEl?.classList.contains("visible"));
    this.activeHotspot = null;
    if (this.cardEl) {
      this.cardEl.classList.remove("visible");
      this.cardEl.classList.add("hidden");
    }
    if (!silent && wasOpen) {
      this.onCloseHotspot?.();
    }
  }

  /**
   * 航拍模式自适应：环绕期间隐藏所有 3D 浮动图钉，杜绝每帧 DOM 变换与视锥计算，恢复电影级沉浸视角
   */
  public setOrbitMode(isOrbiting: boolean) {
    this._isOrbiting = isOrbiting;
    if (isOrbiting) {
      for (const [, pin] of this.pinElements) {
        if (pin.style.display !== "none") {
          pin.style.display = "none";
        }
      }
    }
  }

  /**
   * 逐帧更新热点浮动图标在屏幕上的投影坐标与可视性
   */
  public update(rightOcclusionWidth = 0) {
    if (this._isOrbiting) return;

    if (!this.currentWonder) {
      if (this.pinElements.size > 0) this.clearPins();
      return;
    }

    const group = this.landmarkGroups.get(this.currentWonder.id);
    if (!group) return;

    const camera = this.viewer.camera.raw;
    camera.getWorldPosition(this._camPos);
    const width = this.layerEl.clientWidth;
    const height = this.layerEl.clientHeight;
    const maxVisibleX = rightOcclusionWidth > 0 ? width - rightOcclusionWidth - 20 : width + 60;

    const list = LANDMARK_HOTSPOTS[this.currentWonder.id] ?? [];
    for (const hotspot of list) {
      const pin = this.pinElements.get(hotspot.id);
      if (!pin) continue;

      // 局部坐标转世界坐标
      this._tempVec.set(...hotspot.position);
      this._tempVec.applyMatrix4(group.matrix);

      // 计算视线方向与表面法线夹角进行地表地平线遮挡检测（复用向量，零 GC 分配）
      this._dirToHotspot.copy(this._tempVec).sub(this._camPos);
      const dist = this._dirToHotspot.length();
      this._dirToHotspot.normalize();

      // 投影到归一化设备坐标 (NDC: -1 到 1)
      this._projected.copy(this._tempVec).project(camera);

      // 若在相机背后，或超出合理可视距离，隐藏
      if (this._projected.z > 1.0 || dist > 2500) {
        if (pin.style.display !== "none") pin.style.display = "none";
        continue;
      }

      // 屏幕像素坐标
      const screenX = (this._projected.x * 0.5 + 0.5) * width;
      const screenY = (-this._projected.y * 0.5 + 0.5) * height;

      // 边缘与右侧面板遮挡剔除
      if (screenX < -60 || screenX > maxVisibleX || screenY < -60 || screenY > height + 60) {
        if (pin.style.display !== "none") pin.style.display = "none";
        continue;
      }

      if (pin.style.display !== "flex") pin.style.display = "flex";
      pin.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;

      if (this.activeHotspot?.id === hotspot.id) {
        pin.classList.add("active");
      } else {
        pin.classList.remove("active");
      }
    }
  }

  public get isCardOpen(): boolean {
    return this.activeHotspot !== null;
  }
}
