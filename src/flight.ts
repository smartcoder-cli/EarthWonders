import * as THREE from "three";
import type tellux from "tellux";
import { resetControlsInertia, setControlsEnabled, updateControlsPivot } from "./controlsCompat";
import { setTilesetFlightMode } from "./tileOptimization";
import { SPACE_VIEW, type Wonder } from "./wonders";

export interface FlightControllerConfig {
  viewer: InstanceType<typeof tellux.Viewer>;
  btnTour: HTMLButtonElement | null;
  btnSpace: HTMLButtonElement | null;
  viewerContainer: HTMLElement | null;
  onFlightStateChange?: (flying: boolean) => void;
  onLandmarkArrived?: (wonder: Wonder, pivotPos: THREE.Vector3) => void;
}

export class FlightController {
  private viewer: InstanceType<typeof tellux.Viewer>;
  private btnTour: HTMLButtonElement | null;
  private btnSpace: HTMLButtonElement | null;
  private viewerContainer: HTMLElement | null;
  private onFlightStateChange?: (flying: boolean) => void;
  private onLandmarkArrived?: (wonder: Wonder, pivotPos: THREE.Vector3) => void;

  private _isFlying = false;
  private flightGeneration = 0;

  constructor(config: FlightControllerConfig) {
    this.viewer = config.viewer;
    this.btnTour = config.btnTour;
    this.btnSpace = config.btnSpace;
    this.viewerContainer = config.viewerContainer;
    this.onFlightStateChange = config.onFlightStateChange;
    this.onLandmarkArrived = config.onLandmarkArrived;
  }

  public get isFlying(): boolean {
    return this._isFlying;
  }

  public setFlying(flying: boolean, isTouring = false): void {
    this._isFlying = flying;
    if (this.btnTour) this.btnTour.disabled = flying && !isTouring;
    if (this.btnSpace) this.btnSpace.disabled = flying && !isTouring;
    if (this.viewerContainer) {
      this.viewerContainer.style.pointerEvents = flying ? "none" : "";
    }
    setTilesetFlightMode(this.viewer, flying);
    this.onFlightStateChange?.(flying);
  }

  public flyToSpace(isTouring = false): Promise<void> {
    const flight = ++this.flightGeneration;
    this.setFlying(true, isTouring);
    setControlsEnabled(this.viewer, false);

    return new Promise((resolve) => {
      this.viewer.camera.flyTo({
        destination: {
          longitude: SPACE_VIEW.longitude,
          latitude: SPACE_VIEW.latitude,
          height: SPACE_VIEW.height,
        },
        orientation: {
          heading: SPACE_VIEW.heading,
          pitch: SPACE_VIEW.pitch,
          roll: SPACE_VIEW.roll,
        },
        duration: 3.2,
        maximumHeight: 20_000_000,
        complete: () => {
          if (flight === this.flightGeneration) {
            updateControlsPivot(this.viewer, new THREE.Vector3(0, 0, 0));
            resetControlsInertia(this.viewer);
            this.setFlying(false, isTouring);
            setControlsEnabled(this.viewer, true);
          }
          resolve();
        },
        cancel: () => {
          if (flight === this.flightGeneration) {
            resetControlsInertia(this.viewer);
            this.setFlying(false, isTouring);
            setControlsEnabled(this.viewer, true);
          }
          resolve();
        },
      });
    });
  }

  public flyToWonder(wonder: Wonder, isTouring = false): Promise<THREE.Vector3 | null> {
    const flight = ++this.flightGeneration;
    this.setFlying(true, isTouring);
    setControlsEnabled(this.viewer, false);

    return new Promise((resolve) => {
      this.viewer.flyToTarget(
        {
          longitude: wonder.longitude,
          latitude: wonder.latitude,
          height: wonder.lookHeight ?? 24,
        },
        {
          offset: {
            heading: wonder.flyHeading,
            pitch: wonder.flyPitch,
            distance: wonder.flyDistance,
          },
          duration: wonder.flyDuration,
          maximumHeight: 8_500_000,
          complete: () => {
            let activePivot: THREE.Vector3 | null = null;
            if (flight === this.flightGeneration) {
              try {
                const targetMat = new THREE.Matrix4();
                this.viewer.cartographicToMatrix4(
                  [wonder.longitude, wonder.latitude, wonder.lookHeight ?? 24],
                  {},
                  targetMat,
                );
                activePivot = new THREE.Vector3().setFromMatrixPosition(targetMat);
                updateControlsPivot(this.viewer, activePivot);
                this.onLandmarkArrived?.(wonder, activePivot);
              } catch (err) {
                console.debug("Cartographic conversion error:", err);
              }
              resetControlsInertia(this.viewer);
              this.setFlying(false, isTouring);
              setControlsEnabled(this.viewer, true);
            }
            resolve(activePivot);
          },
          cancel: () => {
            if (flight === this.flightGeneration) {
              resetControlsInertia(this.viewer);
              this.setFlying(false, isTouring);
              setControlsEnabled(this.viewer, true);
            }
            resolve(null);
          },
        },
      );
    });
  }
}
