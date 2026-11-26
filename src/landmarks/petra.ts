import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  box,
  cyl,
  pyramidGeo,
  onionLathe,
  column,
} from "./_shared";

export function createPetra(kit: SurfaceKit) {
  const root = new THREE.Group();
  const cliff = mapped(kit.petra, { color: 0xb86352, roughness: 0.96, metersPerTile: 6, bumpScale: 0.8 });
  const cliffDark = mapped(kit.petra, { color: 0x7c382e, roughness: 0.98, metersPerTile: 5, bumpScale: 0.9 });
  const sand = mapped(kit.petra, { roughness: 0.86, metersPerTile: 5.5, bumpScale: 0.45 });
  const sandLight = mapped(kit.petra, { color: 0xffc8b0, roughness: 0.82, metersPerTile: 4.5 });
  const dark = mapped(kit.petra, { color: 0x5a241e, roughness: 0.93, metersPerTile: 4 });
  const band = mapped(kit.petra, { color: 0xcc7256, roughness: 0.95, metersPerTile: 7, bumpScale: 0.75 });
  const strata = mapped(kit.petra, { color: 0x984438, roughness: 0.97, metersPerTile: 8, bumpScale: 0.85 });

  // 1. 紧随神殿背后的阶梯状砂岩母岩山体（取代原先突兀的 110 米扁平巨盒）
  box(root, cliff, 44, 54, 16, 0, 0, 4);
  box(root, cliffDark, 48, 48, 12, 0, 0, 16);
  box(root, cliff, 36, 16, 12, 0, 52, 10);
  box(root, band, 28, 10, 10, 0, 64, 14);

  // 2. 峡谷两侧自然交错跌宕的红砂岩悬崖岩壁（自然衬托宝库立面）
  // 左侧岩壁 (西侧峡谷岩体)
  box(root, cliff, 24, 52, 28, -26, 0, 2);
  box(root, cliffDark, 20, 46, 26, -34, 0, -10);
  box(root, cliff, 18, 38, 22, -28, 0, -26);
  box(root, band, 14, 30, 18, -22, 0, -40);

  // 右侧岩壁 (东侧峡谷岩体，共同构成狭窄蜿蜒的蛇道 Siq 峡谷出口)
  box(root, cliff, 24, 50, 28, 26, 0, 2);
  box(root, cliffDark, 20, 44, 26, 34, 0, -10);
  box(root, cliff, 18, 38, 22, 28, 0, -26);
  box(root, band, 14, 28, 18, 22, 0, -40);

  // 3. 山顶自然风化起伏的风蚀岩柱与岩脊
  for (const [x, h, z, w] of [
    [-24, 12, 6, 12],
    [-12, 14, 12, 14],
    [0, 10, 16, 16],
    [14, 15, 10, 12],
    [26, 11, 4, 10],
    [-32, 9, -12, 10],
    [30, 8, -14, 10],
  ] as const) {
    box(root, strata, w, h, 10, x, 46 + Math.max(0, 8 - Math.abs(x) * 0.15), z);
  }

  // 4. 水平砂岩沉积层纹理（红砂岩层理带）
  for (let i = 0; i < 6; i++) {
    box(root, band, 42, 0.9, 1.8, 0, 6 + i * 8.5, -2.2);
    box(root, strata, 22, 0.7, 1.6, -26, 8 + i * 7.5, -6);
    box(root, strata, 22, 0.7, 1.6, 26, 8 + i * 7.5, -6);
  }

  // 5. 峡谷广场地面砂石铺装 (蛇道入口前平坦开阔地)
  box(root, sand, 38, 0.6, 48, 0, -0.3, -22);

  // 宝库立面比例校准至约 40m（实景 39.5m），上层翼楼内收不超出下层 28m 基台
  box(root, sand, 28, 18.2, 6.4, 0, 2.0, -4);
  for (let i = 0; i < 10; i++) {
    box(root, sandLight, 26 - i * 0.15, 0.2, 4.8, 0, i * 0.2, -7.4);
  }
  for (let i = 0; i < 6; i++) {
    const x = -11.5 + i * 4.6;
    column(root, sandLight, 14.6, 0.85, x, 3.6, -7.2);
    for (let flute = -2; flute <= 2; flute++) {
      box(root, band, 0.05, 10.2, 0.045, x + flute * 0.22, 5.4, -8.02);
    }
  }
  for (let i = 0; i < 13; i++) {
    const x = -11.0 + i * 1.83;
    box(root, band, 0.65, 0.85, 0.35, x, 18.25, -7.68);
    box(root, sandLight, 0.82, 0.14, 0.45, x, 18.8, -7.72);
  }
  box(root, sand, 27.5, 1.5, 6, 0, 18.1, -4.6);
  box(root, sand, 27.5, 0.8, 5.8, 0, 19.6, -4.6);
  box(root, dark, 5.6, 9.2, 2.2, 0, 3.8, -7.5);
  const doorPed = new THREE.Mesh(pyramidGeo(7.6, 2.4), sand);
  doorPed.position.set(0, 13.0, -7.1);
  doorPed.scale.set(1, 1, 0.16);
  root.add(doorPed);
  box(root, dark, 3.2, 5.8, 1.5, -8.4, 4.0, -7.3);
  box(root, dark, 3.2, 5.8, 1.5, 8.4, 4.0, -7.3);

  const ped = new THREE.Mesh(pyramidGeo(14.5, 4.0), sand);
  ped.position.set(0, 20.6, -4.2);
  ped.scale.set(1, 1, 0.18);
  root.add(ped);

  box(root, sand, 8.6, 9.2, 5.2, -9.2, 21.0, -3.8);
  box(root, sand, 8.6, 9.2, 5.2, 9.2, 21.0, -3.8);
  const leftPed = new THREE.Mesh(pyramidGeo(9.2, 3.5), sand);
  leftPed.position.set(-9.2, 30.2, -3.8);
  leftPed.scale.set(1, 1, 0.18);
  root.add(leftPed);
  const rightPed = new THREE.Mesh(pyramidGeo(9.2, 3.5), sand);
  rightPed.position.set(9.2, 30.2, -3.8);
  rightPed.scale.set(1, 1, 0.18);
  root.add(rightPed);
  box(root, dark, 2.8, 5.2, 1.3, -9.2, 22.0, -6.2);
  box(root, dark, 2.8, 5.2, 1.3, 9.2, 22.0, -6.2);
  const aedL = new THREE.Mesh(pyramidGeo(3.8, 1.3), sand);
  aedL.position.set(-9.2, 27.3, -6.0);
  aedL.scale.set(1, 1, 0.2);
  root.add(aedL);
  const aedR = aedL.clone();
  aedR.position.x = 9.2;
  root.add(aedR);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    column(root, sandLight, 8.2, 0.45, Math.cos(a) * 3.8, 21.0, -5.6 + Math.sin(a) * 1.3);
  }
  cyl(root, sand, 3.8, 3.8, 8.2, 0, 21.0, -5.6, 18);
  const tholos = new THREE.Mesh(onionLathe(4.4, 6.4, 20), sandLight);
  tholos.position.set(0, 29.2, -5.6);
  root.add(tholos);
  cyl(root, sandLight, 0.48, 0.78, 2.2, 0, 35.6, -5.6, 8);
  const urn = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), sandLight);
  urn.position.set(0, 38.6, -5.6);
  root.add(urn);
  cyl(root, sandLight, 0.3, 0.48, 1.2, 0, 39.4, -5.6, 8);

  box(root, sand, 18, 1.2, 22, 0, 0, -18);
  return root;
}

