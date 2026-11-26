import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  box,
  cyl,
  frustumGeo,
  addPyramidArrisFeatures,
  serpentHead,
} from "./_shared";

export function createChichenItza(kit: SurfaceKit) {
  const root = new THREE.Group();
  const lime = mapped(kit.chichen, { roughness: 0.9, metersPerTile: 3.6, bumpScale: 0.42 });
  const dark = mapped(kit.chichen, { color: 0xb08050, roughness: 0.9, metersPerTile: 3.2 });
  const accent = mapped(kit.chichen, { color: 0xe8c890, roughness: 0.86, metersPerTile: 3.4 });
  const comb = mapped(kit.chichen, { color: 0xd4a060, roughness: 0.88, metersPerTile: 3 });
  const plaza = mapped(kit.chichen, { color: 0xdcc8a0, roughness: 0.94, metersPerTile: 8 });

  box(root, plaza, 92, 0.55, 92, 0, -0.5, 0);

  let y = 0;
  let size = 55.3;
  for (let i = 0; i < 9; i++) {
    const next = size - 4.35;
    const layer = new THREE.Mesh(frustumGeo(size, next + 0.45, 2.65), i % 2 ? accent : lime);
    layer.position.y = y;
    root.add(layer);
    const inset = size * 0.72;
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const panel = new THREE.Group();
      box(panel, dark, inset * 0.22, 1.55, 0.35, -inset * 0.28, y + 0.45, -size / 2 + 0.15);
      box(panel, dark, inset * 0.22, 1.55, 0.35, inset * 0.28, y + 0.45, -size / 2 + 0.15);
      panel.rotation.y = yaw;
      root.add(panel);
    }
    y += 2.65;
    size = next;
  }

  // 为玛雅库库尔坎金字塔主塔增加四角通天大脊线与棱角过渡
  addPyramidArrisFeatures(root, 55.3, y, 0, 0x2c271e, 0x9a8462);

  box(root, lime, 13.6, 6.4, 13.6, 0, y, 0);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const door = new THREE.Group();
    box(door, dark, 3.4, 4.6, 1.2, 0, y + 0.4, -6.6);
    door.rotation.y = yaw;
    root.add(door);
  }
  cyl(root, dark, 0.45, 0.55, 5.2, -1.6, y + 0.3, -6.4, 8);
  cyl(root, dark, 0.45, 0.55, 5.2, 1.6, y + 0.3, -6.4, 8);
  box(root, comb, 13.4, 3.4, 1.8, 0, y + 6.4, 0);
  for (let i = 0; i < 7; i++) {
    box(root, comb, 1.1, 2.4, 1.2, -5.4 + i * 1.8, y + 9.8, 0);
  }

  for (const dir of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const stair = new THREE.Group();
    for (let i = 0; i < 32; i++) {
      box(stair, dark, 8.2, 0.55, 1.15, 0, i * 0.75, -28.8 + i * 0.88);
    }
    box(stair, accent, 1.15, 24, 1.15, -4.7, 0, -15);
    box(stair, accent, 1.15, 24, 1.15, 4.7, 0, -15);
    if (dir === 0) {
      // 羽蛇神头仅设于北侧主阶梯底端，且吻部朝北（-Z）向外
      serpentHead(stair, dark, -4.6, -30.2, Math.PI);
      serpentHead(stair, dark, 4.6, -30.2, Math.PI);
    }
    stair.rotation.y = dir;
    root.add(stair);
  }

  const court = new THREE.Group();
  box(court, lime, 12, 8.2, 96, -22, 0, 0);
  box(court, lime, 12, 8.2, 96, 22, 0, 0);
  box(court, accent, 36, 1.1, 8, 0, 0, -50);
  box(court, accent, 36, 1.1, 8, 0, 0, 50);
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.28, 8, 16), accent);
  ringL.position.set(-16.2, 6.4, 0);
  ringL.rotation.y = Math.PI / 2;
  const ringR = ringL.clone();
  ringR.position.x = 16.2;
  court.add(ringL, ringR);
  // 大球场位于库库尔坎西北方（modelHeading=198 下 -X 为西偏北，-Z 为北偏东）
  court.position.set(-118, 0, -88);
  root.add(court);

  const caracol = new THREE.Group();
  box(caracol, lime, 28, 3.2, 28, 0, 0, 0);
  cyl(caracol, accent, 9.2, 10, 14, 0, 3.2, 0, 22);
  cyl(caracol, lime, 7.0, 7.4, 8, 0, 17.2, 0, 18);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(7.4, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    lime,
  );
  dome.position.set(0, 25.4, 0);
  caracol.add(dome);
  box(caracol, dark, 3.2, 4.4, 1.2, 0, 5.5, -10);
  box(caracol, dark, 2.2, 2.6, 1.1, 3.4, 19, -6.6);
  caracol.position.set(-72, 0, 58);
  root.add(caracol);
  return root;
}

