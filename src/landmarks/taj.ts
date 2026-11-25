import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  type Mat,
  stone,
  gold,
  box,
  cyl,
  onionLathe,
  archSlab,
  chamferPrism,
} from "./_shared";

function iwan(parent: THREE.Object3D, marble: Mat, dark: Mat, yaw: number) {
  const g = new THREE.Group();
  const frame = archSlab(15, 24, 5.2, 2.6, true);
  const mesh = new THREE.Mesh(frame, marble);
  mesh.position.set(0, 6.2, -27.4);
  g.add(mesh);
  const inner = new THREE.Mesh(archSlab(11.5, 19, 1.4, 0.25, true), dark);
  inner.position.set(0, 6.8, -29.6);
  g.add(inner);
  const upper = new THREE.Mesh(archSlab(6.4, 8.5, 1.6, 0.7, true), marble);
  upper.position.set(0, 26, -27.6);
  g.add(upper);
  for (const x of [-11.5, 11.5]) {
    const side = new THREE.Mesh(archSlab(5.2, 8.2, 1.8, 0.7, true), marble);
    side.position.set(x, 7.2, -27.2);
    g.add(side);
    const side2 = side.clone();
    side2.position.y = 17.4;
    g.add(side2);
  }
  g.rotation.y = yaw;
  parent.add(g);
}

function minaret(parent: THREE.Object3D, marble: Mat, inlay: Mat, x: number, z: number) {
  const g = new THREE.Group();
  cyl(g, marble, 2.05, 2.5, 16, 0, 0, 0, 16);
  box(g, inlay, 6.0, 1.0, 6.0, 0, 16, 0);
  cyl(g, marble, 1.7, 2.05, 12, 0, 17, 0, 16);
  box(g, inlay, 5.2, 0.9, 5.2, 0, 29, 0);
  cyl(g, marble, 1.25, 1.7, 10, 0, 29.9, 0, 16);
  box(g, inlay, 4.4, 0.8, 4.4, 0, 39.9, 0);
  const cap = new THREE.Mesh(onionLathe(3.2, 5.0, 14), marble);
  cap.position.set(0, 40.8, 0);
  g.add(cap);
  cyl(g, gold(), 0.12, 0.2, 2.4, 0, 45.6, 0, 6);
  const lean = 0.028;
  g.position.set(x, 5, z);
  g.rotation.z = x > 0 ? lean : -lean;
  g.rotation.x = z > 0 ? -lean : lean;
  parent.add(g);
}

/** 泰姬陵：切角立方、四向伊旺、红砂岩清真寺与向外倾斜宣礼塔。 */
export function createTajMahal(kit: SurfaceKit) {
  const root = new THREE.Group();
  const marble = mapped(kit.marble, {
    // Finer marble veining and a restrained relief keep the surface readable
    // at close range without making the white stone look coarse.
    roughness: 0.4,
    metalness: 0.025,
    metersPerTile: 3.8,
    bumpScale: 0.16,
    clearcoat: 0.18,
  });
  const inlay = mapped(kit.marble, {
    // Slightly warmer, finer-grained stone separates the carved borders
    // from the main marble instead of reading as one flat white material.
    color: 0xe7d7bf,
    roughness: 0.48,
    metalness: 0.015,
    metersPerTile: 3.2,
    bumpScale: 0.1,
    clearcoat: 0.12,
  });
  const dark = mapped(kit.marble, { color: 0x6a5a50, roughness: 0.88, metersPerTile: 4 });
  const red = mapped(kit.redSandstone, { roughness: 0.86, metersPerTile: 5, bumpScale: 0.28 });
  const water = new THREE.MeshPhysicalMaterial({
    color: 0x5ea8c8,
    roughness: 0.08,
    metalness: 0.22,
    clearcoat: 0.4,
  });
  const lawn = mapped(kit.grass, { roughness: 0.98, metersPerTile: 8 });

  // 莫卧儿查尔巴赫对称大理石倒影水道（Charbagh Reflecting Pool Canal）
  const poolWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d465c,
    roughness: 0.04,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  // 主大理石基台上的几何十字水渠
  box(root, marble, 108, 5.4, 108, 0, 0, 0);
  box(root, lawn, 36, 0.45, 36, -32, 5.4, -32);
  box(root, lawn, 36, 0.45, 36, 32, 5.4, -32);
  box(root, lawn, 36, 0.45, 36, -32, 5.4, 32);
  box(root, lawn, 36, 0.45, 36, 32, 5.4, 32);
  box(root, water, 7.2, 0.4, 108, 0, 5.45, 0);
  box(root, water, 108, 0.4, 7.2, 0, 5.45, 0);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 16), water);
  pool.position.set(0, 5.7, 0);
  root.add(pool);

  // 南向大花园倒影水道（长 140m，宽 10m，自台基南缘延伸）
  box(root, marble, 12.4, 0.6, 142, 0, 0, 124); // 大理石池底与基槽
  box(root, poolWaterMat, 9.6, 0.5, 140, 0, 0.15, 124); // 高反光水面
  // 水渠两侧大理石包边矮护栏
  box(root, marble, 0.7, 0.85, 142, -5.5, 0, 124);
  box(root, marble, 0.7, 0.85, 142, 5.5, 0, 124);

  // 东西向横向交叉水道（构成经典的查尔巴赫十字水系）
  box(root, marble, 142, 0.6, 12.4, 0, 0, 124);
  box(root, poolWaterMat, 140, 0.5, 9.6, 0, 0.15, 124);
  box(root, marble, 142, 0.85, 0.7, 0, 0, 124 - 5.5);
  box(root, marble, 142, 0.85, 0.7, 0, 0, 124 + 5.5);

  // 十字水渠中央：八角形霍德·考瑟尔水上大理石水榭（Al-Hawd al-Kawthar / Diana's Seat）
  const centerPlinth = new THREE.Mesh(chamferPrism(24, 1.2, 4.5), marble);
  centerPlinth.position.set(0, 0.3, 124);
  root.add(centerPlinth);
  const centerTank = new THREE.Mesh(chamferPrism(17.5, 0.8, 3.5), poolWaterMat);
  centerTank.position.set(0, 0.7, 124);
  root.add(centerTank);
  // 戴安娜大理石纪念长椅
  box(root, marble, 2.5, 0.65, 0.8, 0, 1.5, 124);

  // 水道两列等距莲花喷泉嘴（Lotus Fountain Jets）
  for (const z of [68, 86, 104, 144, 162, 180]) {
    cyl(root, gold(), 0.3, 0.45, 0.8, 0, 0.1, z, 8);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.4, 6), poolWaterMat);
    jet.position.set(0, 1.8, z);
    root.add(jet);
  }

  // 倒影水渠两侧名闻天下的常青丝柏树林（Cypress Tree Avenue）
  const cypressMat = mapped(kit.grass, { color: 0x1b3b24, roughness: 0.92 });
  const trunkMat = stone(0x3a2818, 0.95);
  for (const z of [66, 80, 94, 108, 140, 154, 168, 182]) {
    for (const x of [-9.8, 9.8]) {
      // 树干
      cyl(root, trunkMat, 0.35, 0.45, 2.5, x, 0, z, 6);
      // 纤细高挺的锥形丝柏树冠
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.65, 11.5, 8), cypressMat);
      canopy.position.set(x, 7.5, z);
      root.add(canopy);
      // 树下圆形大理石树池
      cyl(root, marble, 2.2, 2.4, 0.3, x, 0, z, 10);
    }
  }

  const tomb = new THREE.Mesh(chamferPrism(56, 33, 11), marble);
  tomb.position.y = 5.4;
  root.add(tomb);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    iwan(root, marble, dark, yaw);
  }
  for (const [x, z] of [
    [-22, -22],
    [22, -22],
    [-22, 22],
    [22, 22],
  ] as const) {
    box(root, marble, 9.2, 7.4, 9.2, x, 38.4, z);
    const chhatri = new THREE.Mesh(onionLathe(4.8, 6.8, 16), marble);
    chhatri.position.set(x, 45.8, z);
    root.add(chhatri);
    cyl(root, gold(), 0.12, 0.18, 2.6, x, 52.4, z, 6);
  }

  cyl(root, inlay, 15.2, 16.2, 11.5, 0, 38.4, 0, 28);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), marble);
    petal.scale.set(0.38, 0.22, 0.72);
    petal.position.set(Math.cos(a) * 15.4, 49.4, Math.sin(a) * 15.4);
    petal.lookAt(0, 52, 0);
    root.add(petal);
  }
  const dome = new THREE.Mesh(onionLathe(18.2, 26, 28), marble);
  dome.position.set(0, 49.6, 0);
  root.add(dome);
  cyl(root, marble, 0.5, 0.75, 7.5, 0, 75.2, 0, 8);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), gold());
  ball.position.set(0, 83.4, 0);
  root.add(ball);
  box(root, gold(), 0.12, 2.4, 0.12, 0, 84, 0);

  minaret(root, marble, inlay, -46, -46);
  minaret(root, marble, inlay, 46, -46);
  minaret(root, marble, inlay, -46, 46);
  minaret(root, marble, inlay, 46, 46);

  // 西侧清真寺与东侧答礼殿（Jawab）：长轴沿南北（Z）排布，拱门相对朝向中央白色主陵墓
  const mosque = (x: number) => {
    const g = new THREE.Group();
    box(g, red, 26, 5.4, 44, 0, 0, 0);
    box(g, red, 16, 14, 38, 0, 5.4, 0);
    for (const dz of [-12, 0, 12]) {
      cyl(g, red, 5.2, 5.6, 4.5, 0, 19.4, dz, 16);
      const cap = new THREE.Mesh(onionLathe(5.6, 7.2, 14), marble);
      cap.position.set(0, 23.8, dz);
      g.add(cap);
    }
    const arch = new THREE.Mesh(archSlab(8, 10, 2.2, 1.2, true), dark);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(x > 0 ? -8.2 : 8.2, 7.2, 0);
    g.add(arch);
    g.position.x = x;
    root.add(g);
  };
  mosque(-82);
  mosque(82);
  return root;
}

/** 基督像：按 1931 年里约科尔科瓦多山实景比例重构：
 * 1. 宽达 5.4m 的雄伟 Art Deco 躯干柱体与肩部，彻底告别单薄的锥管躯干；
 * 2. 标志性的经典垂悬长袍广袖（袖口垂直高 3.6m，下沿优雅悬垂回拢至躯干侧肋），配 Art Deco 竖向棱面褶皱与袖口滚边；
 * 3. 臂展精确控制在 30.0 米，双手自广袖深处舒展而出，拥有宽阔圣掌与分明庄严的降福五指；
 * 4. 庄严肃穆的 Art Deco 头部、垂肩发缕、方颌短须与胸前斜披垂褶。
 */
