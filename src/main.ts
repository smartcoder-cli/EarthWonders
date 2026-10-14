import * as THREE from "three";
import tellux from "tellux";
import { LANDMARK_BUILDERS } from "./landmarks";
import { loadSurfaceKit, type SurfaceKit } from "./surfaces";
import { installTileProvider } from "./tileProvider";
import { SPACE_VIEW, WONDERS, type Wonder } from "./wonders";

// 启动阶段立即安装智能瓦片提供器拦截器，确保所有地图瓦片请求均受级联与重采样保护
installTileProvider();

const ARCGIS_WORLD_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const listEl = document.getElementById("wonder-list");
const detailEl = document.getElementById("detail");
const detailKicker = document.getElementById("detail-kicker");
const detailTitle = document.getElementById("detail-title");
const detailEn = document.getElementById("detail-en");
const detailBlurb = document.getElementById("detail-blurb");
const comparisonEl = document.getElementById("photo-comparison");
const comparisonImage = document.getElementById("comparison-image") as HTMLImageElement | null;
const comparisonSource = document.getElementById("comparison-source") as HTMLAnchorElement | null;
const comparisonCredit = document.getElementById("comparison-credit"); 

const REFERENCE_PHOTOS: Record<string, { image: string; page: string; credit: string; alt: string }> = {
  giza: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Great%20Pyramid%20of%20Giza.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Great_Pyramid_of_Giza.jpg",
    credit: "照片：kallerna / Wikimedia Commons · CC BY-SA 3.0",
    alt: "吉萨金字塔实景照片",
  },
  wall: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Badaling%20China%20Great-Wall-of-China-01.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Badaling_China_Great-Wall-of-China-01.jpg",
    credit: "照片：CEphoto, Uwe Aranas / Wikimedia Commons · CC BY-SA 3.0",
    alt: "八达岭长城实景照片",
  },
  petra: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Petra.%20Front%20view%20of%20Temple%20of%20el-Khazneh%20LOC%20matpc.06878.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Petra._Front_view_of_Temple_of_el-Khazneh_LOC_matpc.06878.jpg",
    credit: "照片：美国国会图书馆 Matson Collection / Wikimedia Commons（公有领域）",
    alt: "佩特拉宝库正面历史实景照片",
  },
  colosseum: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum%20-%20exterior.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Colosseum_-_exterior.jpg",
    credit: "照片：Wikimedia Commons · Colosseum - exterior.jpg",
    alt: "罗马斗兽场外观实景照片",
  },
  chichen: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/El%20Castillo%2C%20Chich%C3%A9n%20Itz%C3%A1.jpg",
    page: "https://commons.wikimedia.org/wiki/File:El_Castillo,_Chich%C3%A9n_Itz%C3%A1.jpg",
    credit: "照片：Jaakko Sakari Reinikainen / Wikimedia Commons",
    alt: "奇琴伊察库库尔坎金字塔实景照片",
  },
  machu: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Machu%20Picchu%20with%20Huayna%20Picchu%20P%C3%A9rou%20%287%29.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Machu_Picchu_with_Huayna_Picchu_P%C3%A9rou_(7).jpg",
    credit: "照片：Pierre Andre Leclercq / Wikimedia Commons",
    alt: "马丘比丘与瓦伊纳比丘实景照片",
  },
  taj: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Taj%20Mahal%20frontal.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Taj_Mahal_frontal.jpg",
    credit: "照片：Marsmux / Wikimedia Commons · CC BY-SA 4.0",
    alt: "泰姬陵完整正面实景照片，包含中央穹顶与四座宣礼塔",
  },
  christ: {
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Christ%20the%20Redeemer-%28Corcovado%29%20front%20view.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer-(Corcovado)_front_view.jpg",
    credit: "照片：Wikimedia Commons · Christ the Redeemer (Corcovado) front view",
    alt: "基督像正面实景照片",
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

function renderList() {
  if (!listEl) return;
  listEl.replaceChildren();
  for (const wonder of WONDERS) {
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

function showDetail(wonder: Wonder) {
  selectedId = wonder.id;
  renderList();
  if (detailKicker) {
    detailKicker.textContent = `${String(wonder.index).padStart(2, "0")} / 08 · ${wonder.completed}`;
  }
  if (detailTitle) detailTitle.textContent = wonder.nameZh;
  if (detailEn) detailEn.textContent = `${wonder.nameEn} · ${wonder.place}`;
  if (detailBlurb) detailBlurb.textContent = wonder.blurb;

  const photo = REFERENCE_PHOTOS[wonder.id];
  if (comparisonEl && comparisonImage && comparisonSource && comparisonCredit) {
    if (photo) {
      comparisonImage.classList.remove("image-unavailable");
      comparisonImage.alt = photo.alt;
      comparisonImage.src = photo.image;
      comparisonSource.href = photo.page;
      comparisonCredit.textContent = photo.credit;
      comparisonImage.onerror = () => {
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
  detailEl?.classList.remove("hidden");
}
function setControlsEnabled(enabled: boolean) {
  if (viewer) viewer.controls.enabled = enabled;
}

function flyToSpace(): Promise<void> {
  const current = viewer;
  if (!current) return Promise.resolve();
  const flight = ++flightGeneration;
  selectedId = null;
  renderList();
  detailEl?.classList.add("hidden");
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
          setFlying(false);
          setControlsEnabled(true);
        }
        resolve();
      },
      cancel: () => {
        if (flight === flightGeneration) {
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
            const rawControls = (current.controls as { raw?: { pivotPoint?: THREE.Vector3; pivotMesh?: THREE.Object3D } })?.raw ?? (current.controls as { pivotPoint?: THREE.Vector3; pivotMesh?: THREE.Object3D });
            if (rawControls?.pivotPoint) {
              rawControls.pivotPoint.copy(targetPos);
              rawControls.pivotMesh?.position.copy(targetPos);
            }
          } catch {
            // 忽略非致命同步异常
          }

          setFlying(false);
          setControlsEnabled(true);
        }
        resolve();
      },
      cancel: () => {
        if (flight === flightGeneration) {
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
  touring = true;
  const generation = ++tourGeneration;
  if (btnTour) {
    btnTour.classList.add("active");
    btnTour.textContent = "巡礼中…";
  }
  setStatus("开始环球巡礼");
  for (const wonder of WONDERS) {
    if (!touring || generation !== tourGeneration) break;
    showDetail(wonder);
    setStatus(`巡礼 ${wonder.index}/8 · ${wonder.nameZh}`);
    await flyToWonder(wonder);
    if (!touring || generation !== tourGeneration) break;
    setStatus(`等待地图加载 · ${wonder.nameZh}`);
    await waitForMapTiles();
    if (!touring || generation !== tourGeneration) break;
    setStatus(`巡礼 ${wonder.index}/8 · ${wonder.nameZh}`);
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
        show: true,
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
        show: true,
        coverage: 0.28,
        quality: "low",
      },
    },
    postProcess: {
      toneMapping: {
        enabled: true,
        mode: "agx",
        exposure: 5,
      },
      lensFlare: {
        enabled: true,
      },
      smaa: { enabled: true },
    },
  });

  viewer = current;
  (window as unknown as { __viewer: unknown }).__viewer = current;
  configureTilesetOptimization(current);
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
    const index = Number(event.key);
    if (index >= 1 && index <= 8) {
      const wonder = WONDERS[index - 1];
      if (wonder) void visit(wonder);
    }
    if (event.key === "Escape") {
      stopTour();
      void flyToSpace();
    }
    if (event.key.toLowerCase() === "t") void runTour();
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

  // Restore idle hint only if the user hasn't already started a flight, tour, or selection
  if (!flying && !touring && selectedId === null) {
    setStatus("拖动地球 · 点击列表或按 1–8 飞向奇迹");
  }
}

void boot().catch(showError);
