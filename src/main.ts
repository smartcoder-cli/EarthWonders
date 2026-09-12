import * as THREE from "three";
import tellux from "tellux";
import { LANDMARK_BUILDERS } from "./landmarks";
import { loadSurfaceKit, type SurfaceKit } from "./surfaces";
import { SPACE_VIEW, WONDERS, type Wonder } from "./wonders";

const ARCGIS_WORLD_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const listEl = document.getElementById("wonder-list");
const detailEl = document.getElementById("detail");
const detailKicker = document.getElementById("detail-kicker");
const detailTitle = document.getElementById("detail-title");
const detailEn = document.getElementById("detail-en");
const detailBlurb = document.getElementById("detail-blurb");
const statusEl = document.getElementById("status");
const btnTour = document.getElementById("btn-tour") as HTMLButtonElement | null;
const btnSpace = document.getElementById("btn-space") as HTMLButtonElement | null;
const errorBox = document.getElementById("error-box");
const errorMsg = document.getElementById("error-msg");

function showError(err: unknown) {
  if (errorBox) errorBox.classList.remove("hidden");
  if (errorMsg) {
    errorMsg.textContent =
      err instanceof Error
        ? err.stack ?? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err);
  }
  console.error(err);
}

function setStatus(text: string) {
  if (statusEl) statusEl.textContent = text;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

let viewer: InstanceType<typeof tellux.Viewer> | null = null;
let selectedId: string | null = null;
let flying = false;
let touring = false;
let tourGeneration = 0;
const landmarkGroups = new Map<string, THREE.Group>();
let landmarksRoot: THREE.Group | null = null;

function setFlying(next: boolean) {
  flying = next;
  if (btnTour) btnTour.disabled = next && !touring;
  if (btnSpace) btnSpace.disabled = next && !touring;
}

function renderList() {
  if (!listEl) return;
  listEl.replaceChildren();
  for (const wonder of WONDERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wonder-btn" + (wonder.id === selectedId ? " active" : "");
    btn.dataset.id = wonder.id;
    btn.innerHTML = `
      <span class="idx" style="background:${wonder.color}">${wonder.index}</span>
      <span>
        <span class="name">${wonder.nameZh}</span>
        <div class="meta">${wonder.place}</div>
      </span>
    `;
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
  detailEl?.classList.remove("hidden");
}

function setControlsEnabled(enabled: boolean) {
  if (viewer) viewer.controls.enabled = enabled;
}

function flyToSpace(): Promise<void> {
  const current = viewer;
  if (!current) return Promise.resolve();
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
        setFlying(false);
        setControlsEnabled(true);
        resolve();
      },
      cancel: () => {
        setFlying(false);
        setControlsEnabled(true);
        resolve();
      },
    });
  });
}

function flyToWonder(wonder: Wonder): Promise<void> {
  const current = viewer;
  if (!current) return Promise.resolve();
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
        setFlying(false);
        setControlsEnabled(true);
        resolve();
      },
      cancel: () => {
        setFlying(false);
        setControlsEnabled(true);
        resolve();
      },
    },
    );
  });
}

async function visit(wonder: Wonder) {
  if (!viewer) return;
  touring = false;
  tourGeneration += 1;
  if (btnTour) btnTour.classList.remove("active");
  showDetail(wonder);
  setStatus(`飞向 ${wonder.nameZh}`);
  await flyToWonder(wonder);
  setStatus(`${wonder.nameZh} · ${wonder.place}`);
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
      [wonder.longitude, wonder.latitude, 0],
      { heading: wonder.modelHeading ?? 0 },
      group.matrix,
    );
    group.updateMatrixWorld(true);
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      mesh.raycast = () => {};
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

async function boot() {
  const container = document.getElementById("viewer");
  if (!(container instanceof HTMLElement)) {
    throw new Error("找不到 #viewer 容器");
  }

  renderList();
  setStatus("正在加载石材贴图…");
  const kit = await loadSurfaceKit();

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
          sunLightIntensity: 1.15,
          skyLightIntensity: 1.1,
        },
        fallbackAmbientLight: {
          enabled: true,
          intensity: 0.55,
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
  for (const wonder of WONDERS) addMarker(current, wonder);
  placeLandmarks(current, kit);
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

  setStatus("拖动地球 · 点击列表或按 1–8 飞向奇迹");
}

void boot().catch(showError);
