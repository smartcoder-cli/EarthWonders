import * as THREE from "three";
import tellux from "tellux";
import { HotspotManager } from "./hotspotManager";
import { LANDMARK_BUILDERS } from "./landmarks";
import { SolarController, DroneOrbitController, type SolarPreset } from "./solarAndOrbit";
import { loadSurfaceKit, type SurfaceKit } from "./surfaces";
import { installTileProvider } from "./tileProvider";
import { SPACE_VIEW, WONDERS, type Wonder } from "./wonders";

// 启动阶段立即安装智能瓦片提供器拦截器，确保所有地图瓦片请求均受级联与重采样保护
installTileProvider();

const ARCGIS_WORLD_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

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

const REFERENCE_PHOTOS: Record<
  string,
  { image: string; fallbackImage?: string; page: string; credit: string; alt: string }
> = {
  giza: {
    image: "/photos/giza.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Great_Pyramid_of_Giza.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Great_Pyramid_of_Giza.jpg",
    credit: "照片：kallerna / Wikimedia Commons · CC BY-SA 3.0",
    alt: "吉萨胡夫大金字塔实景照片",
  },
  wall: {
    image: "/photos/wall.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/5/50/Badaling_China_Great-Wall-of-China-01.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Badaling_China_Great-Wall-of-China-01.jpg",
    credit: "照片：CEphoto, Uwe Aranas / Wikimedia Commons · CC BY-SA 3.0",
    alt: "八达岭长城实景照片",
  },
  petra: {
    image: "/photos/petra.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/6/62/Al_Khazneh_Petra_edit_2.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Al_Khazneh_Petra_edit_2.jpg",
    credit: "照片：Graham Racher, MrPanyGoff / Wikimedia Commons · CC BY-SA 2.0",
    alt: "佩特拉卡兹尼神殿宝库立面实景照片",
  },
  colosseum: {
    image: "/photos/colosseum.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/5/53/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Colosseum_in_Rome,_Italy_-_April_2007.jpg",
    credit: "照片：Diliff / Wikimedia Commons · CC BY-SA 2.5",
    alt: "罗马斗兽场全景外观实景照片",
  },
  chichen: {
    image: "/photos/chichen.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/4/4d/El_Castillo_Stitch_2008_Edit_2.jpg",
    page: "https://commons.wikimedia.org/wiki/File:El_Castillo_Stitch_2008_Edit_2.jpg",
    credit: "照片：Fcb981 / Wikimedia Commons · CC BY-SA 3.0",
    alt: "奇琴伊察库库尔坎金字塔实景照片",
  },
  machu: {
    image: "/photos/machu.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/2/21/Machu_Picchu_with_Huayna_Picchu_P%C3%A9rou_%287%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Machu_Picchu_with_Huayna_Picchu_P%C3%A9rou_(7).jpg",
    credit: "照片：Pierre Andre Leclercq / Wikimedia Commons · CC BY-SA 4.0",
    alt: "马丘比丘与瓦伊纳比丘全景实景照片",
  },
  taj: {
    image: "/photos/taj.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Taj_Mahal_%28Edited%29.jpeg",
    page: "https://commons.wikimedia.org/wiki/File:Taj_Mahal_(Edited).jpeg",
    credit: "照片：Yann / Jim Carter / Wikimedia Commons · CC BY-SA 4.0",
    alt: "泰姬陵正面中轴水系与宣礼塔实景照片",
  },
  christ: {
    image: "/photos/christ.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Christ_the_Redeemer-%28Corcovado%29_front_view.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer-(Corcovado)_front_view.jpg",
    credit: "照片：Artyominc / Wikimedia Commons · CC BY-SA 3.0",
    alt: "里约热内卢科尔科瓦多山基督像正面实景照片",
  },
  pentagon: {
    image: "/photos/pentagon.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/b/bf/The_Pentagon%2C_Headquarters_of_the_US_Department_of_Defense.jpg",
    page: "https://commons.wikimedia.org/wiki/File:The_Pentagon,_Headquarters_of_the_US_Department_of_Defense.jpg",
    credit: "照片：Touch Of Light / Wikimedia Commons · CC BY-SA 4.0",
    alt: "美国五角大楼鸟瞰实景照片",
  },
  fast: {
    image: "/photos/fast.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/d/d1/202508_FAST_%28Five-hundred-meter_Aperture_Spherical_radio_Telescope%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:202508_FAST_(Five-hundred-meter_Aperture_Spherical_radio_Telescope).jpg",
    credit: "照片：SCJiang / Wikimedia Commons · CC BY-SA 4.0",
    alt: "中国天眼 FAST 500米口径球面射电望远镜实景照片",
  },
  burj: {
    image: "/photos/burj.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Burj_Khalifa_%2816260269606%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Burj_Khalifa_(16260269606).jpg",
    credit: "照片：Donaldytong / Wikimedia Commons · CC BY-SA 3.0",
    alt: "迪拜哈利法塔全貌实景照片",
  },
  apple: {
    image: "/photos/apple.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Aerial_view_of_Apple_Park_dllu.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_Apple_Park_dllu.jpg",
    credit: "照片：Daniel Lu (dllu) / Wikimedia Commons · CC BY-SA 4.0",
    alt: "苹果总部 Apple Park 飞船环形园区鸟瞰实景照片",
  },
  sydney: {
    image: "/photos/sydney.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Sydney_Opera_House_2026.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Sydney_Opera_House_2026.jpg",
    credit: "照片：BAVhah / Wikimedia Commons · CC BY-SA 4.0",
    alt: "悉尼歌剧院便利朗角贝壳风帆全景实景照片",
  },
  globalcenter: {
    image: "/photos/globalcenter.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/7/78/New_Century_Global_Centre_-_panoramio.jpg",
    page: "https://commons.wikimedia.org/wiki/File:New_Century_Global_Centre_-_panoramio.jpg",
    credit: "照片：Raki_Man / Wikimedia Commons · CC BY 3.0",
    alt: "成都新世纪环球中心海鸥波浪曲面实景照片",
  },
  hzmb: {
    image: "/photos/hzmb.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Artificial_island_of_HK-Zhuhai-MO_Bridge_20180723.jpg/1280px-Artificial_island_of_HK-Zhuhai-MO_Bridge_20180723.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Artificial_island_of_HK-Zhuhai-MO_Bridge_20180723.jpg",
    credit: "照片：Wpcpey / Wikimedia Commons · CC BY-SA 4.0",
    alt: "港珠澳大桥东人工岛与沉管隧道入口俯瞰实景照片",
  },
  goldengate: {
    image: "/photos/goldengate.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Golden_Gate_Bridge_as_seen_from_Marshall%E2%80%99s_Beach%2C_March_2018.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_as_seen_from_Marshall%E2%80%99s_Beach,_March_2018.jpg",
    credit: "照片：Frank Schulenburg / Wikimedia Commons · CC BY-SA 4.0",
    alt: "旧金山金门大桥国际橘双塔与悬索实景照片",
  },
  svalbard: {
    image: "/photos/svalbard.jpg",
    fallbackImage: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Longyearbyen%2C_Svalbard_Global_Seed_Vault.JPG",
    page: "https://commons.wikimedia.org/wiki/File:Longyearbyen,_Svalbard_Global_Seed_Vault.JPG",
    credit: "照片：Superchilum / Wikimedia Commons · CC BY-SA 4.0",
    alt: "斯瓦尔巴全球种子库极地入口棱柱实景照片",
  },
};
const statusEl = document.getElementById("status");
const btnTour = document.getElementById("btn-tour") as HTMLButtonElement | null;
const btnSpace = document.getElementById("btn-space") as HTMLButtonElement | null;
const errorBox = document.getElementById("error-box");
const errorMsg = document.getElementById("error-msg");

function showError(err: unknown) {
  // Keep technical details in the console; show a useful, non-sensitive message in the UI.
  console.error("EarthWonders initialization failed:", err);
  if (errorBox) errorBox.classList.remove("hidden");
  if (errorMsg) {
    errorMsg.textContent = "加载失败，请检查网络连接后刷新页面重试。";
  }
}

function setStatus(text: string) {
  if (statusEl) statusEl.textContent = text;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
interface OptimizedTileset {
  errorTarget?: number;
  downloadQueue?: {
    items: unknown[];
    currJobs: number;
    priorityCallback: ((a: unknown, b: unknown) => number) | null;
  };
}

function getSurfaceTileset(v: InstanceType<typeof tellux.Viewer> | null): OptimizedTileset | undefined {
  if (!v) return undefined;
  const untyped = v as unknown as { tilesetManager?: { surfaceTileset?: OptimizedTileset } };
  return untyped.tilesetManager?.surfaceTileset;
}

let baseErrorTarget = 2;

/**
 * 等待当前景点的地图瓦片下载并渲染完成。
 * 直接监控 3D-Tiles 的 downloadQueue 与网络活跃状态，排空且稳定后立即放行。
 */
function waitForMapTiles(maxWaitMs = 14_000, quietMs = 1_000): Promise<void> {
  return new Promise((resolve) => {
    const tileset = getSurfaceTileset(viewer);
    const dlQueue = tileset?.downloadQueue;
    const startedAt = performance.now();
    let quietSince: number | null = null;
    let initialGraceDone = false;

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;

      // 允许最初 350ms 宽限期，以便镜头刚停稳时 3D-Tiles 发起视口遍历并将当前景点的瓦片推入队列
      if (!initialGraceDone) {
        if (elapsed < 350) return;
        initialGraceDone = true;
      }

      // 若巡礼已被用户手动打断，立即结束等待
      if (!touring) {
        window.clearInterval(timer);
        resolve();
        return;
      }

      const items = dlQueue?.items?.length ?? 0;
      const jobs = dlQueue?.currJobs ?? 0;

      // 当队列中既无等待任务也无正在进行的网络连接时，确认处于完全就绪状态
      if (items === 0 && jobs === 0) {
        if (quietSince === null) {
          quietSince = performance.now();
        }
        if (performance.now() - quietSince >= quietMs) {
          window.clearInterval(timer);
          resolve();
          return;
        }
      } else {
        quietSince = null;
      }

      // 达到最长超时保底，放行继续巡礼
      if (elapsed >= maxWaitMs) {
        window.clearInterval(timer);
        resolve();
      }
    }, 120);
  });
}

let viewer: InstanceType<typeof tellux.Viewer> | null = null;
let selectedId: string | null = null;
let flying = false;
let touring = false;
let tourGeneration = 0;
let flightGeneration = 0;
const landmarkGroups = new Map<string, THREE.Group>();
let landmarksRoot: THREE.Group | null = null;

let hotspotManager: HotspotManager | null = null;
let solarController: SolarController | null = null;
let droneOrbitController: DroneOrbitController | null = null;
let activePivotPos: THREE.Vector3 | null = null;
let currentWonderObj: Wonder | null = null;

const btnSolarRealtime = document.getElementById("btn-solar-realtime") as HTMLButtonElement | null;
const btnSolarDawn = document.getElementById("btn-solar-dawn") as HTMLButtonElement | null;
const btnSolarNoon = document.getElementById("btn-solar-noon") as HTMLButtonElement | null;
const btnSolarGolden = document.getElementById("btn-solar-golden") as HTMLButtonElement | null;
const btnSolarNight = document.getElementById("btn-solar-night") as HTMLButtonElement | null;
const solarTimeLabel = document.getElementById("solar-time-label");
const solarSlider = document.getElementById("solar-slider") as HTMLInputElement | null;
const btnTimelapse = document.getElementById("btn-timelapse") as HTMLButtonElement | null;
const btnDroneOrbit = document.getElementById("btn-drone-orbit") as HTMLButtonElement | null;
const hotspotLayer = document.getElementById("hotspot-layer") as HTMLElement | null;
const hotspotCard = document.getElementById("hotspot-card") as HTMLElement | null;

function formatHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

function setFlying(next: boolean) {
  flying = next;
  if (btnTour) btnTour.disabled = next && !touring;
  if (btnSpace) btnSpace.disabled = next && !touring;
  const container = document.getElementById("viewer");
  if (container) {
    container.style.pointerEvents = next ? "none" : "";
  }

  // 飞行期间将 surfaceTileset.errorTarget 从 2 升至 120，
  // 杜绝万米高空洲际飞跃时向下递归细分并向下载队列塞入数百张无用的过路高清瓦片。
  // 降落停稳后恢复基准精度（baseErrorTarget），立即按目标视口极速拉取。
  const tileset = getSurfaceTileset(viewer);
  if (tileset) {
    tileset.errorTarget = next ? 120 : baseErrorTarget;
  }
}

let activeCategory = "all";
let wireframeOn = false;
let landmarkNightOn = false;

function renderList() {
  if (!listEl) return;
  listEl.replaceChildren();
  const filtered = activeCategory === "all" ? WONDERS : WONDERS.filter((w) => w.category === activeCategory);
  for (const wonder of filtered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wonder-btn" + (wonder.id === selectedId ? " active" : "");
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

function resetInspectionMode() {
  wireframeOn = false;
  landmarkNightOn = false;
  const btnWire = document.getElementById("btn-wireframe");
  const btnNight = document.getElementById("btn-nightmode");
  if (btnWire) {
    btnWire.classList.remove("active");
    btnWire.textContent = "📐 线框网格";
  }
  if (btnNight) {
    btnNight.classList.remove("active");
    btnNight.textContent = "🌓 窗光夜景";
  }
}

function showDetail(wonder: Wonder) {
  selectedId = wonder.id;
  renderList();
  if (detailKicker) {
    detailKicker.textContent = `${String(wonder.index).padStart(2, "0")} / ${String(WONDERS.length).padStart(2, "0")} · ${wonder.completed}`;
  }
  if (detailTitle) detailTitle.textContent = wonder.nameZh;
  if (detailEn) detailEn.textContent = `${wonder.nameEn} · ${wonder.place}`;
  if (detailBlurb) detailBlurb.textContent = wonder.blurb;

  // 渲染技术与工程规格参数 (Specs)
  const specsEl = document.getElementById("detail-specs");
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
  const inspectBar = document.getElementById("inspection-bar");
  if (inspectBar) {
    if (wonder.hasInspection) {
      inspectBar.classList.remove("hidden");
    } else {
      inspectBar.classList.add("hidden");
    }
  }
  resetInspectionMode();

  const photo = REFERENCE_PHOTOS[wonder.id];
  if (comparisonEl && comparisonImage && comparisonSource && comparisonCredit) {
    if (photo) {
      comparisonImage.classList.remove("image-unavailable");
      comparisonImage.alt = photo.alt;
      comparisonImage.src = photo.image;
      comparisonSource.href = photo.page;
      comparisonCredit.textContent = photo.credit;
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
function resetControlsInertia(current: InstanceType<typeof tellux.Viewer> | null | undefined) {
  if (!current) return;
  try {
    const raw = (current.controls as any)?.raw ?? current.controls;
    if (raw) {
      raw.rotationInertia?.set(0, 0);
      raw.dragInertia?.set(0, 0, 0);
      raw.globeInertia?.identity();
      raw.globeInertiaFactor = 0;
      raw.zoomDelta = 0;
      raw.needsUpdate = false;
      raw.actionHeightOffset = 0;
      raw.resetState?.();
    }
  } catch {
    // 忽略非致命重置异常
  }
}

function setControlsEnabled(enabled: boolean) {
  if (viewer) {
    if (!enabled) {
      resetControlsInertia(viewer);
    }
    viewer.controls.enabled = enabled;
  }
}

function flyToSpace(): Promise<void> {
  const current = viewer;
  if (!current) return Promise.resolve();
  const flight = ++flightGeneration;
  selectedId = null;
  currentWonderObj = null;
  activePivotPos = null;
  droneOrbitController?.stop();
  updateDroneBtn();
  solarController?.setWonder(null);
  hotspotManager?.setActiveWonder(null);
  resetInspectionMode();
  renderList();
  document.body.classList.remove("has-selected");
  panelEl?.classList.remove("mobile-hidden", "mobile-open");
  if (detailEl) {
    detailEl.classList.add("hidden");
    detailEl.classList.remove("mobile-peek", "mobile-expanded");
  }
  setStatus("返回太空视角");
  setFlying(true);
  setControlsEnabled(false);
  return new Promise((resolve) => {
    current.camera.flyTo({
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
        if (flight === flightGeneration) {
          try {
            const rawControls = (current.controls as { raw?: { pivotPoint?: THREE.Vector3 } })?.raw ?? (current.controls as { pivotPoint?: THREE.Vector3 });
            rawControls?.pivotPoint?.set(0, 0, 0);
          } catch {
            // ignore
          }
          resetControlsInertia(current);
          setFlying(false);
          setControlsEnabled(true);
        }
        resolve();
      },
      cancel: () => {
        if (flight === flightGeneration) {
          resetControlsInertia(current);
          setFlying(false);
          setControlsEnabled(true);
        }
        resolve();
      },
    });
  });
}

function flyToWonder(wonder: Wonder): Promise<void> {
  const current = viewer;
  if (!current) return Promise.resolve();
  const flight = ++flightGeneration;
  setFlying(true);
  setControlsEnabled(false);
  return new Promise((resolve) => {
    current.flyToTarget(
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
        if (flight === flightGeneration) {
          // 精确同步 GlobeControls 旋转轴心点，彻底杜绝飞抵后稍动鼠标镜头围绕旧位置瞬间甩飞
          try {
            const targetMat = new THREE.Matrix4();
            current.cartographicToMatrix4(
              [wonder.longitude, wonder.latitude, wonder.lookHeight ?? 24],
              {},
              targetMat,
            );
            const targetPos = new THREE.Vector3().setFromMatrixPosition(targetMat);
            activePivotPos = targetPos.clone();
            const rawControls = (current.controls as { raw?: { pivotPoint?: THREE.Vector3; pivotMesh?: THREE.Object3D } })?.raw ?? (current.controls as { pivotPoint?: THREE.Vector3; pivotMesh?: THREE.Object3D });
            if (rawControls?.pivotPoint) {
              rawControls.pivotPoint.copy(targetPos);
              rawControls.pivotMesh?.position.copy(targetPos);
            }
            hotspotManager?.setActiveWonder(wonder);
          } catch {
            // 忽略非致命同步异常
          }

          // 关键修复：飞抵降落瞬间清除所有累积惯性与残留标记，杜绝 controls.update() 在 NONE 状态下触发
          // _alignCameraUp / _clampRotation 绕相机中心原地旋转导致地标从画面瞬间位移甩失
          resetControlsInertia(current);
          setFlying(false);
          setControlsEnabled(true);
        }
        resolve();
      },
      cancel: () => {
        if (flight === flightGeneration) {
          resetControlsInertia(current);
          setFlying(false);
          setControlsEnabled(true);
        }
        resolve();
      },
    },
    );
  });
}

async function visit(wonder: Wonder) {
  if (!viewer) return;
  // 若已停留在当前景点或已在飞向当前景点的途中，无需重复打断并重置飞行
  if (selectedId === wonder.id && !touring) return;
  touring = false;
  tourGeneration += 1;
  currentWonderObj = wonder;
  droneOrbitController?.stop();
  updateDroneBtn();
  solarController?.setWonder(wonder);
  updatePresetButtons("noon");
  hotspotManager?.setActiveWonder(null);
  if (btnTour) btnTour.classList.remove("active");
  showDetail(wonder);
  setStatus(`飞向 ${wonder.nameZh}`);
  await flyToWonder(wonder);
  // An older visit must not overwrite the status of a newer selection or tour.
  if (selectedId === wonder.id && !touring) {
    setStatus(`${wonder.nameZh} · ${wonder.place}`);
  }
}

async function runTour() {
  if (!viewer || flying) return;
  droneOrbitController?.stop();
  updateDroneBtn();
  solarController?.stopTimelapse();
  touring = true;
  const generation = ++tourGeneration;
  if (btnTour) {
    btnTour.classList.add("active");
    btnTour.textContent = "巡礼中…";
  }
  setStatus("开始环球巡礼");
  const tourList = activeCategory === "all" ? WONDERS : WONDERS.filter((w) => w.category === activeCategory);
  for (const wonder of tourList) {
    if (!touring || generation !== tourGeneration) break;
    showDetail(wonder);
    setStatus(`巡礼 ${wonder.index}/${WONDERS.length} · ${wonder.nameZh}`);
    await flyToWonder(wonder);
    if (!touring || generation !== tourGeneration) break;
    setStatus(`等待地图加载 · ${wonder.nameZh}`);
    await waitForMapTiles();
    if (!touring || generation !== tourGeneration) break;
    setStatus(`巡礼 ${wonder.index}/${WONDERS.length} · ${wonder.nameZh}`);
    await sleep(6500);
  }
  if (generation === tourGeneration) {
    touring = false;
    if (btnTour) {
      btnTour.classList.remove("active");
      btnTour.textContent = "环球巡礼";
    }
    setStatus("巡礼结束 · 可继续点选遗址");
  }
}

function stopTour() {
  touring = false;
  tourGeneration += 1;
  droneOrbitController?.stop();
  updateDroneBtn();
  if (btnTour) {
    btnTour.classList.remove("active");
    btnTour.textContent = "环球巡礼";
  }
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
      pixelOffset: [0, 18],
    },
    properties: { wonderId: wonder.id },
  });
}

function placeLandmarks(
  current: InstanceType<typeof tellux.Viewer>,
  kit: SurfaceKit,
) {
  const root = new THREE.Group();
  root.name = "earth-wonders-landmarks";
  current.scene.raw.add(root);
  landmarksRoot = root;

  for (const wonder of WONDERS) {
    const build = LANDMARK_BUILDERS[wonder.id];
    if (!build) continue;
    const group = build(kit);
    group.name = wonder.id;
    group.userData.wonderId = wonder.id;
    group.matrixAutoUpdate = false;
    current.cartographicToMatrix4(
      [wonder.longitude, wonder.latitude, wonder.modelHeight ?? 0],
      { heading: wonder.modelHeading ?? 0 },
      group.matrix,
    );
    group.updateMatrixWorld(true);
    group.traverse((object) => {
      object.frustumCulled = false;
      object.raycast = () => {};
    });
    root.add(group);
    landmarkGroups.set(wonder.id, group);
  }
}

function wonderIdFromObject(start: THREE.Object3D | null | undefined) {
  let node: THREE.Object3D | null = start ?? null;
  while (node) {
    const id = node.userData.wonderId;
    if (typeof id === "string") return id;
    node = node.parent;
  }
  return undefined;
}

function bindViewerEvents(current: InstanceType<typeof tellux.Viewer>) {
  current.on("click", (event) => {
    // 飞行过程中屏蔽画布误触拾取，避免打断镜头插值导致半途悬停
    if (flying) return;
    let wonderId: string | undefined;
    const hit = event.pick;
    if (hit?.type === "entity") {
      const entity = hit.entity.entity;
      wonderId = (entity.properties?.wonderId as string | undefined) ?? entity.id;
    }
    if (!wonderId && landmarksRoot) {
      const objectHit = current.pick(event.position, {
        layers: ["object"],
        root: landmarksRoot,
      });
      if (objectHit?.type === "object") {
        wonderId = wonderIdFromObject(objectHit.object.object);
      }
    }
    const wonder = WONDERS.find((item) => item.id === wonderId);
    if (wonder) void visit(wonder);
  });
}

function configureTilesetOptimization(current: InstanceType<typeof tellux.Viewer>) {
  const tileset = getSurfaceTileset(current);
  if (!tileset) return;

  baseErrorTarget = tileset.errorTarget ?? 2;

  // 优化 3D-Tiles 下载队列调度：
  // 3D-Tiles-Renderer 的 ImageOverlayPlugin 使用 priority = -performance.now() 入队，
  // 并且 PriorityQueue 按照 priorityCallback 排序后使用 items.pop() 弹出队尾元素。
  // 原生统一比较器使得较早入队的过路瓦片比较晚入队的视口瓦片具有更高优先级（-t_old > -t_new）。
  // 此处反转为：最新加入队列的瓦片排在数组末尾，使得 pop() 优先处理最新请求（LIFO 策略），
  // 杜绝飞抵景点后被中途积压的过路瓦片饥饿阻塞。
  const dlQueue = tileset.downloadQueue;
  if (dlQueue) {
    const originalCallback = dlQueue.priorityCallback;
    dlQueue.priorityCallback = (a: any, b: any) => {
      const pa = a?.priority;
      const pb = b?.priority;
      if (typeof pa === "number" && typeof pb === "number") {
        return pa < pb ? 1 : pa > pb ? -1 : 0;
      }
      return originalCallback ? originalCallback(a, b) : 0;
    };
  }
}

async function boot() {
  const container = document.getElementById("viewer");
  if (!(container instanceof HTMLElement)) {
    throw new Error("找不到 #viewer 容器");
  }

  renderList();

  // Create the globe before waiting for landmark material textures. This lets
  // the earth and base imagery begin rendering while local textures load.
  performance.mark("earthwonders-boot-start");
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
      toneMapping: {
        enabled: false,
      },
      lensFlare: {
        enabled: false,
      },
      smaa: { enabled: false },
    },
  });

  viewer = current;
  (window as unknown as { __viewer: unknown; THREE: unknown }).__viewer = current;
  (window as unknown as { __viewer: unknown; THREE: unknown }).THREE = THREE;
  configureTilesetOptimization(current);

  // 彻底免疫黑屏：强制 Three.js 直连屏幕默认帧缓冲绘制，
  // 拦截并绕过在 Windows/ANGLE 环境下导致黑屏的后处理 Pass
  const rawRenderer = current.renderer.raw as any;
  if (typeof rawRenderer.setEffects === "function") {
    const origSetEffects = rawRenderer.setEffects.bind(rawRenderer);
    rawRenderer.setEffects = () => origSetEffects([]);
    origSetEffects([]);
  }
  const pp = (current as any).postProcessing;
  if (pp) {
    pp.activeEffects = [];
    pp.applyEffects = () => {
      pp.activeEffects = [];
      (current.renderer.raw as any).setEffects?.([]);
    };
  }

  current.controls.minDistance = 40;
  performance.mark("earthwonders-viewer-created");

  // Register markers, interactions, and keyboard shortcuts immediately so the globe is fully responsive
  for (const wonder of WONDERS) addMarker(current, wonder);
  bindViewerEvents(current);

  btnTour?.addEventListener("click", () => {
    if (touring) {
      stopTour();
      setStatus("已停止巡礼");
      return;
    }
    void runTour();
  });
  btnSpace?.addEventListener("click", () => {
    stopTour();
    void flyToSpace();
  });

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key;
    const KEY_MAP: Record<string, number> = {
      "0": 10,
      "-": 11,
      "=": 12,
      "+": 12,
      "[": 13,
      "]": 14,
      "\\": 15,
      ";": 16,
      "'": 17,
    };
    const num = KEY_MAP[key] ?? Number(key);
    if (!isNaN(num) && num >= 1 && num <= WONDERS.length) {
      const wonder = WONDERS[num - 1];
      if (wonder) void visit(wonder);
    }
    if (event.key === "Escape") {
      stopTour();
      void flyToSpace();
    }
    if (event.key.toLowerCase() === "t") void runTour();
    if (event.key.toLowerCase() === "o" && !event.ctrlKey && !event.metaKey) {
      btnDroneOrbit?.click();
    }
    if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey) {
      btnSolarRealtime?.click();
    }
  });

  // 绑定移动端抽屉 (Bottom Sheet) 与景点列表弹窗交互
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

  detailClose?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (detailEl?.classList.contains("mobile-expanded")) {
      detailEl.classList.remove("mobile-expanded");
      detailEl.classList.add("mobile-peek");
    } else {
      void flyToSpace();
    }
  });

  // 移动端手势滑动：上滑展开，下滑折叠至常驻 Peek 状态
  let touchStartY = 0;
  let touchStartX = 0;
  detailEl?.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
      }
    },
    { passive: true },
  );

  detailEl?.addEventListener(
    "touchend",
    (e) => {
      if (e.changedTouches.length > 0) {
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
        if (Math.abs(deltaY) > 35 && Math.abs(deltaY) > deltaX) {
          if (deltaY < 0) {
            // 上滑展开
            detailEl?.classList.remove("mobile-peek");
            detailEl?.classList.add("mobile-expanded");
          } else {
            // 下滑折叠
            if (!detailEl || detailEl.scrollTop <= 10) {
              detailEl?.classList.remove("mobile-expanded");
              detailEl?.classList.add("mobile-peek");
            }
          }
        }
      }
    },
    { passive: true },
  );

  // 移动端列表开关
  btnMobileList?.addEventListener("click", (e) => {
    e.stopPropagation();
    panelEl?.classList.toggle("mobile-open");
    panelEl?.classList.remove("mobile-hidden");
  });

  btnPanelClose?.addEventListener("click", (e) => {
    e.stopPropagation();
    panelEl?.classList.remove("mobile-open");
    panelEl?.classList.add("mobile-hidden");
  });

  panelGrabber?.addEventListener("click", () => {
    panelEl?.classList.toggle("mobile-open");
  });

  // 点击 3D 画布空白处时，自动收起抽屉与面板，释放最大沉浸感
  const viewerEl = document.getElementById("viewer");
  viewerEl?.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      if (detailEl?.classList.contains("mobile-expanded")) {
        detailEl.classList.remove("mobile-expanded");
        detailEl.classList.add("mobile-peek");
      }
      if (panelEl?.classList.contains("mobile-open")) {
        panelEl.classList.remove("mobile-open");
        panelEl.classList.add("mobile-hidden");
      }
    }
  });

  // 绑定主题风貌分类切换
  const categoryTabs = document.getElementById("category-tabs");
  categoryTabs?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>(".cat-tab");
    if (!target) return;
    const cat = target.dataset.cat ?? "all";
    if (cat === activeCategory) return;
    activeCategory = cat;
    categoryTabs.querySelectorAll(".cat-tab").forEach((tab) => {
      tab.classList.toggle("active", tab === target);
    });
    renderList();
    if (viewer) {
      for (const wonder of WONDERS) {
        const ent = viewer.entities.getById(wonder.id);
        if (ent) {
          ent.show = activeCategory === "all" || wonder.category === activeCategory;
        }
      }
    }
    setStatus(`已切换至「${target.textContent?.trim()}」分类`);
  });

  // 绑定深度工程剖析模式 (Pentagon3D 模式)
  const btnWireframe = document.getElementById("btn-wireframe");
  const btnNightmode = document.getElementById("btn-nightmode");

  btnWireframe?.addEventListener("click", () => {
    wireframeOn = !wireframeOn;
    btnWireframe.classList.toggle("active", wireframeOn);
    btnWireframe.textContent = wireframeOn ? "📐 线框开启" : "📐 线框网格";
    if (currentWonderObj) {
      const grp = landmarkGroups.get(currentWonderObj.id);
      if (grp) {
        grp.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material;
            if (Array.isArray(m)) {
              m.forEach((mat) => {
                if ("wireframe" in mat) (mat as THREE.MeshStandardMaterial).wireframe = wireframeOn;
              });
            } else if (m && "wireframe" in m) {
              (m as THREE.MeshStandardMaterial).wireframe = wireframeOn;
            }
          }
        });
      }
    }
  });

  btnNightmode?.addEventListener("click", () => {
    landmarkNightOn = !landmarkNightOn;
    btnNightmode.classList.toggle("active", landmarkNightOn);
    btnNightmode.textContent = landmarkNightOn ? "🌙 夜间窗光" : "🌓 窗光夜景";
    if (currentWonderObj) {
      const grp = landmarkGroups.get(currentWonderObj.id);
      if (grp && typeof grp.userData?.setNightMode === "function") {
        grp.userData.setNightMode(landmarkNightOn);
      }
      if (landmarkNightOn) {
        solarController?.setPreset("night");
        updatePresetButtons("night");
      } else {
        solarController?.setPreset("noon");
        updatePresetButtons("noon");
      }
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

  // 初始化无人机航拍控制器
  droneOrbitController = new DroneOrbitController(current, () => {
    updateDroneBtn();
  });

  // 初始化 3D 热点管理器
  if (hotspotLayer) {
    hotspotManager = new HotspotManager(
      current,
      landmarkGroups,
      hotspotLayer,
      hotspotCard,
      () => {
        if (currentWonderObj) void flyToWonder(currentWonderObj);
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
      if (flying) {
        setStatus("正在飞行中，飞抵后即可开启航拍环绕");
        return;
      }
      if (!currentWonderObj || !activePivotPos) {
        setStatus("请先选择一个奇迹，再开启航拍环绕");
        return;
      }
      droneOrbitController?.start(currentWonderObj, activePivotPos);
      hotspotManager?.closeCard();
    }
    updateDroneBtn();
  });

  window.addEventListener("pagehide", () => {
    current.destroy();
  });

  setStatus("地球已启动，正在加载景点材质…");
  performance.mark("earthwonders-textures-start");
  const kit = await loadSurfaceKit();
  performance.mark("earthwonders-textures-ready");
  performance.measure("earthwonders-viewer-startup", "earthwonders-boot-start", "earthwonders-viewer-created");
  performance.measure("earthwonders-texture-loading", "earthwonders-textures-start", "earthwonders-textures-ready");

  placeLandmarks(current, kit);

  // 启动高帧率连续更新循环（驱动航拍与 3D 热点投影）
  let lastFrameTime = performance.now();
  const renderLoop = (now: number) => {
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // 确保任何飞行、降落或静止状态下，near/far 裁剪面始终实时贴合当前地心距离，
    // 杜绝 controls.enabled 为 false 期间 14,000km 巨型 near 裁剪面导致的地标消失与穿模；
    // 同时强行保持 adjustHeight = false，杜绝误触射线碰撞高度偏移导致画面位移
    if (viewer) {
      const pp = (viewer as any).postProcessing;
      if (pp?.activeEffects?.length) {
        pp.activeEffects = [];
        (viewer.renderer.raw as any).setEffects?.([]);
      }
      try {
        const raw = (viewer.controls as any)?.raw ?? viewer.controls;
        if (raw) {
          raw.adjustHeight = false;
          if (typeof raw.adjustCamera === "function") {
            raw.adjustCamera(viewer.camera.raw);
          }
        }
      } catch {
        // 忽略非致命控制层调用异常
      }
    }

    if (droneOrbitController?.isOrbiting) {
      droneOrbitController.update(dt);
    }

    hotspotManager?.update();

    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);

  // Restore idle hint only if the user hasn't already started a flight, tour, or selection
  if (!flying && !touring && selectedId === null) {
    setStatus("拖动地球 · 点击分类/列表快速飞向奇迹 · O 键航拍环绕 · T 键环球巡礼");
  }
}

void boot().catch(showError);
