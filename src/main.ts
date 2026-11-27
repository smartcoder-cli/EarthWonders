import * as THREE from "three";
import tellux from "tellux";
import { AtmosphereManager } from "./atmosphereEffects";
import { keepCameraTuned, suppressBlackscreenEffects } from "./controlsCompat";
import { FlightController } from "./flight";
import { HotspotManager } from "./hotspotManager";
import { LandmarkManager } from "./landmarkManager";
import { LandmarkOrbitManager } from "./landmarkOrbit";
import { initLandmarkMarkers, updateMarkerOcclusion, type LandmarkMarkerInfo } from "./markerOcclusion";
import { generatePostcard, showPostcardModal } from "./postcard";
import { DroneOrbitController, SolarController, type SolarPreset } from "./solarAndOrbit";
import { ExplorationState } from "./state/explorationState";
import { loadSurfaceKit } from "./surfaces";
import { configureTilesetOptimization } from "./tileOptimization";
import { installTileProvider } from "./tileProvider";
import { TourManager } from "./tour";
import { DetailPanelController } from "./ui/detailPanel";
import { setupKeyboardShortcuts } from "./ui/keyboard";
import { setupMobileInteractions } from "./ui/mobile";
import { SPACE_VIEW, WONDERS, type Wonder } from "./wonders";

// 启动阶段立即安装智能瓦片提供器拦截器，确保所有地图瓦片请求均受级联与重采样保护
installTileProvider();

const ARCGIS_WORLD_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

// DOM 元素引用
const listEl = document.getElementById("wonder-list");
const panelEl = document.getElementById("panel");
const btnMobileList = document.getElementById("btn-mobile-list");
const btnPanelClose = document.getElementById("btn-panel-close");
const panelGrabber = document.getElementById("panel-grabber");
const detailEl = document.getElementById("detail");
const detailClose = document.getElementById("detail-close");
const detailGrabber = document.getElementById("detail-grabber");
const sheetExpandHint = document.getElementById("sheet-expand-hint");
const detailKicker = document.getElementById("detail-kicker");
const detailTitle = document.getElementById("detail-title");
const detailEn = document.getElementById("detail-en");
const detailBlurb = document.getElementById("detail-blurb");
const comparisonEl = document.getElementById("photo-comparison");
const comparisonImage = document.getElementById("comparison-image") as HTMLImageElement | null;
const comparisonSource = document.getElementById("comparison-source") as HTMLAnchorElement | null;
const comparisonCredit = document.getElementById("comparison-credit");
const statusEl = document.getElementById("status");
const btnTour = document.getElementById("btn-tour") as HTMLButtonElement | null;
const btnSpace = document.getElementById("btn-space") as HTMLButtonElement | null;
const errorBox = document.getElementById("error-box");
const errorMsg = document.getElementById("error-msg");

const btnSolarRealtime = document.getElementById("btn-solar-realtime") as HTMLButtonElement | null;
const btnSolarDawn = document.getElementById("btn-solar-dawn") as HTMLButtonElement | null;
const btnSolarNoon = document.getElementById("btn-solar-noon") as HTMLButtonElement | null;
const btnSolarGolden = document.getElementById("btn-solar-golden") as HTMLButtonElement | null;
const btnSolarNight = document.getElementById("btn-solar-night") as HTMLButtonElement | null;
const solarTimeLabel = document.getElementById("solar-time-label");
const solarSlider = document.getElementById("solar-slider") as HTMLInputElement | null;
const btnTimelapse = document.getElementById("btn-timelapse") as HTMLButtonElement | null;
const btnDroneOrbit = document.getElementById("btn-drone-orbit") as HTMLButtonElement | null;
const btnPostcard = document.getElementById("btn-postcard") as HTMLButtonElement | null;
const hotspotLayer = document.getElementById("hotspot-layer") as HTMLElement | null;
const hotspotCard = document.getElementById("hotspot-card") as HTMLElement | null;

const detailPanel = new DetailPanelController({
  detailEl,
  detailKicker,
  detailTitle,
  detailEn,
  detailBlurb,
  specsEl: document.getElementById("detail-specs"),
  inspectBar: document.getElementById("inspection-bar"),
  comparisonEl,
  comparisonImage,
  comparisonSource,
  comparisonCredit,
  panelEl,
  btnWireframe: document.getElementById("btn-wireframe"),
  btnNightmode: document.getElementById("btn-nightmode"),
  btnMinimize: document.getElementById("detail-minimize"),
  headingRow: document.getElementById("detail-heading-row"),
});

function showError(err: unknown) {
  console.error("EarthWonders initialization failed:", err);
  if (errorBox) errorBox.classList.remove("hidden");
  if (errorMsg) {
    errorMsg.textContent = "加载失败，请检查网络连接后刷新页面重试。";
  }
}

function setStatus(text: string) {
  if (statusEl) statusEl.textContent = text;
}

function formatHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// 核心应用状态
let viewer: InstanceType<typeof tellux.Viewer> | null = null;
const appState = new ExplorationState();
let zenToastTimeout: number | undefined;

function collapsePanel() {
  panelEl?.classList.add("collapsed");
  panelEl?.classList.add("mobile-hidden");
  panelEl?.classList.remove("mobile-open");
}

function expandPanel() {
  panelEl?.classList.remove("collapsed");
  panelEl?.classList.remove("mobile-hidden");
  panelEl?.classList.add("mobile-open");
}

function togglePanel() {
  if (panelEl?.classList.contains("collapsed") || panelEl?.classList.contains("mobile-hidden")) {
    expandPanel();
  } else {
    collapsePanel();
  }
}

function toggleZenMode(forceState?: boolean) {
  appState.zenModeActive = typeof forceState === "boolean" ? forceState : !appState.zenModeActive;
  document.body.classList.toggle("zen-mode", appState.zenModeActive);

  const zenToast = document.getElementById("zen-toast");
  const btnZen = document.getElementById("btn-zen");
  if (btnZen) {
    btnZen.classList.toggle("active", appState.zenModeActive);
  }

  if (appState.zenModeActive) {
    if (zenToast) {
      zenToast.textContent = "已进入沉浸纯享模式 · 按 Z 键或点击任意处退出";
      zenToast.classList.remove("hidden");
      if (zenToastTimeout) window.clearTimeout(zenToastTimeout);
      zenToastTimeout = window.setTimeout(() => {
        zenToast.classList.add("hidden");
        zenToast.textContent = "";
      }, 2600);
    }
  } else {
    if (zenToast) {
      zenToast.classList.add("hidden");
      zenToast.textContent = "";
    }
  }
}

let flightController: FlightController | null = null;
let tourManager: TourManager | null = null;
let landmarkManager: LandmarkManager | null = null;
let hotspotManager: HotspotManager | null = null;
let solarController: SolarController | null = null;
let droneOrbitController: DroneOrbitController | null = null;
let atmosphereManager: AtmosphereManager | null = null;
let landmarkOrbitManager: LandmarkOrbitManager | null = null;
let landmarkMarkerList: LandmarkMarkerInfo[] = [];

function updateUrl(wonderId?: string | null, preset?: string, wireframe?: boolean, orbit?: boolean) {
  try {
    const url = new URL(window.location.href);
    if (wonderId) {
      url.searchParams.set("id", wonderId);
      if (preset && preset !== "noon" && preset !== "realtime") {
        url.searchParams.set("time", preset);
      } else {
        url.searchParams.delete("time");
      }
      if (wireframe) {
        url.searchParams.set("wireframe", "1");
      } else {
        url.searchParams.delete("wireframe");
      }
      if (orbit) {
        url.searchParams.set("orbit", "1");
      } else {
        url.searchParams.delete("orbit");
      }
    } else {
      url.searchParams.delete("id");
      url.searchParams.delete("time");
      url.searchParams.delete("wireframe");
      url.searchParams.delete("orbit");
    }
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

function updatePresetButtons(activePreset?: SolarPreset) {
  const buttons: Array<[HTMLButtonElement | null, SolarPreset]> = [
    [btnSolarRealtime, "realtime"],
    [btnSolarDawn, "dawn"],
    [btnSolarNoon, "noon"],
    [btnSolarGolden, "golden"],
    [btnSolarNight, "night"],
  ];
  for (const [btn, preset] of buttons) {
    if (btn) {
      if (preset === activePreset) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  }
  if (appState.currentWonder) {
    updateUrl(appState.currentWonder.id, activePreset, appState.wireframeOn, droneOrbitController?.isOrbiting);
    const isNight = activePreset === "night";
    appState.landmarkNightOn = isNight;
    atmosphereManager?.setNightMode(isNight);
    landmarkManager?.setNightMode(appState.currentWonder.id, isNight);

    const btnNightEl = document.getElementById("btn-nightmode");
    if (btnNightEl) {
      btnNightEl.classList.toggle("active", isNight);
      btnNightEl.textContent = isNight ? "🌙 夜间窗光" : "🌓 窗光夜景";
    }
  }
}

function updateDroneBtn() {
  if (!btnDroneOrbit) return;
  const isOrbiting = !!droneOrbitController?.isOrbiting;
  btnDroneOrbit.classList.toggle("active", isOrbiting);
  const icon = btnDroneOrbit.querySelector(".orbit-icon");
  const text = btnDroneOrbit.querySelector(".orbit-text");
  if (icon) icon.textContent = isOrbiting ? "⏹" : "🛸";
  if (text) text.textContent = isOrbiting ? "停止环绕" : "航拍环绕";
}

function renderList() {
  if (!listEl) return;
  listEl.replaceChildren();
  const filtered = appState.activeCategory === "all" ? WONDERS : WONDERS.filter((w) => w.category === appState.activeCategory);
  for (const wonder of filtered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wonder-btn" + (wonder.id === appState.selectedId ? " active" : "");
    btn.dataset.id = wonder.id;
    const index = document.createElement("span");
    index.className = "idx";
    index.style.backgroundColor = wonder.color;
    index.textContent = String(wonder.index);

    const copy = document.createElement("span");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = wonder.nameZh;

    const place = document.createElement("div");
    place.className = "meta";
    place.textContent = wonder.place;

    copy.append(name, place);
    btn.append(index, copy);
    btn.addEventListener("click", () => {
      void visit(wonder);
    });
    listEl.append(btn);
  }
}

async function visit(wonder: Wonder) {
  if (!viewer || !flightController) return;
  if (appState.selectedId === wonder.id && !tourManager?.isTouring) {
    if (flightController.isFlying) return;
    if (appState.hasArrivedCurrentWonder) {
      if (hotspotManager?.isCardOpen) {
        hotspotManager.closeCard();
      }
      return;
    }
  }

  tourManager?.stopTour();
  appState.beginVisit(wonder);
  landmarkOrbitManager?.deactivate();
  droneOrbitController?.stop();
  updateDroneBtn();
  solarController?.setWonder(wonder);
  updatePresetButtons("noon");
  hotspotManager?.setActiveWonder(null);

  // 飞行途中并行加载目标地标模型
  if (landmarkManager) {
    void landmarkManager.loadLandmark(wonder);
  }
  atmosphereManager?.setWonder(wonder, landmarkManager?.getLandmarkGroup(wonder.id));
  atmosphereManager?.setNightMode(appState.landmarkNightOn);
  updateUrl(wonder.id, undefined, appState.wireframeOn, false);

  if (btnTour) btnTour.classList.remove("active");
  detailPanel.showDetail(wonder, renderList);
  setStatus(`飞向 ${wonder.nameZh}`);

  const arrivedPivot = await flightController.flyToWonder(wonder);
  if (appState.selectedId !== wonder.id || tourManager?.isTouring) return;

  if (arrivedPivot && appState.markArrived(wonder.id, arrivedPivot)) {
    landmarkManager?.updateProximityVisibility(arrivedPivot);
    landmarkOrbitManager?.activate(wonder, arrivedPivot);
    if (window.innerWidth <= 1080) {
      collapsePanel(); // 窄屏及移动端自动收起列表抽屉
    }
  } else {
    setStatus(`已中断飞向 ${wonder.nameZh} · 可再次点击前往`);
    return;
  }

  const loadedGroup = landmarkManager ? await landmarkManager.loadLandmark(wonder) : undefined;
  if (appState.selectedId === wonder.id && !tourManager?.isTouring) {
    atmosphereManager?.setWonder(wonder, loadedGroup);
    atmosphereManager?.setNightMode(appState.landmarkNightOn);
    setStatus(`${wonder.nameZh} · ${wonder.place}`);
  }
}

async function flyToSpace() {
  if (!flightController) return;
  appState.resetToSpace();
  landmarkManager?.updateProximityVisibility(null);
  landmarkOrbitManager?.deactivate();
  tourManager?.stopTour();
  droneOrbitController?.stop();
  updateDroneBtn();
  if (btnTour) {
    btnTour.disabled = false;
    btnTour.classList.remove("active");
  }
  if (btnSpace) {
    btnSpace.disabled = false;
  }
  atmosphereManager?.setWonder(null);
  updateUrl(null);
  solarController?.setWonder(null);
  hotspotManager?.setActiveWonder(null);
  detailPanel.hideDetail();
  expandPanel(); // 返回太空视角时自动展开景点列表
  renderList();
  setStatus("返回太空视角");
  await flightController.flyToSpace();
}

function addMarker(current: InstanceType<typeof tellux.Viewer>, wonder: Wonder) {
  current.entities.add({
    id: wonder.id,
    position: [wonder.longitude, wonder.latitude, wonder.labelHeight],
    point: {
      pixelSize: 14,
      color: wonder.color,
      outline: { color: "#0b1220", width: 2 },
    },
    symbol: {
      text: {
        text: `${wonder.index}  ${wonder.nameZh}`,
        fontSize: 15,
        fontWeight: "bold",
        color: "#f8fbff",
        outline: { color: "#0b1220", width: 2 },
        backgroundColor: "rgba(8, 14, 28, 0.72)",
        backgroundCornerRadius: 6,
        padding: [8, 4],
      },
      anchor: "bottom",
      pixelOffset: [0, 8],
    },
    properties: { wonderId: wonder.id },
  });
}

function wonderIdFromObject(start: THREE.Object3D | null | undefined): string | undefined {
  let node: THREE.Object3D | null = start ?? null;
  while (node) {
    const id = node.userData.wonderId;
    if (typeof id === "string") return id;
    node = node.parent;
  }
  return undefined;
}

function bindViewerEvents(current: InstanceType<typeof tellux.Viewer>) {
  const canvasEl = current.renderer?.raw?.domElement;
  let dragStartPos: { x: number; y: number } | null = null;
  let maxDragDistSq = 0;

  if (canvasEl && typeof canvasEl.addEventListener === "function") {
    canvasEl.addEventListener(
      "pointerdown",
      (e) => {
        dragStartPos = { x: e.clientX, y: e.clientY };
        maxDragDistSq = 0;
      },
      { capture: true },
    );
    window.addEventListener("pointermove", (e) => {
      if (!dragStartPos) return;
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      maxDragDistSq = Math.max(maxDragDistSq, dx * dx + dy * dy);
    });
    window.addEventListener("pointerup", () => {
      dragStartPos = null;
    });
    window.addEventListener("pointercancel", () => {
      dragStartPos = null;
      maxDragDistSq = 0;
    });
  }

  current.on("click", (event) => {
    if (flightController?.isFlying) return;
    if (maxDragDistSq > 36) return;
    let wonderId: string | undefined;
    const hit = event.pick;
    if (hit?.type === "entity") {
      const entity = hit.entity.entity;
      wonderId = (entity.properties?.wonderId as string | undefined) ?? entity.id;
    }
    if (!wonderId && landmarkManager?.landmarksRoot) {
      const objectHit = current.pick(event.position, {
        layers: ["object"],
        root: landmarkManager.landmarksRoot,
      });
      if (objectHit?.type === "object") {
        wonderId = wonderIdFromObject(objectHit.object.object);
      }
    }
    const wonder = WONDERS.find((item) => item.id === wonderId);
    if (wonder) void visit(wonder);
  });
}

async function boot() {
  const container = document.getElementById("viewer");
  if (!(container instanceof HTMLElement)) {
    throw new Error("找不到 #viewer 容器");
  }

  renderList();

  const current = new tellux.Viewer(container, {
    overlays: [
      {
        name: "ArcGIS World Imagery",
        source: {
          type: "xyz",
          url: ARCGIS_WORLD_IMAGERY,
          levels: 19,
        },
      },
    ],
    camera: {
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
      projection: {
        far: 40_000_000,
        fov: 50,
      },
    },
    scene: {
      atmosphere: {
        show: false,
        lighting: {
          mode: "light-source",
          sunLight: true,
          skyLight: true,
          sunLightIntensity: 1.4,
          skyLightIntensity: 0.85,
        },
        fallbackAmbientLight: {
          enabled: true,
          intensity: 0.35,
        },
        sky: {
          stars: {
            show: true,
            intensity: 1.2,
          },
        },
      },
      clouds: {
        show: false,
      },
    },
    postProcess: {
      toneMapping: { enabled: false },
      lensFlare: { enabled: false },
      smaa: { enabled: false },
    },
  });

  viewer = current;
  window.__viewer = current;
  window.THREE = THREE;

  configureTilesetOptimization(current);
  suppressBlackscreenEffects(current);
  current.controls.minDistance = 40;

  for (const wonder of WONDERS) addMarker(current, wonder);
  landmarkMarkerList = initLandmarkMarkers(current, WONDERS);
  bindViewerEvents(current);

  // 初始化飞行与巡礼子系统
  flightController = new FlightController({
    viewer: current,
    btnTour,
    btnSpace,
    viewerContainer: container,
    onLandmarkArrived: (wonder) => {
      hotspotManager?.setActiveWonder(wonder);
    },
  });

  tourManager = new TourManager({
    viewer: current,
    flightController,
    btnTour,
    onWonderStep: (w) => {
      appState.syncTourStep(w);
      hotspotManager?.setActiveWonder(null);
      landmarkOrbitManager?.deactivate();
      landmarkManager?.updateProximityVisibility(null);
      detailPanel.showDetail(w, renderList);
    },
    onStatusChange: setStatus,
    onTourEnded: () => {
      updateDroneBtn();
    },
  });

  btnTour?.addEventListener("click", () => {
    landmarkOrbitManager?.deactivate();
    if (tourManager?.isTouring) {
      tourManager.stopTour();
      setStatus("已停止巡礼");
      return;
    }
    void tourManager?.runTour(appState.activeCategory);
  });

  btnSpace?.addEventListener("click", () => {
    void flyToSpace();
  });

  // 绑定移动端及折叠抽屉与手势交互
  setupMobileInteractions({
    panelEl,
    detailEl,
    viewerEl: container,
    btnMobileList,
    btnPanelClose,
    panelGrabber,
    detailGrabber,
    detailClose,
    sheetExpandHint,
    onFlyToSpace: () => void flyToSpace(),
    onTogglePanel: () => togglePanel(),
    onCollapsePanel: () => collapsePanel(),
  });

  // 绑定键盘快捷键
  setupKeyboardShortcuts({
    onVisitWonder: (w) => void visit(w),
    onEscape: () => {
      if (appState.zenModeActive) {
        toggleZenMode(false);
        return;
      }
      void flyToSpace();
    },
    onToggleTour: () => {
      if (tourManager?.isTouring) tourManager.stopTour();
      else void tourManager?.runTour(appState.activeCategory);
    },
    onToggleOrbit: () => btnDroneOrbit?.click(),
    onPostcard: () => btnPostcard?.click(),
    onRealtimeSolar: () => btnSolarRealtime?.click(),
    onToggleZen: () => toggleZenMode(),
    onToggleMinimize: () => detailPanel.toggleMinimize(),
    onToggleList: () => togglePanel(),
  });

  // 全局沉浸模式事件绑定
  const btnZen = document.getElementById("btn-zen");
  const zenToast = document.getElementById("zen-toast");
  btnZen?.addEventListener("click", () => toggleZenMode());
  zenToast?.addEventListener("click", () => toggleZenMode(false));
  container.addEventListener("dblclick", () => {
    if (appState.zenModeActive) toggleZenMode(false);
  });

  // 绑定主题风貌分类切换
  const categoryTabs = document.getElementById("category-tabs");
  categoryTabs?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>(".cat-tab");
    if (!target) return;
    const cat = target.dataset.cat ?? "all";
    if (cat === appState.activeCategory) return;
    appState.activeCategory = cat;
    categoryTabs.querySelectorAll(".cat-tab").forEach((tab) => {
      tab.classList.toggle("active", tab === target);
    });
    renderList();
    for (const wonder of WONDERS) {
      const ent = current.entities.getById(wonder.id);
      if (ent) {
        ent.show = appState.activeCategory === "all" || wonder.category === appState.activeCategory;
      }
    }
    setStatus(`已切换至「${target.textContent?.trim()}」分类`);
  });

  // 绑定深度工程剖析模式 (Pentagon3D 模式)
  const btnWireframe = document.getElementById("btn-wireframe");
  const btnNightmode = document.getElementById("btn-nightmode");

  btnWireframe?.addEventListener("click", () => {
    appState.wireframeOn = !appState.wireframeOn;
    btnWireframe.classList.toggle("active", appState.wireframeOn);
    btnWireframe.textContent = appState.wireframeOn ? "📐 线框开启" : "📐 线框网格";
    if (appState.currentWonder) {
      updateUrl(appState.currentWonder.id, undefined, appState.wireframeOn, droneOrbitController?.isOrbiting);
      landmarkManager?.setWireframe(appState.currentWonder.id, appState.wireframeOn);
    }
  });

  btnNightmode?.addEventListener("click", () => {
    appState.landmarkNightOn = !appState.landmarkNightOn;
    btnNightmode.classList.toggle("active", appState.landmarkNightOn);
    btnNightmode.textContent = appState.landmarkNightOn ? "🌙 夜间窗光" : "🌓 窗光夜景";
    if (appState.currentWonder) {
      landmarkManager?.setNightMode(appState.currentWonder.id, appState.landmarkNightOn);
      atmosphereManager?.setNightMode(appState.landmarkNightOn);
      if (appState.landmarkNightOn) {
        solarController?.setPreset("night");
        updatePresetButtons("night");
      } else {
        solarController?.setPreset("noon");
        updatePresetButtons("noon");
      }
      updateUrl(
        appState.currentWonder.id,
        appState.landmarkNightOn ? "night" : "noon",
        appState.wireframeOn,
        droneOrbitController?.isOrbiting,
      );
    }
  });

  // 初始化昼夜光影控制器
  solarController = new SolarController(current, (hour, isRealtime) => {
    if (solarTimeLabel) {
      solarTimeLabel.textContent = isRealtime ? `${formatHour(hour)} 实时` : formatHour(hour);
    }
    if (solarSlider && document.activeElement !== solarSlider) {
      solarSlider.value = String(hour);
    }
  });

  // 初始化地标微观检视控制器 (Landmark Orbit & Viewport Controls)
  landmarkOrbitManager = new LandmarkOrbitManager({
    viewer: current,
    container,
    onResetRequested: () => {
      const target = appState.currentWonder;
      if (!target || !flightController) return;
      hotspotManager?.closeCard(true);
      detailPanel.expand();
      landmarkOrbitManager?.deactivate();
      void flightController.flyToWonder(target).then((arrivedPivot) => {
        if (arrivedPivot && appState.selectedId === target.id && !tourManager?.isTouring) {
          appState.markArrived(target.id, arrivedPivot);
          landmarkOrbitManager?.activate(target, arrivedPivot);
        }
      });
    },
    onSpaceAlignNorth: () => {
      void flyToSpace();
    },
  });

  // 初始化无人机航拍控制器
  droneOrbitController = new DroneOrbitController(current, (isOrbiting) => {
    updateDroneBtn();
    hotspotManager?.setOrbitMode(isOrbiting);
    if (isOrbiting) {
      landmarkOrbitManager?.deactivate();
      setStatus("🚁 航拍环绕中 (自适应瓦片防抖与全景渲染) · 点击或拖动任意处停止");
    } else if (
      appState.currentWonder &&
      appState.activePivotPos &&
      !flightController?.isFlying &&
      !tourManager?.isTouring
    ) {
      landmarkOrbitManager?.activate(appState.currentWonder, appState.activePivotPos);
      setStatus(`${appState.currentWonder.nameZh} · ${appState.currentWonder.place}`);
    }
  });

  // 加载地标材质系统并初始化 LandmarkManager
  setStatus("地球已启动，正在加载景点材质…");
  const kit = await loadSurfaceKit();
  landmarkManager = new LandmarkManager(current, kit);
  landmarkManager.preloadBackground();

  // 首屏瓦片与材质就绪，平滑淡出冷启动加载器
  const loaderEl = document.getElementById("earth-loader");
  if (loaderEl) {
    loaderEl.classList.add("hidden");
    setTimeout(() => loaderEl.remove(), 700);
  }

  // 初始化 3D 热点管理器
  if (hotspotLayer) {
    hotspotManager = new HotspotManager(
      current,
      landmarkManager.landmarkGroups,
      hotspotLayer,
      hotspotCard,
      () => {
        landmarkOrbitManager?.resetToOverview();
        detailPanel.expand();
      },
      (hotspot, worldPos) => {
        detailPanel.minimize();
        landmarkOrbitManager?.focusOnHotspot(
          worldPos,
          hotspot.focusDistance,
          hotspot.focusPitch,
          hotspot.focusHeading,
        );
      },
      () => {
        landmarkOrbitManager?.resetToOverview();
        detailPanel.expand();
      },
    );
  }

  // 绑定光影预设与滑块事件
  btnSolarRealtime?.addEventListener("click", () => {
    solarController?.setRealtime();
    updatePresetButtons("realtime");
    if (btnTimelapse) {
      btnTimelapse.classList.remove("active");
      btnTimelapse.textContent = "▶ 延时";
    }
    setStatus("已恢复当前现实正常时间 (实时光影)");
  });
  btnSolarDawn?.addEventListener("click", () => {
    solarController?.setPreset("dawn");
    updatePresetButtons("dawn");
  });
  btnSolarNoon?.addEventListener("click", () => {
    solarController?.setPreset("noon");
    updatePresetButtons("noon");
  });
  btnSolarGolden?.addEventListener("click", () => {
    solarController?.setPreset("golden");
    updatePresetButtons("golden");
  });
  btnSolarNight?.addEventListener("click", () => {
    solarController?.setPreset("night");
    updatePresetButtons("night");
  });

  solarSlider?.addEventListener("input", () => {
    const hour = parseFloat(solarSlider.value);
    solarController?.setLocalSolarHour(hour);
    updatePresetButtons(undefined);
  });

  btnTimelapse?.addEventListener("click", () => {
    const playing = solarController?.toggleTimelapse();
    if (btnTimelapse) {
      if (playing) {
        btnTimelapse.classList.add("active");
        btnTimelapse.textContent = "⏸ 暂停";
      } else {
        btnTimelapse.classList.remove("active");
        btnTimelapse.textContent = "▶ 延时";
      }
    }
  });

  btnDroneOrbit?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (droneOrbitController?.isOrbiting) {
      droneOrbitController.stop();
    } else {
      if (flightController?.isFlying) {
        setStatus("正在飞行中，飞抵后即可开启航拍环绕");
        return;
      }
      if (!appState.currentWonder) {
        setStatus("请先选择一个奇迹，再开启航拍环绕");
        return;
      }
      if (!appState.activePivotPos) {
        try {
          const targetMat = new THREE.Matrix4();
          current.cartographicToMatrix4(
            [appState.currentWonder.longitude, appState.currentWonder.latitude, appState.currentWonder.lookHeight ?? 24],
            {},
            targetMat,
          );
          appState.activePivotPos = new THREE.Vector3().setFromMatrixPosition(targetMat);
        } catch {
          // ignore
        }
      }
      if (!appState.activePivotPos) {
        setStatus("正在对齐建筑中心，请稍候重试");
        return;
      }
      droneOrbitController?.start(appState.currentWonder, appState.activePivotPos);
      hotspotManager?.closeCard(true);
      setStatus(`已开启「${appState.currentWonder.nameZh}」360° 航拍环绕 · 拖动鼠标或按 O 键退出`);
    }
    updateDroneBtn();
  });

  btnPostcard?.addEventListener("click", () => {
    if (!appState.currentWonder || !viewer) {
      setStatus("请先选择或飞抵一座奇迹，再生成明信片 📷");
      return;
    }
    const currentViewer = viewer;
    const targetWonder = appState.currentWonder;
    const markersToRestore: Array<{ ent: any; show: boolean }> = [];
    for (const w of WONDERS) {
      const ent = currentViewer.entities.getById(w.id);
      if (ent) {
        markersToRestore.push({ ent, show: ent.show });
        ent.show = false;
      }
    }
    hotspotManager?.closeCard(true);

    requestAnimationFrame(() => {
      try {
        const glCanvas = currentViewer.renderer.raw.domElement;
        const cardCanvas = generatePostcard({
          wonder: targetWonder,
          glCanvas,
          solarTimeText: solarTimeLabel?.textContent ?? "12:00",
          isWireframe: appState.wireframeOn,
          isNight: appState.landmarkNightOn || btnSolarNight?.classList.contains("active"),
        });
        showPostcardModal(cardCanvas, targetWonder);
        setStatus(`已为「${targetWonder.nameZh}」生成专属建筑明信片 📷`);
      } catch (err) {
        console.error("生成明信片失败:", err);
        setStatus("生成明信片时出错，请重试");
      } finally {
        for (const item of markersToRestore) {
          item.ent.show = item.show;
        }
      }
    });
  });

  window.addEventListener("pagehide", () => {
    atmosphereManager?.dispose();
    landmarkOrbitManager?.destroy();
    landmarkManager?.destroy();
    current.destroy();
  });

  // 初始化大气与环境动态气候管理器
  atmosphereManager = new AtmosphereManager();

  // 检查 URL 深度链接参数
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("id");
  const targetTime = urlParams.get("time") as SolarPreset | null;
  const targetWireframe = urlParams.get("wireframe") === "1";
  const targetOrbit = urlParams.get("orbit") === "1";

  if (targetId) {
    const targetWonder = WONDERS.find((w) => w.id === targetId);
    if (targetWonder) {
      void visit(targetWonder).then(() => {
        if (targetTime && ["dawn", "noon", "golden", "night"].includes(targetTime)) {
          solarController?.setPreset(targetTime);
          updatePresetButtons(targetTime);
        }
        if (targetWireframe && btnWireframe) {
          btnWireframe.click();
        }
        if (targetOrbit && btnDroneOrbit) {
          btnDroneOrbit.click();
        }
      });
    }
  }

  // 启动高帧率连续更新循环
  let lastFrameTime = performance.now();
  const renderLoop = (now: number) => {
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (viewer) {
      keepCameraTuned(viewer);
    }

    let rightOcclusionWidth = 0;
    if (landmarkMarkerList.length > 0 && viewer) {
      const domCanvas = viewer.renderer.raw.domElement;
      const isPanelOpen = panelEl && !panelEl.classList.contains("collapsed") && !panelEl.classList.contains("mobile-hidden");
      rightOcclusionWidth = isPanelOpen && window.innerWidth > 768 ? Math.min(340, window.innerWidth * 0.35) : 0;
      updateMarkerOcclusion({
        camera: viewer.camera.raw,
        canvasWidth: domCanvas?.clientWidth ?? window.innerWidth,
        canvasHeight: domCanvas?.clientHeight ?? window.innerHeight,
        markers: landmarkMarkerList,
        selectedId: appState.selectedId,
        activeCategory: appState.activeCategory,
        setEntityVisibility: (id, visible) => {
          const ent = viewer?.entities.getById(id);
          if (ent && ent.show !== visible) {
            ent.show = visible;
          }
        },
        rightOcclusionWidth,
      });
    }

    if (landmarkOrbitManager?.isActive) {
      landmarkOrbitManager.update(dt);
    } else {
      if (viewer) landmarkOrbitManager?.updateSpaceCompass(viewer.camera.raw);
      if (droneOrbitController?.isOrbiting) {
        droneOrbitController.update(dt);
      }
    }

    hotspotManager?.update(rightOcclusionWidth);
    atmosphereManager?.update(dt);

    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);

  if (!flightController.isFlying && !tourManager.isTouring && appState.selectedId === null) {
    setStatus("拖动地球 · 点击分类/列表快速飞向奇迹 · O 键航拍环绕 · T 键环球巡礼");
  }
}

void boot().catch(showError);
