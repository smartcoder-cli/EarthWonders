import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  cyl,
} from "./_shared";

export function createStatueOfLiberty(kit: SurfaceKit) {
  const root = new THREE.Group();
  root.name = "StatueOfLiberty";

  // 材质体系
  const fortStone = mapped(kit.redSandstone, { color: 0x8a624a, roughness: 0.88, bumpScale: 0.32, metersPerTile: 3.5 });
  const fortPaving = mapped(kit.arena, { color: 0x9e9284, roughness: 0.9, metersPerTile: 5 });
  const pedestalBase = mapped(kit.colosseum, { color: 0xbdb09e, roughness: 0.78, bumpScale: 0.25, metersPerTile: 3 });
  const pedestalTrim = stone(0xcbc1b2, 0.68);
  const pedestalShadow = stone(0x42382e, 0.92);
  const bronzePlinth = stone(0x38322a, 0.75, 0.25);

  const copperDay = new THREE.MeshStandardMaterial({
    color: 0x62bfa5,
    roughness: 0.62,
    metalness: 0.18,
  });
  const copperDark = new THREE.MeshStandardMaterial({
    color: 0x478f79,
    roughness: 0.72,
    metalness: 0.12,
  });
  const copperHighlight = new THREE.MeshStandardMaterial({
    color: 0x76ceb6,
    roughness: 0.56,
    metalness: 0.22,
  });

  const torchGoldDay = new THREE.MeshStandardMaterial({
    color: 0xffd23f,
    roughness: 0.22,
    metalness: 0.92,
    emissive: 0xffaa00,
    emissiveIntensity: 0.35,
  });
  const torchGoldNight = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    roughness: 0.15,
    metalness: 0.95,
    emissive: 0xffb703,
    emissiveIntensity: 1.8,
  });

  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1a3340, roughness: 0.25, metalness: 0.35 });
  const lawnMat = mapped(kit.grass, { color: 0x3d6635, roughness: 0.95, metersPerTile: 10 });
  const walkMat = mapped(kit.arena, { color: 0xbdb3a4, roughness: 0.85, metersPerTile: 4 });
  const pierMat = stone(0x64748b, 0.85);

  // 1. 自由岛海堤、滨海步道与渡轮码头 (Liberty Island Pier & Promenades, y = 0 ~ 1.5m)
  cyl(root, seaMat, 118, 124, 1.2, 0, 0, 0, 32);
  const islandGround = cyl(root, walkMat, 116, 118, 1.5, 0, 0, 0, 32);
  islandGround.receiveShadow = true;

  // 西北侧（新泽西湾侧 -Z）渡轮码头栈桥，面向雕像背后广场而非正面航道
  box(root, pierMat, 14.0, 1.6, 38.0, 0, 0.4, -130.0);
  box(root, pedestalTrim, 16.0, 0.8, 18.0, 0, 1.6, -142.0); // 码头雨棚候船亭
  for (const bz of [-118, -128, -138, -146]) {
    cyl(root, bronzePlinth, 0.4, 0.4, 2.4, -7.5, 0.8, bz, 8); // 缆桩
    cyl(root, bronzePlinth, 0.4, 0.4, 2.4, +7.5, 0.8, bz, 8);
  }

  // 绿地草坪分布环与树木带
  for (const angle of [0.5, 1.1, 1.7, 2.4, 3.8, 4.4, 5.0, 5.6]) {
    const lx = Math.cos(angle) * 82;
    const lz = Math.sin(angle) * 82;
    const lawn = new THREE.Mesh(new THREE.CylinderGeometry(15, 17, 0.4, 8), lawnMat);
    lawn.position.set(lx, 1.5, lz);
    root.add(lawn);

    // 几株低多边形小树增加真实生机
    cyl(root, fortStone, 0.35, 0.45, 3.2, lx + 4, 1.7, lz + 2, 6);
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(2.4, 6, 6), lawnMat);
    foliage.position.set(lx + 4, 4.2, lz + 2);
    root.add(foliage);
  }

  // 西侧主旗杆广场 (Flagpole Plaza)
  box(root, fortPaving, 22.0, 0.3, 22.0, 0, 1.6, -72.0);
  cyl(root, stone(0xe2e8f0, 0.4, 0.6), 0.25, 0.4, 24.0, 0, 1.8, -72.0, 8); // 白漆主旗杆
  // 星条旗飘扬小网格
  const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 }));
  flagMesh.position.set(2.2, 23.5, -72.0);
  root.add(flagMesh);

  // 2. 伍德堡 11 角星形红垒 (Fort Wood 11-Pointed Star Bastion, y = 1.5 ~ 9.0m)
  const starShape = new THREE.Shape();
  const numPoints = 11;
  const outerR = 48.0;
  const innerR = 30.5;
  const totalVertices = numPoints * 2;
  for (let i = 0; i <= totalVertices; i++) {
    const theta = (i / totalVertices) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = Math.cos(theta) * r;
    const pz = Math.sin(theta) * r;
    if (i === 0) starShape.moveTo(px, pz);
    else starShape.lineTo(px, pz);
  }
  const fortGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 7.2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.8,
    bevelThickness: 0.6,
  });
  fortGeo.rotateX(Math.PI / 2);
  const fortMesh = new THREE.Mesh(fortGeo, fortStone);
  fortMesh.position.set(0, 8.7, 0);
  root.add(fortMesh);

  // 堡垒内部铺砌平台 (y = 8.7m)
  cyl(root, fortPaving, 28, 28, 0.6, 0, 8.7, 0, 24);

  // 伍德堡角堡夜间仰射投光灯 (Bastion Architectural Floodlights)
  const floodlights: THREE.SpotLight[] = [];
  const floodPositions: [number, number, number][] = [
    [-24, 9.2, -24],
    [24, 9.2, -24],
    [-24, 9.2, 24],
    [24, 9.2, 24],
  ];
  for (const [fx, fy, fz] of floodPositions) {
    const spot = new THREE.SpotLight(0xffecd1, 0, 110, 0.58, 0.45, 1.2);
    spot.position.set(fx, fy, fz);
    spot.target.position.set(0, 64, 0);
    root.add(spot);
    root.add(spot.target);
    floodlights.push(spot);
    cyl(root, bronzePlinth, 0.45, 0.55, 0.7, fx, fy - 0.2, fz, 6);
  }

  // 3. 理查德·莫里斯·亨特古典主义花岗岩基座 (Hunt Pedestal, y = 9.3 ~ 47.0m)
  // A. 基座下层台基 (Terrace Plinth, y = 9.3 ~ 16.5m)
  box(root, pedestalBase, 27.0, 3.2, 27.0, 0, 9.3, 0);
  box(root, pedestalTrim, 25.4, 0.8, 25.4, 0, 12.5, 0);
  box(root, pedestalBase, 23.8, 3.2, 23.8, 0, 13.3, 0);
  box(root, pedestalTrim, 22.4, 0.8, 22.4, 0, 16.5, 0);

  // 四方对称古典纪念碑山墙门斗与大台阶
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const portalGrp = new THREE.Group();
    box(portalGrp, pedestalBase, 8.4, 6.0, 2.2, 0, 9.5, 12.2);
    box(portalGrp, pedestalShadow, 4.2, 5.0, 0.5, 0, 9.5, 13.2);

    // 门斗外凸台阶
    for (let st = 0; st < 6; st++) {
      box(portalGrp, pedestalTrim, 7.6 - st * 0.4, 0.45, 0.6, 0, 9.5 + st * 0.4, 13.4 + (5 - st) * 0.55);
    }

    const pedimentGeo = new THREE.ConeGeometry(5.2, 2.0, 3);
    pedimentGeo.rotateY(Math.PI / 6);
    const pediment = new THREE.Mesh(pedimentGeo, pedestalTrim);
    pediment.scale.set(1, 1, 0.25);
    pediment.position.set(0, 16.5, 12.2);
    portalGrp.add(pediment);
    portalGrp.rotation.y = rot;
    root.add(portalGrp);
  }

  // B. 基座中层柱廊体 (Colonnade Tower, y = 17.3 ~ 35.0m, 收分梯形台)
  const midTower = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 10.4, 17.7, 4),
    pedestalBase
  );
  midTower.rotation.y = Math.PI / 4;
  midTower.position.set(0, 17.3 + 17.7 / 2, 0);
  root.add(midTower);

  // 四面壁柱 (Engaged Classical Pilasters) 与凹窗
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const wallGrp = new THREE.Group();
    box(wallGrp, pedestalShadow, 10.5, 14.5, 0.4, 0, 18.5, 8.4);
    for (const px of [-4.2, -1.4, 1.4, 4.2]) {
      cyl(wallGrp, pedestalTrim, 0.45, 0.5, 15.2, px, 18.2, 8.6, 8);
    }
    box(wallGrp, pedestalTrim, 12.6, 0.9, 1.2, 0, 33.6, 8.5);
    wallGrp.rotation.y = rot;
    root.add(wallGrp);
  }

  // C. 悬挑观景阳台与顶层柱顶盘 (Observation Gallery, y = 35.0 ~ 46.8m)
  box(root, pedestalTrim, 18.2, 1.2, 18.2, 0, 35.0, 0);
  box(root, bronzePlinth, 18.4, 0.9, 0.25, 0, 36.2, 8.9);
  box(root, bronzePlinth, 18.4, 0.9, 0.25, 0, 36.2, -8.9);
  box(root, bronzePlinth, 0.25, 0.9, 18.4, 8.9, 36.2, 0);
  box(root, bronzePlinth, 0.25, 0.9, 18.4, -8.9, 36.2, 0);

  // 顶层盾徽阁楼 (Attic Tier with 40 State Shields)
  box(root, pedestalBase, 15.4, 7.8, 15.4, 0, 36.2, 0);
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const shieldGrp = new THREE.Group();
    for (const sx of [-4.5, -1.5, 1.5, 4.5]) {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.35, 12), pedestalTrim);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(sx, 40.5, 7.85);
      shieldGrp.add(shield);
    }
    shieldGrp.rotation.y = rot;
    root.add(shieldGrp);
  }
  box(root, pedestalTrim, 14.2, 1.2, 14.2, 0, 44.0, 0);
  box(root, bronzePlinth, 12.0, 1.4, 12.0, 0, 45.2, 0);

  // 4. 自由女神像主体 (Statue Sculpture, y = 46.6 ~ 93.0m)
  const statueGroup = new THREE.Group();

  // A. 铜像底座与脚下断裂镣铐 (Broken Shackles & Plinth, y = 46.6 ~ 49.0m)
  box(statueGroup, copperDark, 9.6, 1.2, 9.6, 0, 46.6, 0);
  const chain1 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.2, 6, 12), bronzePlinth);
  chain1.position.set(1.4, 47.9, 2.2);
  chain1.rotation.x = Math.PI / 3;
  const chain2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 6, 12), bronzePlinth);
  chain2.position.set(2.4, 47.7, 2.6);
  chain2.rotation.y = Math.PI / 4;
  statueGroup.add(chain1, chain2);

  // B. 经典的古罗马长袍下摆与前迈步伐 (Contrapposto Lower Skirt, y = 47.8 ~ 68.0m)
  const skirtLower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 5.2, 11.5, 14),
    copperDay
  );
  skirtLower.position.set(0, 47.8 + 11.5 / 2, 0.3);
  statueGroup.add(skirtLower);

  // 裙摆深凹垂直褶皱筋线 (14 条竖向深褶折线，营造极其逼真的冲压铜皮阴影感)
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const rT = 3.65;
    const rB = 5.25;
    const fxT = Math.cos(angle) * rT;
    const fzT = Math.sin(angle) * rT;
    const fxB = Math.cos(angle) * rB;
    const fzB = Math.sin(angle) * rB;
    const foldGeo = new THREE.CylinderGeometry(0.28, 0.42, 11.6, 4);
    const fold = new THREE.Mesh(foldGeo, copperDark);
    fold.position.set((fxT + fxB) / 2, 47.8 + 11.6 / 2, (fzT + fzB) / 2 + 0.3);
    fold.rotation.y = angle;
    statueGroup.add(fold);
  }

  // C. 裙袍中段与腰身 (Waist & Stola Drapery, y = 59.3 ~ 72.5m)
  const skirtMid = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 3.7, 13.2, 14),
    copperDay
  );
  skirtMid.position.set(-0.1, 59.3 + 13.2 / 2, 0.1);
  statueGroup.add(skirtMid);

  // 斜向披肩挂布 (Mantle across chest and left shoulder)
  const mantle = new THREE.Mesh(
    new THREE.CylinderGeometry(2.9, 3.4, 8.4, 12, 1, true, 0.8, Math.PI * 1.2),
    copperHighlight
  );
  mantle.position.set(-0.1, 68.0, 0.2);
  mantle.rotation.z = -0.15;
  statueGroup.add(mantle);

  // D. 上半身、胸腔与肩膀 (Torso & Shoulders, y = 72.0 ~ 79.5m)
  box(statueGroup, copperDay, 5.2, 4.2, 2.8, -0.1, 72.0, 0.1);
  const neckDrape = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.45, 6, 12, Math.PI), copperDark);
  neckDrape.position.set(-0.1, 76.2, 1.2);
  neckDrape.rotation.x = Math.PI / 2;
  statueGroup.add(neckDrape);

  // E. 颈部与庄严古典面容 (Neck & Head, y = 76.2 ~ 83.2m)
  cyl(statueGroup, copperDay, 0.95, 1.15, 2.2, -0.1, 76.2, 0.15, 10);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.65, 12, 12), copperHighlight);
  head.scale.set(0.9, 1.15, 1.05);
  head.position.set(-0.1, 79.8, 0.25);
  statueGroup.add(head);

  // 卷曲希腊发髻与披肩发缕 (Hair locks on shoulders)
  const chignon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), copperDark);
  chignon.position.set(-0.1, 79.6, -1.2);
  statueGroup.add(chignon);
  for (const sx of [-0.9, 0.9]) {
    const hairLock = cyl(statueGroup, copperDark, 0.25, 0.35, 2.6, -0.1 + sx, 77.2, 0.2, 6);
    hairLock.rotation.z = -sx * 0.2;
  }

  // F. 七芒星日芒王冠与 25 扇视窗 (Radiate Crown & Diadem, y = 80.8 ~ 84.8m)
  const diadem = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.68, 0.9, 16, 1, true), copperDay);
  diadem.position.set(-0.1, 80.8 + 0.45, 0.25);
  statueGroup.add(diadem);

  const windowRing = new THREE.Mesh(new THREE.CylinderGeometry(1.76, 1.76, 0.35, 25, 1, true), pedestalShadow);
  windowRing.position.set(-0.1, 81.1, 0.25);
  statueGroup.add(windowRing);

  // 七道放射利芒 (7 Spikes / Rays)
  const rayAngles = [-72, -48, -24, 0, 24, 48, 72];
  for (const deg of rayAngles) {
    const rad = (deg * Math.PI) / 180;
    const rayLength = 3.6;
    const rayGeo = new THREE.ConeGeometry(0.32, rayLength, 4);
    rayGeo.rotateX(Math.PI / 2);
    const ray = new THREE.Mesh(rayGeo, copperHighlight);
    ray.position.set(-0.1 + Math.sin(rad) * 1.5, 81.6, 0.25 + Math.cos(rad) * 1.5);
    ray.rotation.y = rad;
    ray.rotation.x = -0.25;
    statueGroup.add(ray);
  }

  // G. 解剖学左手（面朝 +Z 时位于 +X 一侧）紧抱《独立宣言》法典石板 (y = 67.5 ~ 76.5m)
  const leftUpperArm = cyl(statueGroup, copperDay, 0.8, 0.9, 4.2, 2.4, 71.8, 0.3, 8);
  leftUpperArm.rotation.z = -0.45;
  const leftForeArm = cyl(statueGroup, copperDay, 0.7, 0.8, 3.8, 2.5, 68.6, 1.4, 8);
  leftForeArm.rotation.x = -0.6;
  leftForeArm.rotation.z = 0.3;

  const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.9, 4.2, 0.55), copperHighlight);
  tablet.position.set(2.6, 70.8, 1.9);
  tablet.rotation.set(0.2, -0.4, -0.15);
  statueGroup.add(tablet);
  const tabletFace = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.8, 0.08), copperDark);
  tabletFace.position.set(2.55, 70.8, 2.2);
  tabletFace.rotation.set(0.2, -0.4, -0.15);
  statueGroup.add(tabletFace);
  box(statueGroup, copperDay, 0.7, 1.2, 0.45, 1.9, 70.8, 2.2);

  // H. 解剖学右臂（面朝 +Z 时位于 -X 一侧）高擎 24K 镀金火炬 (y = 74.0 ~ 93.0m)
  const rightUpperArm = cyl(statueGroup, copperDay, 0.85, 0.95, 5.2, -2.2, 74.5, 0.2, 8);
  rightUpperArm.rotation.z = 0.15;
  const sleeve = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 8, 1, true), copperDark);
  sleeve.rotation.x = Math.PI;
  sleeve.position.set(-2.4, 75.8, 0.2);
  statueGroup.add(sleeve);

  cyl(statueGroup, copperDay, 0.65, 0.78, 5.8, -2.5, 79.5, 0.3, 8);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), copperDay);
  hand.position.set(-2.5, 85.0, 0.3);
  statueGroup.add(hand);

  cyl(statueGroup, copperDark, 0.55, 0.4, 2.8, -2.5, 85.4, 0.3, 8);
  const torchBalcony = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.9, 0.9, 12), copperHighlight);
  torchBalcony.position.set(-2.5, 87.2, 0.3);
  statueGroup.add(torchBalcony);

  // 纯金火焰雕塑 (24K Gold Leaf Flame, y = 87.5 ~ 93.0m)
  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 4.8, 8),
    torchGoldDay
  );
  flameMesh.position.set(-2.5, 87.6 + 4.8 / 2, 0.3);
  flameMesh.rotation.y = -0.4;
  flameMesh.rotation.z = -0.08;
  flameMesh.userData.isTorchFlame = true;
  statueGroup.add(flameMesh);

  // 火焰内焰璀璨光核 (Inner Radiant Core)
  const flameCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  flameCore.position.set(-2.5, 89.6, 0.3);
  flameCore.visible = false;
  statueGroup.add(flameCore);

  // 火焰点光源 (夜间照亮王冠与雕像)
  const torchLight = new THREE.PointLight(0xffb833, 0.8, 65, 1.2);
  torchLight.position.set(-2.5, 90.5, 0.3);
  torchLight.userData.isTorchLight = true;
  statueGroup.add(torchLight);

  root.add(statueGroup);

  // 5. 昼夜模式切换 (Night Lighting)
  root.userData.setNightMode = (night: boolean) => {
    flameMesh.material = night ? torchGoldNight : torchGoldDay;
    flameCore.visible = night;
    torchLight.intensity = night ? 3.5 : 0.8;
    for (const spot of floodlights) {
      spot.intensity = night ? 2.4 : 0;
    }
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 19. 巴黎拉德芳斯新凯旋门 (La Grande Arche de la Défense)
// 110.9 米空心超立方体 (Tesseract / 4D Hypercube Projection)
// 6.33° 轴线偏转、45° 倒角立体超门框、悬挂式「云朵」张拉膜 (Les Nuages)、
// 独立全景玻璃电梯井、百米前庭大台阶 (Grand Escalier) 与 CNIT 拱壳大厅
// ─────────────────────────────────────────────────────────

