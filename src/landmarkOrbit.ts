import * as THREE from "three";
import type tellux from "tellux";
import { resetControlsInertia } from "./controlsCompat";
import type { Wonder } from "./wonders";

export type ViewPreset = "golden" | "topdown" | "eyelevel";

export interface LandmarkOrbitConfig {
  viewer: InstanceType<typeof tellux.Viewer>;
  container: HTMLElement;
  onViewChange?: (heading: number, pitch: number, distance: number) => void;
  onResetRequested?: () => void;
}

export class LandmarkOrbitManager {
  private viewer: InstanceType<typeof tellux.Viewer>;
  private container: HTMLElement;
  private onViewChange?: (heading: number, pitch: number, distance: number) => void;
  private onResetRequested?: () => void;

  private currentWonder: Wonder | null = null;
  private pivotPos = new THREE.Vector3();
  private originalPivot = new THREE.Vector3();

  // 坐标系基向量 (当地椭球切面 ENU)
  private _up = new THREE.Vector3();
  private _north = new THREE.Vector3();
  private _east = new THREE.Vector3();

  // 当前与目标姿态状态
  private currentDist = 150;
  private targetDist = 150;
  private currentHeading = 0; // 度 (0 = 北, 90 = 东, 180 = 南, 270 = 西)
  private targetHeading = 0;
  private currentPitch = -15; // 度 (俯视通常为 -10 到 -85)
  private targetPitch = -15;

  private minDistance = 20;
  private maxDistance = 1500;
  private minPitch = -88; // 垂直正顶
  private maxPitch = 5; // 稍微仰视，防钻地

  private isActiveState = false;
  private isPointerDown = false;
  private activePointerId: number | null = null;
  private activePointers = new Map<number, { x: number; y: number }>();
  private pointerButton = 0;
  private lastPointerPos = { x: 0, y: 0 };
  private initialPinchDist = 0;
  private initialPinchZoom = 150;

  // 临时向量
  private _camPos = new THREE.Vector3();
  private _dir = new THREE.Vector3();
  private _horiz = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _upCam = new THREE.Vector3();
  private _look = new THREE.Vector3();
  private _tempVec = new THREE.Vector3();

  // UI 元素引用
  private uiRoot: HTMLElement | null = null;
  private compassDial: HTMLElement | null = null;
  private distLabel: HTMLElement | null = null;
  private presetButtons: Record<ViewPreset, HTMLElement | null> = {
    golden: null,
    topdown: null,
    eyelevel: null,
  };

  constructor(config: LandmarkOrbitConfig) {
    this.viewer = config.viewer;
    this.container = config.container;
    this.onViewChange = config.onViewChange;
    this.onResetRequested = config.onResetRequested;

    this.bindDOMEvents();
    this.createUI();
  }

  public get isActive(): boolean {
    return this.isActiveState;
  }

  public get heading(): number {
    return this.currentHeading;
  }

  public get pitch(): number {
    return this.currentPitch;
  }

  public get distance(): number {
    return this.currentDist;
  }

  /**
   * 激活地标检视模式，锁定建筑质心
   */
  public activate(wonder: Wonder, pivot: THREE.Vector3): void {
    this.currentWonder = wonder;
    this.pivotPos.copy(pivot);
    this.originalPivot.copy(pivot);

    // 计算当地基底向量 (Up, North, East)
    this.computeLocalBasis(pivot);

    // 根据当前相机真实位置，逆解当前 heading, pitch, distance
    const camera = this.viewer.camera.raw;
    this._camPos.copy(camera.position);
    this._dir.subVectors(this._camPos, this.pivotPos);
    const dist = this._dir.length();

    this.minDistance = Math.max(15, (wonder.flyDistance ?? 150) * 0.15);
    this.maxDistance = Math.min(2500, (wonder.flyDistance ?? 150) * 5.0);

    this.currentDist = THREE.MathUtils.clamp(dist, this.minDistance, this.maxDistance);
    this.targetDist = this.currentDist;

    // 逆解 pitch (elevation)
    const sinElev = THREE.MathUtils.clamp(this._dir.dot(this._up) / (dist || 1), -1, 1);
    const elevRad = Math.asin(sinElev);
    this.currentPitch = THREE.MathUtils.clamp(-THREE.MathUtils.radToDeg(elevRad), this.minPitch, this.maxPitch);
    this.targetPitch = this.currentPitch;

    // 逆解 heading
    this._horiz.copy(this._dir).addScaledVector(this._up, -this._dir.dot(this._up));
    if (this._horiz.lengthSq() > 1e-4) {
      this._horiz.normalize();
      const cosH = -this._horiz.dot(this._north);
      const sinH = -this._horiz.dot(this._east);
      let hDeg = THREE.MathUtils.radToDeg(Math.atan2(sinH, cosH));
      if (hDeg < 0) hDeg += 360;
      this.currentHeading = hDeg;
    } else {
      this.currentHeading = wonder.flyHeading ?? 0;
    }
    this.targetHeading = this.currentHeading;

    // 暂时接管 Tellux 原生控制器
    this.viewer.controls.enabled = false;
    resetControlsInertia(this.viewer);

    this.isActiveState = true;
    if (this.uiRoot) {
      this.uiRoot.classList.remove("hidden");
      this.uiRoot.classList.add("visible");
    }
    if (typeof document !== "undefined") {
      const dockPresets = document.getElementById("dock-camera-presets");
      const dockDivider = document.getElementById("dock-camera-divider");
      dockPresets?.classList.remove("hidden");
      dockDivider?.classList.remove("hidden");
    }

    this.updatePresetActiveState("golden");
  }

  /**
   * 退出地标模式，平滑归还控制权给全局漫游控制器
   */
  public deactivate(): void {
    if (!this.isActiveState) return;
    this.isActiveState = false;
    this.currentWonder = null;
    this.activePointers.clear();
    this.isPointerDown = false;

    if (this.uiRoot) {
      this.uiRoot.classList.remove("visible");
      this.uiRoot.classList.add("hidden");
    }
    if (typeof document !== "undefined") {
      const dockPresets = document.getElementById("dock-camera-presets");
      const dockDivider = document.getElementById("dock-camera-divider");
      dockPresets?.classList.add("hidden");
      dockDivider?.classList.add("hidden");
    }

    // 归还 Tellux 原生控制器
    this.viewer.controls.enabled = true;
    resetControlsInertia(this.viewer);
  }

  /**
   * 计算指定点在地球椭球表面的局部切空间基底 (ENU: East-North-Up)
   */
  private computeLocalBasis(point: THREE.Vector3): void {
    // 表面法线 (Up)
    const rawControls = (this.viewer.controls as unknown as { raw?: { getUpDirection?: (pt: THREE.Vector3, res: THREE.Vector3) => void } })?.raw
      ?? (this.viewer.controls as unknown as { getUpDirection?: (pt: THREE.Vector3, res: THREE.Vector3) => void });

    if (typeof rawControls?.getUpDirection === "function") {
      rawControls.getUpDirection(point, this._up);
    } else {
      this._up.copy(point).normalize();
    }

    // 地球自转轴极向为世界坐标系 (0, 0, 1) [WGS84 Height 轴]
    const earthPolarAxis = new THREE.Vector3(0, 0, 1);
    // 若点接近两极，则采用替代轴
    if (Math.abs(this._up.dot(earthPolarAxis)) > 0.999) {
      earthPolarAxis.set(0, 1, 0);
    }

    // 北向切线向量：将极轴投影到地表切平面
    this._north.copy(earthPolarAxis).addScaledVector(this._up, -earthPolarAxis.dot(this._up)).normalize();

    // 东向切线向量：East = North × Up
    this._east.crossVectors(this._north, this._up).normalize();
  }

  /**
   * 快捷构图预设切换
   */
  public setPreset(preset: ViewPreset): void {
    if (!this.currentWonder) return;

    if (preset === "golden") {
      this.targetHeading = this.currentWonder.flyHeading ?? this.currentHeading;
      this.targetPitch = this.currentWonder.flyPitch ?? -16;
      this.targetDist = this.currentWonder.flyDistance ?? 150;
      this.pivotPos.copy(this.originalPivot);
    } else if (preset === "topdown") {
      this.targetPitch = -88; // 垂直正顶俯视
      this.targetDist = (this.currentWonder.flyDistance ?? 150) * 1.35;
    } else if (preset === "eyelevel") {
      this.targetPitch = -2; // 地表人眼仰视
      this.targetDist = Math.max(this.minDistance, (this.currentWonder.flyDistance ?? 150) * 0.65);
    }

    this.updatePresetActiveState(preset);
  }

  /**
   * 罗盘点击一键回正正北
   */
  public alignNorth(): void {
    // 寻找最近的 0° / 360° 目标
    const currentNorm = ((this.currentHeading % 360) + 360) % 360;
    if (currentNorm > 180) {
      this.targetHeading = this.currentHeading + (360 - currentNorm);
    } else {
      this.targetHeading = this.currentHeading - currentNorm;
    }
  }

  /**
   * 步进推拉距离
   */
  public zoomBy(deltaDist: number): void {
    this.targetDist = THREE.MathUtils.clamp(this.targetDist + deltaDist, this.minDistance, this.maxDistance);
  }

  /**
   * 帧更新：平滑插值镜头位置与姿态并同步 UI
   */
  public update(deltaTime: number): void {
    if (!this.isActiveState || !this.currentWonder) return;

    const dt = Math.min(deltaTime, 0.08);
    const lerpFactor = 1.0 - Math.exp(-12.0 * dt);

    // 平滑插值 (EMA 阻尼)
    this.currentDist = THREE.MathUtils.lerp(this.currentDist, this.targetDist, lerpFactor);
    this.currentHeading = THREE.MathUtils.lerp(this.currentHeading, this.targetHeading, lerpFactor);
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, lerpFactor);

    // 根据 (Heading, Pitch, Dist) 计算当地空间位置
    const hRad = THREE.MathUtils.degToRad(this.currentHeading);
    const elevDeg = -this.currentPitch;
    const elevRad = THREE.MathUtils.degToRad(elevDeg);

    // 水平方向向量 (由目标指向相机的反向视线方向)
    this._horiz
      .copy(this._north)
      .multiplyScalar(-Math.cos(hRad))
      .addScaledVector(this._east, -Math.sin(hRad));

    // 综合俯仰高度的单位视线方向
    this._dir
      .copy(this._horiz)
      .multiplyScalar(Math.cos(elevRad))
      .addScaledVector(this._up, Math.sin(elevRad))
      .normalize();

    // 计算相机世界坐标并定位
    const camera = this.viewer.camera.raw;
    camera.position.copy(this.pivotPos).addScaledVector(this._dir, this.currentDist);

    // 严密构造正交旋转矩阵，锁定地球地表水平地平线
    this._look.subVectors(this.pivotPos, camera.position).normalize();
    this._right.crossVectors(this._look, this._up).normalize();
    this._upCam.crossVectors(this._right, this._look).normalize();

    camera.matrix.makeBasis(this._right, this._upCam, this._tempVec.copy(this._look).negate());
    camera.matrix.setPosition(camera.position);
    camera.quaternion.setFromRotationMatrix(camera.matrix);
    camera.updateMatrixWorld(true);

    // 同步刷新 UI 罗盘与距离标签
    if (this.compassDial) {
      const needleAngle = -this.currentHeading;
      this.compassDial.style.transform = `rotate(${needleAngle.toFixed(1)}deg)`;
    }
    if (this.distLabel) {
      this.distLabel.textContent = `${Math.round(this.currentDist)} m`;
    }

    this.onViewChange?.(this.currentHeading, this.currentPitch, this.currentDist);
  }

  private updatePresetActiveState(activeKey: ViewPreset | null): void {
    for (const [key, el] of Object.entries(this.presetButtons)) {
      if (el) {
        el.classList.toggle("active", key === activeKey);
      }
    }
  }

  /**
   * 绑定手势交互事件：左键 360° 环视、滚轮线性推拉、右键切面平移、移动端多指手势
   */
  private bindDOMEvents(): void {
    if (typeof window === "undefined" || !this.container || typeof this.container.addEventListener !== "function") return;
    const el = this.container;

    // 滚轮推拉
    el.addEventListener(
      "wheel",
      (e) => {
        if (!this.isActiveState) return;
        e.preventDefault();
        e.stopPropagation();

        const zoomDelta = e.deltaY;
        const speed = Math.max(0.04, this.targetDist * 0.001);
        const delta = Math.sign(zoomDelta) * Math.min(Math.abs(zoomDelta), 100) * speed * 2.0;

        this.targetDist = THREE.MathUtils.clamp(this.targetDist + delta, this.minDistance, this.maxDistance);
        this.updatePresetActiveState(null);
      },
      { passive: false }
    );

    // 指针按下 (PointerDown)
    el.addEventListener("pointerdown", (e) => {
      if (!this.isActiveState) return;

      // 如果点击在 UI 浮层上，不拦截
      if ((e.target as HTMLElement).closest(".viewport-controls") || (e.target as HTMLElement).closest(".hud") || (e.target as HTMLElement).closest(".solar-dock")) {
        return;
      }

      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activePointers.size === 1) {
        this.isPointerDown = true;
        this.activePointerId = e.pointerId;
        this.pointerButton = e.button;
        this.lastPointerPos.x = e.clientX;
        this.lastPointerPos.y = e.clientY;
      } else if (this.activePointers.size === 2) {
        // 双指触控开始 (Pinch / Pan)
        const pts = Array.from(this.activePointers.values());
        this.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.initialPinchZoom = this.targetDist;
      }
    });

    // 指针移动 (PointerMove)
    window.addEventListener("pointermove", (e) => {
      if (!this.isActiveState || !this.isPointerDown) return;

      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // 双指触控：缩放 + 平移
      if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        const currentPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this.initialPinchDist > 5) {
          const ratio = currentPinchDist / this.initialPinchDist;
          this.targetDist = THREE.MathUtils.clamp(this.initialPinchZoom / ratio, this.minDistance, this.maxDistance);
        }
        return;
      }

      // 单指 / 鼠标单键移动
      if (e.pointerId !== this.activePointerId) return;

      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      this.lastPointerPos.x = e.clientX;
      this.lastPointerPos.y = e.clientY;

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        this.updatePresetActiveState(null);
      }

      // 鼠标右键 (2) 或中键 (1) -> 切平面平移 (Pan)
      if (this.pointerButton === 2 || this.pointerButton === 1) {
        const panSpeed = this.currentDist * 0.0016;
        this.pivotPos.addScaledVector(this._right, -dx * panSpeed);
        this.pivotPos.addScaledVector(this._upCam, dy * panSpeed);
        return;
      }

      // 默认（鼠标左键或单指触摸）-> 360° 轨道环视 (Orbit)
      const rotSpeed = 0.35;
      this.targetHeading = (this.targetHeading - dx * rotSpeed + 3600) % 360;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy * rotSpeed, this.minPitch, this.maxPitch);
    });

    // 指针抬起 / 取消
    const handlePointerUp = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size === 0) {
        this.isPointerDown = false;
        this.activePointerId = null;
      } else if (this.activePointers.size === 1) {
        const remaining = this.activePointers.keys().next().value;
        if (remaining !== undefined) {
          this.activePointerId = remaining;
          const pos = this.activePointers.get(remaining)!;
          this.lastPointerPos.x = pos.x;
          this.lastPointerPos.y = pos.y;
        }
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    // 键盘快捷键 (F 键复位)
    window.addEventListener("keydown", (e) => {
      if (!this.isActiveState) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        this.setPreset("golden");
        this.onResetRequested?.();
      }
    });
  }

  /**
   * 构建并注入视口悬浮操控工具条 DOM (独立罗盘仪 + 底部控制台机位联动)
   */
  private createUI(): void {
    if (typeof document === "undefined") return;
    let controlsDiv = document.getElementById("viewport-controls");
    if (!controlsDiv) {
      controlsDiv = document.createElement("aside");
      controlsDiv.id = "viewport-controls";
      controlsDiv.className = "viewport-controls hidden";
      controlsDiv.innerHTML = `
        <!-- 独立视口 3D 罗盘仪 (Compass Gizmo) -->
        <button id="compass-gizmo" class="compass-gizmo" type="button" title="点击罗盘回正正北朝上 (North) [N]">
          <div class="compass-dial" id="compass-dial">
            <div class="compass-needle-n">N</div>
            <div class="compass-arrow-north"></div>
            <div class="compass-needle-s">S</div>
            <div class="compass-needle-w">W</div>
            <div class="compass-needle-e">E</div>
            <div class="compass-axis"></div>
          </div>
        </button>
      `;
      document.body.appendChild(controlsDiv);
    }
    this.uiRoot = controlsDiv;
    this.compassDial = document.getElementById("compass-dial");
    this.distLabel = document.getElementById("zoom-dist-label");

    // 绑定底部统一控制台机位预设按钮
    this.presetButtons.golden = document.getElementById("dock-preset-golden") ?? document.getElementById("btn-preset-golden");
    this.presetButtons.topdown = document.getElementById("dock-preset-top") ?? document.getElementById("btn-preset-top");
    this.presetButtons.eyelevel = document.getElementById("dock-preset-eye") ?? document.getElementById("btn-preset-eye");

    // 罗盘事件绑定
    document.getElementById("compass-gizmo")?.addEventListener("click", () => this.alignNorth());

    // 底部机位预设事件绑定
    this.presetButtons.golden?.addEventListener("click", () => this.setPreset("golden"));
    this.presetButtons.topdown?.addEventListener("click", () => this.setPreset("topdown"));
    this.presetButtons.eyelevel?.addEventListener("click", () => this.setPreset("eyelevel"));

    document.getElementById("dock-preset-reset")?.addEventListener("click", () => {
      this.setPreset("golden");
      this.onResetRequested?.();
    });
    document.getElementById("btn-reset-view")?.addEventListener("click", () => {
      this.setPreset("golden");
      this.onResetRequested?.();
    });
  }

  public destroy(): void {
    this.deactivate();
    this.uiRoot?.remove();
  }
}
