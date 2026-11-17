import type tellux from "tellux";
import type { FlightController } from "./flight";
import { waitForMapTiles } from "./tileOptimization";
import { WONDERS, type Wonder } from "./wonders";

export interface TourManagerConfig {
  viewer: InstanceType<typeof tellux.Viewer>;
  flightController: FlightController;
  btnTour: HTMLButtonElement | null;
  onWonderStep: (wonder: Wonder) => void;
  onStatusChange: (text: string) => void;
  onTourEnded: () => void;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export class TourManager {
  private viewer: InstanceType<typeof tellux.Viewer>;
  private flight: FlightController;
  private btnTour: HTMLButtonElement | null;
  private onWonderStep: (wonder: Wonder) => void;
  private onStatusChange: (text: string) => void;
  private onTourEnded: () => void;

  private _isTouring = false;
  private tourGeneration = 0;

  constructor(config: TourManagerConfig) {
    this.viewer = config.viewer;
    this.flight = config.flightController;
    this.btnTour = config.btnTour;
    this.onWonderStep = config.onWonderStep;
    this.onStatusChange = config.onStatusChange;
    this.onTourEnded = config.onTourEnded;
  }

  public get isTouring(): boolean {
    return this._isTouring;
  }

  public async runTour(category = "all"): Promise<void> {
    if (this.flight.isFlying) return;
    this.stopTour();

    this._isTouring = true;
    const generation = ++this.tourGeneration;
    if (this.btnTour) {
      this.btnTour.classList.add("active");
      this.btnTour.textContent = "巡礼中…";
    }
    this.onStatusChange("开始环球巡礼");

    const tourList = category === "all" ? WONDERS : WONDERS.filter((w) => w.category === category);

    for (const wonder of tourList) {
      if (!this._isTouring || generation !== this.tourGeneration) break;
      this.onWonderStep(wonder);
      this.onStatusChange(`巡礼 ${wonder.index}/${WONDERS.length} · ${wonder.nameZh}`);

      await this.flight.flyToWonder(wonder, true);
      if (!this._isTouring || generation !== this.tourGeneration) break;

      this.onStatusChange(`等待地图加载 · ${wonder.nameZh}`);
      await waitForMapTiles(this.viewer, () => this._isTouring && generation === this.tourGeneration);
      if (!this._isTouring || generation !== this.tourGeneration) break;

      this.onStatusChange(`巡礼 ${wonder.index}/${WONDERS.length} · ${wonder.nameZh}`);
      await sleep(6500);
    }

    if (generation === this.tourGeneration) {
      this.stopTour();
      this.onStatusChange("巡礼结束 · 可继续点选遗址");
      this.onTourEnded();
    }
  }

  public stopTour(): void {
    if (this._isTouring) {
      this._isTouring = false;
      this.tourGeneration += 1;
      if (this.btnTour) {
        this.btnTour.classList.remove("active");
        this.btnTour.textContent = "环球巡礼";
      }
      this.onTourEnded();
    }
  }
}
