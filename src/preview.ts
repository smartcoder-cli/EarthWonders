import * as THREE from "three";
import { loadLandmarkBuilder } from "./landmarks";
import { loadSurfaceKit } from "./surfaces";
import { WONDERS } from "./wonders";

const params = new URLSearchParams(window.location.search);
const id = params.get("id") ?? "giza";
const wonder = WONDERS.find((item) => item.id === id) ?? WONDERS[0];

const stage = document.getElementById("stage") as HTMLElement;
const label = document.getElementById("label") as HTMLElement;
label.textContent = `${wonder.index} ${wonder.nameZh} · loading textures`;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
stage.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c2230);

const camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.5, 6500);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.1);
sun.position.set(40, 90, 120);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xb8d4ff, 0x4a3a28, 0.85));
scene.add(new THREE.AmbientLight(0xffffff, 0.28));

scene.fog = new THREE.Fog(0x1c2230, 1800, 5600);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(1800, 48),
  new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.4;
scene.add(ground);

const FRAMES: Record<string, { pos: [number, number, number]; look: [number, number, number] }> = {
  giza: { pos: [155, 72, 195], look: [0, 42, 0] },
  wall: { pos: [168, 78, 196], look: [8, 20, -12] },
  petra: { pos: [2, 30, -82], look: [0, 24, 0] },
  colosseum: { pos: [175, 78, 155], look: [0, 26, 0] },
  chichen: { pos: [72, 46, 92], look: [-18, 10, -10] },
  machu: { pos: [70, 42, 78], look: [0, 18, 2] },
  taj: { pos: [86, 48, 108], look: [0, 28, 0] },
  christ: { pos: [26, 22, 34], look: [0, 24, 0] },
  pentagon: { pos: [320, 160, 320], look: [0, 12, 0] },
  fast: { pos: [380, 280, 380], look: [0, 80, 0] },
  burj: { pos: [540, 560, 860], look: [0, 415, 0] },
  apple: { pos: [340, 180, 340], look: [0, 15, 0] },
  sydney: { pos: [118, 70, 128], look: [-15, 28, -15] },
  globalcenter: { pos: [-380, 210, 310], look: [0, 55, 0] },
  hzmb: { pos: [420, 180, 260], look: [0, 25, 0] },
  goldengate: { pos: [1080, 360, 960], look: [0, 85, 0] },
  svalbard: { pos: [24, 16, 36], look: [0, 8, 4] },
  liberty: { pos: [65, 55, 75], look: [0, 48, 0] },
  defense: { pos: [140, 95, 175], look: [0, 55, 0] },
  eiffel: { pos: [280, 190, 330], look: [0, 155, 0] },
  parthenon: { pos: [68, 38, 85], look: [0, 12, 0] },
  futuremuseum: { pos: [128, 36, 52], look: [0, 36, 0] },
  sagrada: { pos: [150, 110, 170], look: [0, 85, 0] },
};

void (async () => {
  const kit = await loadSurfaceKit();
  const build = await loadLandmarkBuilder(wonder.id);
  if (!build) {
    label.textContent = `missing builder ${wonder.id}`;
    return;
  }
  const group = build(kit);
  scene.add(group);
  const frame = FRAMES[wonder.id];
  if (frame) {
    camera.position.set(...frame.pos);
    camera.lookAt(...frame.look);
  } else {
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 20);
    camera.position.set(center.x + radius * 0.95, center.y + radius * 0.45, center.z + radius * 1.15);
    camera.lookAt(center);
  }
  label.textContent = `${wonder.index} ${wonder.nameZh} · ${wonder.nameEn}`;
  label.dataset.ready = "1";
  (window as any).__preview = { camera, scene, group };
  const tick = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
})().catch((err) => {
  label.textContent = err instanceof Error ? err.message : String(err);
});

window.addEventListener("resize", () => {
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth, stage.clientHeight);
});
