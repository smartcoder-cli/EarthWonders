import type * as THREE from "three";
import type { Wonder } from "../wonders";

/**
 * 集中管理地球奇迹浏览、飞行与剖析视图的核心状态，
 * 避免散落在主模块中的布尔标记互相冲突。
 */
export class ExplorationState {
  public selectedId: string | null = null;
  public currentWonder: Wonder | null = null;
  public hasArrivedCurrentWonder = false;
  public activePivotPos: THREE.Vector3 | null = null;
  public activeCategory = "all";
  public wireframeOn = false;
  public landmarkNightOn = false;
  public zenModeActive = false;

  /**
   * 切换飞向新地标时重置到达状态与旋转轴心
   */
  public beginVisit(wonder: Wonder): void {
    this.selectedId = wonder.id;
    this.currentWonder = wonder;
    this.hasArrivedCurrentWonder = false;
    this.activePivotPos = null;
  }

  /**
   * 同步巡礼单步切换的状态
   */
  public syncTourStep(wonder: Wonder): void {
    this.beginVisit(wonder);
  }

  /**
   * 标记当前目标地标已飞抵并锁定旋转中心
   */
  public markArrived(wonderId: string, pivot: THREE.Vector3): boolean {
    if (this.selectedId !== wonderId) return false;
    this.hasArrivedCurrentWonder = true;
    this.activePivotPos = pivot;
    return true;
  }

  /**
   * 返回外太空视角，清空所有局部地标聚焦状态
   */
  public resetToSpace(): void {
    this.selectedId = null;
    this.currentWonder = null;
    this.hasArrivedCurrentWonder = false;
    this.activePivotPos = null;
  }
}
