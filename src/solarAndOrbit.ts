import * as THREE from "three";
import type tellux from "tellux";
import type { Wonder } from "./wonders";

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
  private speedDegPerSec = 4.5; // 电影级慢速航拍速度
  private onStateChange?: (isOrbiting: boolean) => void;

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

    // 当用户在画布上手动拖动鼠标交互时，优雅暂停/退出无人机航拍
    viewer.controls.addEventListener("start", () => {
      if (this.isOrbitingState) {
        this.stop();
      }
    });
  }

  public start(wonder: Wonder, pivot: THREE.Vector3) {
    this.currentWonder = wonder;
    this.pivotPos.copy(pivot);
    this.isOrbitingState = true;
    this.syncPivot();
    this.onStateChange?.(true);
  }

  public stop() {
    if (this.isOrbitingState) {
      this.isOrbitingState = false;
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
    const clampedDelta = Math.min(deltaTime, 0.1);
    const deltaAngleRad = THREE.MathUtils.degToRad(this.speedDegPerSec * clampedDelta);

    const rawControls = (this.viewer.controls as unknown as {
      raw?: {
        _applyRotation?: (x: number, y: number, pivotPoint: THREE.Vector3) => void;
        getUpDirection?: (point: THREE.Vector3, target: THREE.Vector3) => void;
        rotationSpeed?: number;
        pivotPoint?: THREE.Vector3;
      };
      _applyRotation?: (x: number, y: number, pivotPoint: THREE.Vector3) => void;
      getUpDirection?: (point: THREE.Vector3, target: THREE.Vector3) => void;
      rotationSpeed?: number;
      pivotPoint?: THREE.Vector3;
    });
    const ctrl = rawControls.raw ?? rawControls;

    // 优先使用 GlobeControls 原生 _applyRotation（与用户右键拖动完全同源，保持地平姿态与地表椭球法线严密一致）
    if (typeof ctrl?._applyRotation === "function") {
      const rotSpeed = ctrl.rotationSpeed || 1;
      // 在 EnvironmentControls._applyRotation 中：azimuth = - x * rotationSpeed
      // 传入 x = - deltaAngleRad / rotSpeed，使方位角平滑转动，绝不破坏地平姿态
      ctrl._applyRotation(-deltaAngleRad / rotSpeed, 0, this.pivotPos);
      return;
    }

    // 回退方案：通过严格的空间四元数沿当地椭球法线旋转相机世界矩阵，绝不调用 camera.lookAt 避免上下颠倒
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
  }
}
