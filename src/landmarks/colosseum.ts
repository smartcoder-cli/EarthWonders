import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  cyl,
  archSlab,
  ring,
  partialRing,
  extrudeY,
} from "./_shared";

function intactOuter(i: number, count: number) {
  const t = i / count;
  // 北侧完整的四层壮丽拱券弧面 (t 沿 0° ~ 180° 分布，对应 z <= 0 北半球)
  return t <= 0.52 || t >= 0.98;
}

/** 斗兽场：严格朝向北侧的完整四层叠柱式、残缺南看台、地宫角斗网格与瓦拉迪尔砖砌扶壁。 */
export function createColosseum(kit: SurfaceKit) {
  const root = new THREE.Group();
  const travertine = mapped(kit.colosseum, {
    color: 0xf4e6ce,
    roughness: 0.82,
    metersPerTile: 4.2,
    bumpScale: 0.55,
  });
  const trim = mapped(kit.colosseum, { color: 0xead5b4, roughness: 0.85, metersPerTile: 4 });
  const seatMat = mapped(kit.colosseum, { color: 0xdebfa0, roughness: 0.9, metersPerTile: 5 });
  const brickSpurMat = mapped(kit.wall, { color: 0xba7654, roughness: 0.92, metersPerTile: 3.5 });
  const voidMat = stone(0x2b1c14, 0.98);
  const sand = mapped(kit.arena, { color: 0xe5c898, roughness: 0.94, metersPerTile: 8, bumpScale: 0.2 });

  // 1. 北侧完整的 48.5 米高四层外圈立面 (a 从 -0.04PI 到 1.04PI，z <= 0 朝向北侧帝国大道)
  const a0 = -0.04 * Math.PI;
  const a1 = 1.04 * Math.PI;
  root.add(new THREE.Mesh(extrudeY(partialRing(96, 80, 88, 73, a0, a1, 56), 48.5), travertine));

  // 2. 南侧残缺外墙只升至两层高度 (~31米)，展露内圈看台
  root.add(new THREE.Mesh(extrudeY(ring(88, 73, 62, 50, 56), 31.5), travertine));

  // 3. 东西两侧著名的斯泰恩 (Stern) 与瓦拉迪尔 (Valadier) 19世纪砖砌大三角斜撑扶壁
  // 东侧断口扶壁 (x ~ +94m)
  const eastSpurGeo = new THREE.BufferGeometry();
  const eastSpurPts = new Float32Array([
    95, 0, -4,   95, 48.5, -4,   95, 0, 8,
    91, 0, -4,   91, 48.5, -4,   91, 0, 8,
    95, 0, -4,   91, 0, -4,      95, 48.5, -4,
    91, 0, -4,   91, 48.5, -4,   95, 48.5, -4,
    95, 48.5, -4, 91, 48.5, -4,  95, 0, 8,
    91, 48.5, -4, 91, 0, 8,      95, 0, 8,
  ]);
  eastSpurGeo.setAttribute("position", new THREE.BufferAttribute(eastSpurPts, 3));
  eastSpurGeo.computeVertexNormals();
  root.add(new THREE.Mesh(eastSpurGeo, brickSpurMat));

  // 西侧断口扶壁 (x ~ -94m)
  const westSpurGeo = new THREE.BufferGeometry();
  const westSpurPts = new Float32Array([
    -95, 0, -4,   -95, 0, 8,   -95, 48.5, -4,
    -91, 0, -4,   -91, 0, 8,   -91, 48.5, -4,
    -95, 0, -4,   -95, 48.5, -4, -91, 0, -4,
    -91, 0, -4,   -95, 48.5, -4, -91, 48.5, -4,
    -95, 48.5, -4, -95, 0, 8,   -91, 48.5, -4,
    -91, 48.5, -4, -95, 0, 8,   -91, 0, 8,
  ]);
  westSpurGeo.setAttribute("position", new THREE.BufferAttribute(westSpurPts, 3));
  westSpurGeo.computeVertexNormals();
  root.add(new THREE.Mesh(westSpurGeo, brickSpurMat));

  // 4. 内圈三层走廊拱券网格
  const dummy = new THREE.Object3D();
  const midArchGeo = archSlab(3.8, 7.6, 2.5, 0.95);
  const innerLevels = [
    { y: 2.2, count: 64, rx: 87.2, rz: 72.2 },
    { y: 15.6, count: 64, rx: 87.2, rz: 72.2 },
    { y: 28.6, count: 60, rx: 87.0, rz: 72.0 },
  ];
  let innerTotal = 0;
  for (const level of innerLevels) innerTotal += level.count;
  const innerFacade = new THREE.InstancedMesh(midArchGeo, voidMat, innerTotal);
  let k = 0;
  for (const level of innerLevels) {
    for (let i = 0; i < level.count; i++) {
      const a = (i / level.count) * Math.PI * 2;
      const x = Math.cos(a) * level.rx;
      const z = -Math.sin(a) * level.rz;
      dummy.position.set(x, level.y, z);
      dummy.lookAt(0, level.y, 0);
      dummy.updateMatrix();
      innerFacade.setMatrixAt(k++, dummy.matrix);
    }
  }
  root.add(innerFacade);

  // 5. 北侧第四层阁楼实墙与檐口 (Attic story & cornices)
  const attic = new THREE.Mesh(extrudeY(partialRing(96.8, 80.8, 90, 74.5, a0, a1, 44), 8.2), trim);
  attic.position.y = 48.5;
  root.add(attic);

  for (const y of [13.2, 25.2, 37.2]) {
    const cornice = new THREE.Mesh(extrudeY(partialRing(97.2, 81.2, 95, 79, a0, a1, 44), 0.7), trim);
    cornice.position.y = y;
    root.add(cornice);
  }

  // 6. 梯级椭圆看台 (Cavea Seating Tiers, 阶梯层层向内向下收紧)
  const podium = new THREE.Mesh(extrudeY(ring(36, 28, 32.2, 25, 48), 4.8), trim);
  podium.position.y = 1.5;
  root.add(podium);

  const cavea = [
    { ox: 62, oz: 50, ix: 54, iz: 43.6, y: 2.0, h: 2.5 },
    { ox: 54, oz: 43.6, ix: 47, iz: 38, y: 4.5, h: 2.6 },
    { ox: 47, oz: 38, ix: 41, iz: 33.2, y: 7.1, h: 2.7 },
    { ox: 41, oz: 33.2, ix: 36, iz: 28.4, y: 9.8, h: 2.8 },
    { ox: 62, oz: 50, ix: 56, iz: 45.2, y: 12.8, h: 3.2 },
    { ox: 72, oz: 58.5, ix: 62, iz: 50, y: 16.2, h: 3.4 },
    { ox: 82, oz: 66.5, ix: 72, iz: 58.5, y: 19.8, h: 3.6 },
    { ox: 90, oz: 74, ix: 82, iz: 66.5, y: 23.6, h: 3.8 },
  ];
  for (const step of cavea) {
    const mesh = new THREE.Mesh(extrudeY(ring(step.ox, step.oz, step.ix, step.iz, 52), step.h), seatMat);
    mesh.position.y = step.y;
    root.add(mesh);
  }

  // 7. 地宫角斗士通道与猛兽升降井 (Hypogeum Subterranean Labyrinth)
  for (let ix = -4; ix <= 4; ix++) {
    box(root, voidMat, 0.7, 3.6, 46, ix * 6.4, 0, 0);
  }
  for (let iz = -3; iz <= 3; iz++) {
    box(root, voidMat, 58, 3.6, 0.7, 0, 0, iz * 6.2);
  }

  // 角斗场地面：东侧重建木结构沙土地面 (Arena Sand Floor, x > 0)，西侧露出地宫石墙迷宫 (x < 0)
  const floorShape = new THREE.Shape();
  floorShape.moveTo(0, -22);
  floorShape.absellipse(0, 0, 36, 22, -Math.PI / 2, Math.PI / 2, false, 0);
  floorShape.lineTo(0, -22);
  const floorGeo = new THREE.ShapeGeometry(floorShape, 32);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, sand);
  floor.position.y = 1.4;
  root.add(floor);

  // 8. 放射状出入通道 (Vomitoria & radial aisles)
  for (let i = 0; i < 8; i++) {
    const aisle = new THREE.Group();
    box(aisle, voidMat, 3.4, 3.2, 24, 0, 2.0, -48);
    box(aisle, trim, 0.65, 3.6, 24, -2.0, 2.0, -48);
    box(aisle, trim, 0.65, 3.6, 24, 2.0, 2.0, -48);
    aisle.rotation.y = (i * Math.PI) / 4;
    root.add(aisle);
  }

  // 9. 北侧完整的 1~3 层叠柱式拱门与立柱 (Doric, Ionic, Corinthian tiers on North facade)
  const archGeo = archSlab(4.2, 8.6, 3.2, 1.0);
  const levels = [
    { y: 2.1, count: 80, rx: 95.5, rz: 79.5, rCol: 0.55 },
    { y: 15.6, count: 80, rx: 95.5, rz: 79.5, rCol: 0.5 },
    { y: 28.4, count: 76, rx: 95.3, rz: 79.3, rCol: 0.48 },
  ];
  let total = 0;
  for (const level of levels) {
    for (let i = 0; i < level.count; i++) if (intactOuter(i, level.count)) total += 1;
  }
  const arches = new THREE.InstancedMesh(archGeo, voidMat, total);
  const frames = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.48, 0.55, 11.5, 8), trim, total);
  let n = 0;
  for (const level of levels) {
    for (let i = 0; i < level.count; i++) {
      if (!intactOuter(i, level.count)) continue;
      const a = (i / level.count) * Math.PI * 2;
      const x = Math.cos(a) * level.rx;
      const z = -Math.sin(a) * level.rz;
      dummy.position.set(x, level.y, z);
      dummy.lookAt(0, level.y, 0);
      dummy.updateMatrix();
      arches.setMatrixAt(n, dummy.matrix);
      dummy.position.set(x * 0.993, level.y + 5.6, z * 0.993);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      frames.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
  }
  root.add(arches);
  root.add(frames);

  // 10. 第四层遮阳帆布（Velarium）木桅杆石制插座与窗孔
  for (let i = 0; i < 40; i++) {
    if (!intactOuter(i, 40)) continue;
    const a = (i / 40) * Math.PI * 2;
    const x = Math.cos(a) * 93.6;
    const z = -Math.sin(a) * 77.6;
    if (i % 2 === 0) {
      box(root, voidMat, 2.4, 3.4, 1.2, x, 50.2, z);
    } else {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.35, 16), trim);
      disc.rotation.z = Math.PI / 2;
      disc.position.set(Math.cos(a) * 96.2, 52.6, -Math.sin(a) * 80.2);
      disc.lookAt(0, 52.6, 0);
      root.add(disc);
    }
  }

  // 皇帝包厢 (Pulvinar) 位于南看台中轴
  const boxSeat = new THREE.Group();
  box(boxSeat, trim, 16, 7.2, 9, 0, 11.5, 48);
  box(boxSeat, voidMat, 8, 4.4, 1.4, 0, 13.2, 44);
  box(boxSeat, trim, 17.2, 1.1, 10.2, 0, 18.7, 48);
  root.add(boxSeat);

  // 桅杆支座柱
  for (let i = 0; i < 24; i++) {
    if (!intactOuter(i, 24)) continue;
    const a = (i / 24) * Math.PI * 2;
    cyl(root, trim, 0.32, 0.38, 8.5, Math.cos(a) * 94, 56.6, -Math.sin(a) * 78, 8);
  }
  return root;
}

/** 奇琴伊察：九层塔、北向羽蛇、顶庙与大球场。 */
