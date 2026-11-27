import * as THREE from "three";
import type tellux from "tellux";
import type { Wonder } from "./wonders";
import { setTilesetOrbitMode } from "./tileOptimization";

export type SolarPreset = "realtime" | "dawn" | "noon" | "golden" | "night";

export const SOLAR_PRESET_HOURS: Record<Exclude<SolarPreset, "realtime">, number> = {
  dawn: 6.0,      // 晨曦：清晨第一缕阳光横扫地平线
  noon: 12.0,     // 正午：阳光当空，建筑明暗分明
  golden: 17.75,  // 黄金时刻：斜阳夕照，暖橙与长影
  night: 22.5,    // 静谧夜景：深邃星空与宁静轮廓
};

export class SolarController {
  private viewer: InstanceType<typeof tellux.Viewer>;
  private currentWonder: Wonder | null = null;
  private isTimelapseRunning = false;
  private isRealtime = false;
  private onTimeChanged?: (hour: number, isRealtime: boolean) => void;

  constructor(viewer: InstanceType<typeof tellux.Viewer>, onTimeChanged?: (hour: number, isRealtime: boolean) => void) {
    this.viewer = viewer;
    this.onTimeChanged = onTimeChanged;

    // 默认时间设为正午 12:00 确保初入时光照明亮
    this.setPreset("noon");

    // 监听时钟 tick，若处于延时摄影或实时追踪状态，同步更新滑块位置与时间显示
    this.viewer.clock.on("tick", () => {
      if ((this.isTimelapseRunning || this.isRealtime) && this.onTimeChanged) {
        this.onTimeChanged(this.getLocalSolarHour(), this.isRealtime);
      }
    });
  }

  public setWonder(wonder: Wonder | null) {
    this.currentWonder = wonder;
    // 处于实时状态则保持现实时间，否则自动切到当地正午
    if (this.isRealtime) {
      this.setRealtime();
    } else {
      this.setPreset("noon");
    }
  }

  public setRealtime() {
    this.stopTimelapse();
    this.isRealtime = true;
    this.viewer.clock.currentTime = new Date();
    this.viewer.clock.multiplier = 1;
    this.viewer.clock.shouldAnimate = true;
    if (this.onTimeChanged) {
      this.onTimeChanged(this.getLocalSolarHour(), true);
    }
  }

  public setPreset(preset: SolarPreset) {
    if (preset === "realtime") {
      this.setRealtime();
      return;
    }
    const hour = SOLAR_PRESET_HOURS[preset];
    this.setLocalSolarHour(hour);
  }

  public setLocalSolarHour(localHour: number) {
    this.isRealtime = false;
    this.stopTimelapse();
    const date = new Date(this.viewer.clock.currentTime);
    const lon = this.currentWonder?.longitude ?? 0;
    // 经度与时差：经度每 15° 为 1 小时
    const offsetHours = lon / 15.0;
    const utcHour = (localHour - offsetHours + 48) % 24;

    const hourPart = Math.floor(utcHour);
    const minPart = Math.floor((utcHour - hourPart) * 60);
    date.setUTCHours(hourPart, minPart, 0, 0);

    this.viewer.clock.currentTime = date;
    this.viewer.clock.multiplier = 1;
    this.viewer.clock.shouldAnimate = false;

    if (this.onTimeChanged) {
      this.onTimeChanged(localHour, false);
    }
  }

  public getLocalSolarHour(): number {
    const date = this.viewer.clock.currentTime;
    const lon = this.currentWonder?.longitude ?? 0;
    const offsetHours = lon / 15.0;
    const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60.0 + date.getUTCSeconds() / 3600.0;
    return (utcHour + offsetHours + 48) % 24;
  }

  public toggleTimelapse(): boolean {
    this.isTimelapseRunning = !this.isTimelapseRunning;
    if (this.isTimelapseRunning) {
      this.isRealtime = false;
      this.viewer.clock.multiplier = 1800; // 1秒 = 30分钟，48秒完成一日
      this.viewer.clock.shouldAnimate = true;
    } else {
      this.viewer.clock.shouldAnimate = false;
      this.viewer.clock.multiplier = 1;
    }
    return this.isTimelapseRunning;
  }

  public stopTimelapse() {
    if (this.isTimelapseRunning) {
      this.isTimelapseRunning = false;
      this.viewer.clock.shouldAnimate = this.isRealtime;
      this.viewer.clock.multiplier = 1;
    }
  }

  public get isPlaying(): boolean {
    return this.isTimelapseRunning;
  }

  public get isLive(): boolean {
    return this.isRealtime;
  }
}

export class DroneOrbitController {
  private viewer: InstanceType<typeof tellux.Viewer>;
  private isOrbitingState = false;
  private currentWonder: Wonder | null = null;
  private pivotPos: THREE.Vector3 = new THREE.Vector3();
  private speedDegPerSec = 8.0; // 黄金电影级航拍速率（一圈约 45 秒，流畅舒适）
  private onStateChange?: (isOrbiting: boolean) => void;
  private _smoothedDt = 0.016;

  private _up = new THREE.Vector3();
  private _quat = new THREE.Quaternion();
  private _rotMat = new THREE.Matrix4();
  private _mQuat = new THREE.Matrix4();
  private _mTrans = new THREE.Matrix4();
  private _scale = new THREE.Vector3();

  constructor(
    viewer: InstanceType<typeof tellux.Viewer>,
    onStateChange?: (isOrbiting: boolean) => void,
  ) {
    this.viewer = viewer;
    this.onStateChange = onStateChange;

    // 当用户在画布上手动交互（指针按下、滚轮滑动、移动端触控）时，即刻平滑交出控制权并退出航拍
    const dom = (viewer as any).domElement ?? viewer.renderer?.raw?.domElement;
    if (dom && typeof dom.addEventListener === "function") {
      const handleUserGesture = () => {
        if (this.isOrbitingState) {
          this.stop();
        }
      };
      dom.addEventListener("pointerdown", handleUserGesture, { capture: true });
      dom.addEventListener("wheel", handleUserGesture, { passive: true, capture: true });
      dom.addEventListener("touchstart", handleUserGesture, { passive: true, capture: true });
    }
  }

  public start(wonder: Wonder, pivot: THREE.Vector3) {
    this.currentWonder = wonder;
    this.pivotPos.copy(pivot);
    this.isOrbitingState = true;
    this._smoothedDt = 0.016;
    setTilesetOrbitMode(this.viewer, true);
    this.syncPivot();
    this.onStateChange?.(true);
  }

  public stop() {
    if (this.isOrbitingState) {
      this.isOrbitingState = false;
      setTilesetOrbitMode(this.viewer, false);
      this.onStateChange?.(false);
    }
  }

  public toggle(wonder: Wonder | null, pivot: THREE.Vector3 | null): boolean {
    if (this.isOrbitingState) {
      this.stop();
      return false;
    }
    if (wonder && pivot) {
      this.start(wonder, pivot);
      return true;
    }
    return false;
  }

  public get isOrbiting(): boolean {
    return this.isOrbitingState;
  }

  private syncPivot() {
    try {
      const rawControls = (this.viewer.controls as unknown as {
        raw?: { pivotPoint?: THREE.Vector3; pivotMesh?: THREE.Object3D };
        pivotPoint?: THREE.Vector3;
        pivotMesh?: THREE.Object3D;
      });
      const ctrl = rawControls.raw ?? rawControls;
      if (ctrl?.pivotPoint) {
        ctrl.pivotPoint.copy(this.pivotPos);
        ctrl.pivotMesh?.position.copy(this.pivotPos);
      }
    } catch {
      // 忽略非致命同步异常
    }
  }

  public update(deltaTime: number) {
    if (!this.isOrbitingState || !this.currentWonder) return;

    const camera = this.viewer.camera.raw;
    // 动态滤波平滑（EMA filter）：过滤偶发 GC 或单帧纹理上传卡顿，限制最大步长杜绝镜头突兀“瞬移”
    const clampedDelta = Math.min(deltaTime, 0.04);
    this._smoothedDt = this._smoothedDt * 0.82 + clampedDelta * 0.18;
    const deltaAngleRad = THREE.MathUtils.degToRad(this.speedDegPerSec * this._smoothedDt);

    const rawControls = (this.viewer.controls as unknown as {
      raw?: {
        _applyRotation?: (x: number, y: number, pivotPoint: THREE.Vector3) => void;
        getUpDirection?: (point: THREE.Vector3, target: THREE.Vector3) => void;
        rotationSpeed?: number;
        pivotPoint?: THREE.Vector3;
        rotationInertia?: THREE.Vector2;
        dragInertia?: THREE.Vector3;
        globeInertia?: THREE.Matrix4;
      };
      _applyRotation?: (x: number, y: number, pivotPoint: THREE.Vector3) => void;
      getUpDirection?: (point: THREE.Vector3, target: THREE.Vector3) => void;
      rotationSpeed?: number;
      pivotPoint?: THREE.Vector3;
      rotationInertia?: THREE.Vector2;
      dragInertia?: THREE.Vector3;
      globeInertia?: THREE.Matrix4;
    });
    const ctrl = rawControls.raw ?? rawControls;

    // 优先使用 GlobeControls 原生 _applyRotation（若存在则使用）
    if (typeof ctrl?._applyRotation === "function") {
      const rotSpeed = ctrl.rotationSpeed || 1;
      ctrl._applyRotation(-deltaAngleRad / rotSpeed, 0, this.pivotPos);
      return;
    }

    // 通过严格空间四元数沿当地椭球表面法线旋转相机世界矩阵，锁定地平姿态
    if (typeof ctrl?.getUpDirection === "function") {
      ctrl.getUpDirection(this.pivotPos, this._up);
    } else {
      this._up.copy(this.pivotPos).normalize();
    }

    this._quat.setFromAxisAngle(this._up, deltaAngleRad);

    this._rotMat.makeTranslation(-this.pivotPos.x, -this.pivotPos.y, -this.pivotPos.z);
    this._mQuat.makeRotationFromQuaternion(this._quat);
    this._rotMat.premultiply(this._mQuat);
    this._mTrans.makeTranslation(this.pivotPos.x, this.pivotPos.y, this.pivotPos.z);
    this._rotMat.premultiply(this._mTrans);

    camera.matrixWorld.premultiply(this._rotMat);
    camera.matrixWorld.decompose(camera.position, camera.quaternion, this._scale);
    camera.updateMatrixWorld(true);

    // 同步刷新控制器锚点并清空冲突惯性，确保用户随时接管时画面丝滑无跳跃
    if (ctrl) {
      if (ctrl.pivotPoint) {
        ctrl.pivotPoint.copy(this.pivotPos);
      }
      ctrl.rotationInertia?.set(0, 0);
      ctrl.dragInertia?.set(0, 0, 0);
      ctrl.globeInertia?.identity();
    }
  }
}
