import * as THREE from "three";
import { LANDMARK_BUILDERS } from "./landmarks";
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

const camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.5, 4000);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.1);
sun.position.set(40, 90, 120);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xb8d4ff, 0x4a3a28, 0.85));
scene.add(new THREE.AmbientLight(0xffffff, 0.28));

scene.fog = new THREE.Fog(0x1c2230, 900, 2800);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(520, 48),
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
  chichen: { pos: [62, 36, 78], look: [0, 14, 0] },
  machu: { pos: [70, 42, 78], look: [0, 18, 2] },
  taj: { pos: [86, 48, 108], look: [0, 28, 0] },
  christ: { pos: [26, 22, 34], look: [0, 24, 0] },
};

void (async () => {
  const kit = await loadSurfaceKit();
  const build = LANDMARK_BUILDERS[wonder.id];
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
