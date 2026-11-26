import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  cyl,
  pyramidGeo,
} from "./_shared";

function makeGrandeArcheWindowTexture(isNight: boolean): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = isNight ? "#090d16" : "#3b6584";
  g.fillRect(0, 0, w, h);

  const floors = 35;
  const cols = 28;
  const floorH = h / floors;
  const colW = w / cols;

  for (let f = 0; f < floors; f++) {
    const y = f * floorH;
    for (let col = 0; col < cols; col++) {
      const x = col * colW;
      if (isNight) {
        const lit = (f * 7 + col * 13) % 4 !== 0;
        if (lit) {
          const warm = (f + col) % 3 === 0;
          g.fillStyle = warm ? "#fef08a" : "#fed7aa";
          g.fillRect(x + 1.2, y + 1.2, colW - 2.4, floorH - 2.4);
        } else {
          g.fillStyle = "#1e293b";
          g.fillRect(x + 1.2, y + 1.2, colW - 2.4, floorH - 2.4);
        }
      } else {
        g.fillStyle = "#93c5fd";
        g.fillRect(x + 1, y + 1, colW - 2, floorH - 2);
        // Spandrel band and mullion shadow
        g.fillStyle = "#e2e8f0";
        g.fillRect(x, y, colW, 1.2);
        g.fillRect(x, y, 1.2, floorH);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function makeCarraraMarbleTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  // Pure brilliant Carrara white stone base
  g.fillStyle = "#f8fafc";
  g.fillRect(0, 0, w, h);

  // Subtle natural marble veining
  g.strokeStyle = "rgba(203, 213, 225, 0.45)";
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(0, 180);
  g.bezierCurveTo(320, 240, 580, 110, 1024, 380);
  g.stroke();

  g.beginPath();
  g.moveTo(0, 680);
  g.bezierCurveTo(420, 520, 710, 890, 1024, 750);
  g.stroke();

  g.strokeStyle = "rgba(148, 163, 184, 0.3)";
  g.lineWidth = 2.0;
  g.beginPath();
  g.moveTo(220, 0);
  g.bezierCurveTo(380, 410, 180, 750, 480, 1024);
  g.stroke();

  // Geometric precast marble tile grid (16 x 16 squares = 2.8m x 2.8m modules)
  const panels = 16;
  const step = w / panels;
  g.strokeStyle = "rgba(100, 116, 139, 0.45)";
  g.lineWidth = 1.8;
  for (let i = 0; i <= panels; i++) {
    g.beginPath();
    g.moveTo(i * step, 0);
    g.lineTo(i * step, h);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * step);
    g.lineTo(w, i * step);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// 45° 倒角巨门几何体 (Direct-Cut 45° Chamfered Portal Geometry for Front & Rear Facades)
function createChamferPortalGeometry(
  voidW: number = 70.0,
  voidH: number = 74.0,
  outerW: number = 105.0,
  outerH: number = 95.4,
  baseY: number = 14.0,
  bevelD: number = 15.0,
  isRear: boolean = false
): THREE.BufferGeometry {
  const halfW = voidW / 2; // 35.0
  const innerTopY = baseY + voidH; // 88.0
  const outerHalfW = outerW / 2; // 52.5
  const outerTopY = baseY + outerH; // 109.4

  const zOuter = isRear ? -56.0 : 56.0;
  const zInner = isRear ? (-56.0 + bevelD) : (56.0 - bevelD);

  const vertices = [
    // 0: Left-bottom outer
    -outerHalfW, baseY, zOuter,
    // 1: Left-bottom inner
    -halfW, baseY, zInner,
    // 2: Left-junction outer
    -outerHalfW, innerTopY, zOuter,
    // 3: Left-junction inner
    -halfW, innerTopY, zInner,
    // 4: Left-top miter corner outer
    -outerHalfW, outerTopY, zOuter,
    // 5: Top-left outer
    -halfW, outerTopY, zOuter,
    // 6: Top-right outer
    +halfW, outerTopY, zOuter,
    // 7: Right-top miter corner outer
    +outerHalfW, outerTopY, zOuter,
    // 8: Right-junction inner
    +halfW, innerTopY, zInner,
    // 9: Right-junction outer
    +outerHalfW, innerTopY, zOuter,
    // 10: Right-bottom inner
    +halfW, baseY, zInner,
    // 11: Right-bottom outer
    +outerHalfW, baseY, zOuter,
  ];

  let indices: number[];
  if (!isRear) {
    indices = [
      0, 1, 3,  0, 3, 2,
      2, 3, 4,
      4, 3, 5,
      5, 3, 8,  5, 8, 6,
      6, 8, 7,
      7, 8, 9,
      8, 10, 11,  8, 11, 9,
    ];
  } else {
    indices = [
      0, 3, 1,  0, 2, 3,
      2, 4, 3,
      4, 5, 3,
      5, 8, 3,  5, 6, 8,
      6, 7, 8,
      7, 9, 8,
      8, 11, 10,  8, 9, 11,
    ];
  }

  const uvs: number[] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    uvs.push((vertices[i] + 55) / 110, vertices[i + 1] / 110);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// 双曲抛物面马鞍形特氟龙张拉膜 (Hyperbolic Paraboloid Saddle Membrane for Les Nuages)
function createSaddleCloudGeometry(
  width: number,
  depth: number,
  amp: number = 3.5
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, depth, 24, 24);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const hw = width / 2;
  const hd = depth / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = x / hw;
    const nz = z / hd;
    const y = amp * (-0.45 * (nx * nx) + 0.65 * (nz * nz) + 0.12 * Math.sin(nx * Math.PI * 2));
    pos.setY(i, y);
  }

  geo.computeVertexNormals();
  return geo;
}

export function createGrandeArche(kit: SurfaceKit) {
  const root = new THREE.Group();
  root.name = "GrandeArche";

  const marbleTex = makeCarraraMarbleTexture();
  const marbleWhite = new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xfafbfc,
    roughness: 0.28,
    metalness: 0.05,
  });
  const marbleBevel = new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xf1f5f9,
    roughness: 0.32,
    metalness: 0.06,
  });
  const marbleDark = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.65,
    metalness: 0.12,
  });

  const winDayTex = makeGrandeArcheWindowTexture(false);
  const winNightTex = makeGrandeArcheWindowTexture(true);

  const glassDay = new THREE.MeshStandardMaterial({
    map: winDayTex,
    color: 0xffffff,
    roughness: 0.12,
    metalness: 0.88,
  });
  const glassNight = new THREE.MeshStandardMaterial({
    map: winNightTex,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.1,
    emissiveMap: winNightTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.95,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.48,
    metalness: 0.85,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.95,
  });
  const podGlassDay = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.1,
    opacity: 0.75,
    transparent: true,
  });
  const podGlassNight = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.15,
    metalness: 0.1,
    opacity: 0.92,
    transparent: true,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85,
  });

  const cloudMatDay = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.36,
    metalness: 0.04,
    opacity: 0.92,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const cloudMatNight = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.32,
    metalness: 0.06,
    opacity: 0.96,
    transparent: true,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    side: THREE.DoubleSide,
  });

  const parvisPaving = mapped(kit.colosseum, { color: 0xcfd4dc, roughness: 0.85, metersPerTile: 10 });
  const stepsMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42 });
  const cnitConcrete = stone(0xd1d5db, 0.78, 0.1);

  // 1. 底层高架前庭平台 (Le Parvis de la Défense, y = 0 ~ 2m, 与巴黎历史轴线对齐)
  const parvis = new THREE.Mesh(new THREE.BoxGeometry(240, 2.0, 280), parvisPaving);
  parvis.position.set(0, 1.0, 0);
  root.add(parvis);

  // 广场步道中轴几何铺装地线 (Historic Axis Paving Line)
  box(root, stepsMat, 16.0, 0.2, 280.0, 0, 2.0, 0);

  // 2. 核心拱门总成：空心超立方体巨构 (The Arche Cube Superstructure)
  // 迎向巴黎历史中轴线（Axe historique 朝向 ~115.8°，Spreckelsen 偏角 6.33°，wonders.ts 中配置 modelHeading: 109.5°）
  const archCore = new THREE.Group();
  archCore.name = "ArcheCubeSuperstructure";
  root.add(archCore);

  // A. 12 根独立减震承重巨柱群 (每侧 2x3 = 6 根，两侧共 12 根)
  for (const cx of [-48.0, -39.0, +39.0, +48.0]) {
    for (const cz of [-42, 0, 42]) {
      cyl(archCore, steelMat, 2.2, 2.4, 12.0, cx, 2.0, cz, 16);
      cyl(archCore, marbleDark, 2.7, 2.7, 0.8, cx, 13.6, cz, 16);
    }
  }

  // B. 超立方体南北立柱塔楼 (South & North Office Pylons, y = 12m ~ 110.9m)
  // 1) 南侧立柱塔楼 (South Tower / Left Pylon)
  // 外侧纤薄主立面与边墙 (Outer Wall Shell: X from -54m to -52.5m, W=1.5, H=98.9, D=112)
  const southOuter = box(archCore, marbleWhite, 1.5, 98.9, 112.0, -53.25, 12.0, 0);
  southOuter.userData.keepUv = true;
  // 塔楼主办公区 (Tower Office Core: X from -52.5m to -35m, W=17.5, H=76.0, D=82, Z from -41 to +41)
  const southInner = box(archCore, marbleWhite, 17.5, 76.0, 82.0, -43.75, 12.0, 0);
  southInner.userData.keepUv = true;

  // 2) 北侧立柱塔楼 (North Tower / Right Pylon)
  // 外侧纤薄主立面与边墙 (Outer Wall Shell: X from +52.5m to +54m, W=1.5, H=98.9, D=112)
  const northOuter = box(archCore, marbleWhite, 1.5, 98.9, 112.0, +53.25, 12.0, 0);
  northOuter.userData.keepUv = true;
  // 塔楼主办公区 (Tower Office Core: X from +35m to +52.5m, W=17.5, H=76.0, D=82, Z from -41 to +41)
  const northInner = box(archCore, marbleWhite, 17.5, 76.0, 82.0, +43.75, 12.0, 0);
  northInner.userData.keepUv = true;

  // C. 顶层天桥跨梁与空中展厅 (Upper Roof Bridge & Sky Promenade, y = 88m ~ 110.9m)
  // 顶层观景露台与平顶板 (Top Roof Slab & Promenade Cap: W=105, H=1.5, D=112, y = 109.4 ~ 110.9)
  const roofUpper = box(archCore, marbleWhite, 105.0, 1.5, 112.0, 0, 109.4, 0);
  roofUpper.userData.keepUv = true;
  // 中空跨梁核心体 (Central Roof Core above Void: X from -35m to +35m, W=70, H=21.4, D=82, y = 88 ~ 109.4)
  const roofLower = box(archCore, marbleWhite, 70.0, 21.4, 82.0, 0, 88.0, 0);
  roofLower.userData.keepUv = true;
  // 顶跨左右过渡实体 (Roof Bridge Flank Blocks: W=17.5, H=21.4, D=82, y = 88 ~ 109.4)
  const roofFlankL = box(archCore, marbleWhite, 17.5, 21.4, 82.0, -43.75, 88.0, 0);
  roofFlankL.userData.keepUv = true;
  const roofFlankR = box(archCore, marbleWhite, 17.5, 21.4, 82.0, +43.75, 88.0, 0);
  roofFlankR.userData.keepUv = true;

  // D. 斯普雷克尔森四维超立方体 45° 标志性直切巨门倒角 (Spreckelsen Hypercube Direct-Cut 45° Chamfered Portal Porticos)
  // 前门洞 45° 直切大倒角 (Front Chamfer: Z = 41.0m ~ 56.0m, 直接从外轮廓切入中空中庭)
  const frontChamferGeo = createChamferPortalGeometry(70.0, 74.0, 105.0, 95.4, 14.0, 15.0, false);
  const frontChamfer = new THREE.Mesh(frontChamferGeo, marbleBevel);
  frontChamfer.userData.keepUv = true;
  archCore.add(frontChamfer);

  // 后门洞 45° 直切大倒角 (Rear Chamfer: Z = -56.0m ~ -41.0m)
  const rearChamferGeo = createChamferPortalGeometry(70.0, 74.0, 105.0, 95.4, 14.0, 15.0, true);
  const rearChamfer = new THREE.Mesh(rearChamferGeo, marbleBevel);
  rearChamfer.userData.keepUv = true;
  archCore.add(rearChamfer);

  // 倒角外缘 45° 建筑极简深影嵌线 (Sharp Negative Shadow Reveals along Outer Bevel Perimeters)
  for (const fz of [-56.0, +56.0]) {
    box(archCore, steelMat, 0.4, 95.4, 0.35, -52.5, 14.0, fz);
    box(archCore, steelMat, 0.4, 95.4, 0.35, +52.5, 14.0, fz);
    box(archCore, steelMat, 105.0, 0.4, 0.35, 0, 109.4, fz);
  }

  // E. 门洞两侧 35 层通透玻璃幕墙与水平遮阳百叶 (35-Story Reflective Glass Atrium Walls, Z = -41.0m ~ +41.0m)
  const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 74.0, 82.0), glassDay);
  leftGlass.position.set(-34.7, 51.0, 0);
  leftGlass.userData.isOfficeGlass = true;
  leftGlass.userData.keepUv = true;
  archCore.add(leftGlass);

  const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 74.0, 82.0), glassDay);
  rightGlass.position.set(+34.7, 51.0, 0);
  rightGlass.userData.isOfficeGlass = true;
  rightGlass.userData.keepUv = true;
  archCore.add(rightGlass);

  // 幕墙 35 层水平楼板挑檐与垂直龙骨 (Spandrel Louvers & Structural Fins across 82m Atrium Depth)
  for (let fl = 1; fl <= 35; fl++) {
    const fy = 14.0 + fl * 2.08;
    box(archCore, steelMat, 0.8, 0.22, 82.0, -34.7, fy, 0);
    box(archCore, steelMat, 0.8, 0.22, 82.0, +34.7, fy, 0);
  }
  for (let mi = -8; mi <= 8; mi++) {
    const mz = mi * 4.8;
    box(archCore, steelMat, 0.8, 74.0, 0.25, -34.7, 14.0, mz);
    box(archCore, steelMat, 0.8, 74.0, 0.25, +34.7, 14.0, mz);
  }

  // F. 拱洞顶棚结构网格与下照灯 (Underside Coffered Space Frame & Recessed Downlights at y = 88.0m, Z = -41m ~ +41m)
  box(archCore, marbleDark, 69.6, 0.5, 81.6, 0, 87.8, 0);
  for (let rx = -3; rx <= 3; rx++) {
    box(archCore, steelMat, 0.4, 0.6, 81.6, rx * 9.5, 87.6, 0);
  }
  for (let rz = -3; rz <= 3; rz++) {
    box(archCore, steelMat, 69.6, 0.6, 0.4, 0, 87.6, rz * 11.0);
  }

  // G. 外立面垂直窄缝采光窗带 (Exterior Recessed Ribbon Window Slots on North & South Flanks)
  const exteriorWinDay = new THREE.MeshStandardMaterial({
    map: winDayTex,
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.8,
  });
  const exteriorWinNight = new THREE.MeshStandardMaterial({
    map: winNightTex,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.2,
    emissiveMap: winNightTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.85,
  });
  const exteriorWindows: THREE.Mesh[] = [];
  for (const sx of [-54.1, +54.1]) {
    for (const oz of [-36, -12, +12, +36]) {
      const winSlot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 84.0, 3.2), exteriorWinDay);
      winSlot.position.set(sx, 58.0, oz);
      winSlot.userData.keepUv = true;
      archCore.add(winSlot);
      exteriorWindows.push(winSlot);
    }
  }

  // H. 超立方体锐利棱边勾缝饰条 (Edge Chamfer Profiles & Relief Corner Trims)
  for (const ex of [-54.0, +54.0]) {
    for (const ez of [-56.0, +56.0]) {
      box(archCore, marbleBevel, 0.5, 98.9, 0.5, ex, 12.0, ez);
    }
  }
  box(archCore, marbleBevel, 108.0, 0.6, 0.6, 0, 110.6, 56.0);
  box(archCore, marbleBevel, 108.0, 0.6, 0.6, 0, 110.6, -56.0);

  // 3. 悬挂式特氟龙「云朵」张拉膜天幕 (Les Nuages / The Suspended Clouds by Peter Rice)
  // 三组不同标高、曲率与角度的有机马鞍形双曲膜，配合高张力不锈钢拉索
  const cloudGroup = new THREE.Group();
  cloudGroup.name = "LesNuagesCanopy";

  // A) 主云朵（Z = -22..+4，在前方为独立电梯井留出净空穿行通道）
  const cloudGeo1 = createSaddleCloudGeometry(42.0, 26.0, 3.4);
  const cloud1 = new THREE.Mesh(cloudGeo1, cloudMatDay);
  cloud1.position.set(0, 36.0, -9.0);
  cloud1.userData.isCloud = true;
  cloud1.userData.keepUv = true;
  cloudGroup.add(cloud1);

  box(cloudGroup, steelMat, 42.0, 0.3, 0.3, 0, 37.2, 4.0);
  box(cloudGroup, steelMat, 42.0, 0.3, 0.3, 0, 37.2, -22.0);
  box(cloudGroup, steelMat, 0.3, 0.3, 26.0, -21.0, 34.8, -9.0);
  box(cloudGroup, steelMat, 0.3, 0.3, 26.0, +21.0, 34.8, -9.0);

  // B) 上层凌空翼幕 (Z = -35..-13)
  const cloudGeo2 = createSaddleCloudGeometry(32.0, 22.0, 2.6);
  const cloud2 = new THREE.Mesh(cloudGeo2, cloudMatDay);
  cloud2.position.set(0, 46.0, -24.0);
  cloud2.rotation.z = 0.05;
  cloud2.userData.isCloud = true;
  cloud2.userData.keepUv = true;
  cloudGroup.add(cloud2);
  box(cloudGroup, steelMat, 32.0, 0.25, 0.25, 0, 47.0, -13.0);
  box(cloudGroup, steelMat, 32.0, 0.25, 0.25, 0, 47.0, -35.0);

  // C) 下层前庭遮阳天幕 (Z = +20..+36)
  const cloudGeo3 = createSaddleCloudGeometry(34.0, 16.0, 2.0);
  const cloud3 = new THREE.Mesh(cloudGeo3, cloudMatDay);
  cloud3.position.set(0, 26.0, +28.0);
  cloud3.rotation.z = -0.04;
  cloud3.userData.isCloud = true;
  cloud3.userData.keepUv = true;
  cloudGroup.add(cloud3);
  box(cloudGroup, steelMat, 34.0, 0.25, 0.25, 0, 27.0, 36.0);
  box(cloudGroup, steelMat, 34.0, 0.25, 0.25, 0, 27.0, 20.0);

  // 高强不锈钢抗风张拉斜拉索网 (Prestressed Stainless Steel Stay Cables to Atrium Walls)
  for (const cz of [-28, -14, 0, 14, 28]) {
    const c1 = cyl(cloudGroup, steelMat, 0.08, 0.08, 38.0, -17.5, 36.0, cz, 4);
    c1.rotation.z = 0.58;
    const c2 = cyl(cloudGroup, steelMat, 0.08, 0.08, 38.0, +17.5, 36.0, cz, 4);
    c2.rotation.z = -0.58;
  }
  for (const cz of [-20, 10]) {
    const cUpper1 = cyl(cloudGroup, steelMat, 0.07, 0.07, 42.0, -17.5, 47.0, cz, 4);
    cUpper1.rotation.z = 0.62;
    const cUpper2 = cyl(cloudGroup, steelMat, 0.07, 0.07, 42.0, +17.5, 47.0, cz, 4);
    cUpper2.rotation.z = -0.62;
  }
  archCore.add(cloudGroup);

  // 4. 中空中庭独立全景玻璃电梯井（位于 Z = +12m，避开主云朵张拉膜天幕净空上升）
  const elevatorGroup = new THREE.Group();
  elevatorGroup.position.set(0, 0, 12.0);

  // 四根纵向主导轨立柱
  for (const ex of [-1.5, 1.5]) {
    for (const ez of [-1.5, 1.5]) {
      cyl(elevatorGroup, steelMat, 0.12, 0.12, 74.0, ex, 14.0, ez, 8);
    }
  }
  // 每 4 米一道的水平刚性支撑环与 K 形交叉腹杆 (Lattice Bracing Rings)
  for (let ey = 14.0; ey <= 88.0; ey += 4.0) {
    box(elevatorGroup, steelMat, 3.2, 0.18, 0.18, 0, ey, -1.5);
    box(elevatorGroup, steelMat, 3.2, 0.18, 0.18, 0, ey, 1.5);
    box(elevatorGroup, steelMat, 0.18, 0.18, 3.2, -1.5, ey, 0);
    box(elevatorGroup, steelMat, 0.18, 0.18, 3.2, 1.5, ey, 0);
  }

  // 双透明全景水滴型观光轿厢 (Two Panoramic Cylindrical Glass Pods with Chrome Caps)
  const podMeshes: THREE.Mesh[] = [];
  const elevatorLights: THREE.PointLight[] = [];
  for (const py of [38.0, 72.0]) {
    // 轿厢玻璃外壳
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 4.4, 16), podGlassDay);
    pod.position.set(0, py + 2.2, 0);
    pod.userData.keepUv = true;
    elevatorGroup.add(pod);
    podMeshes.push(pod);

    // 上下金属圆环收口
    cyl(elevatorGroup, chromeMat, 1.85, 1.85, 0.35, 0, py, 0, 16);
    cyl(elevatorGroup, chromeMat, 1.85, 1.85, 0.35, 0, py + 4.2, 0, 16);

    // 轿厢内部乘客暖光照明
    const pLight = new THREE.PointLight(0xfef08a, 0, 18, 1.6);
    pLight.position.set(0, py + 2.2, 0);
    elevatorGroup.add(pLight);
    elevatorLights.push(pLight);
  }

  // 底层通往大台阶的衔接栈桥 (Base Footbridge at y = 14m)
  box(elevatorGroup, chromeMat, 3.6, 0.5, 12.0, 0, 14.0, 6.0);
  archCore.add(elevatorGroup);

  // 5. 百米大理石前庭大台阶 (Monumental Grand Escalier, y = 2m ~ 14m, Z = 56m ~ 18m)
  // 跨度整整 70 米，横贯南北双塔之间，层层递进升入中央中庭
  const stairSteps = 24;
  const stairWidth = 70.0;
  const stairRun = 38.0;
  const stairRise = 12.0;
  for (let s = 0; s < stairSteps; s++) {
    const frac = s / stairSteps;
    const sy = 2.0 + frac * stairRise;
    const sz = 56.0 - frac * stairRun;
    const stepDepth = stairRun / stairSteps + 0.35;
    const stepHeight = stairRise / stairSteps;
    box(archCore, stepsMat, stairWidth, stepHeight, stepDepth, 0, sy, sz);
  }

  // 大台阶两侧斜向大理石护墙与观景看台 (Side Balustrade Cheek Walls, X = ±35.2m)
  for (const bx of [-35.2, +35.2]) {
    for (let s = 0; s < stairSteps; s++) {
      const frac = s / stairSteps;
      const sy = 2.0 + frac * stairRise;
      const sz = 56.0 - frac * stairRun;
      box(archCore, marbleWhite, 0.6, 1.2, stairRun / stairSteps + 0.35, bx, sy, sz);
    }
  }

  // 台阶中段休息平台与几何石凳 (Intermediate Rest Terraces & Stone Benches)
  box(archCore, stepsMat, stairWidth, 0.4, 4.0, 0, 6.0, 42.0);
  box(archCore, stepsMat, stairWidth, 0.4, 4.0, 0, 10.0, 28.0);
  for (const bx of [-22, -11, 0, 11, 22]) {
    box(archCore, marbleDark, 3.2, 0.6, 1.4, bx, 6.4, 42.0);
    box(archCore, marbleDark, 3.2, 0.6, 1.4, bx, 10.4, 28.0);
  }

  // 6. 顶层天台全景露台与天窗群 (Rooftop Belvedere Deck, y = 110.9m，保持超立方纯净平直轮廓)
  // 屋顶防风透明玻璃围栏 (Low-Profile Glass Balustrade)
  box(archCore, chromeMat, 108.0, 1.2, 0.4, 0, 110.9, 55.6);
  box(archCore, chromeMat, 108.0, 1.2, 0.4, 0, 110.9, -55.6);
  box(archCore, chromeMat, 0.4, 1.2, 111.2, 53.8, 110.9, 0);
  box(archCore, chromeMat, 0.4, 1.2, 111.2, -53.8, 110.9, 0);

  // 8 座低剖面几何金字塔型采光天窗 (8 Low-Profile Pyramid Glass Skylights)
  for (const px of [-22, -8, 8, 22]) {
    for (const pz of [-20, 20]) {
      const skylight = new THREE.Mesh(pyramidGeo(5.0, 1.2), glassDay);
      skylight.position.set(px, 110.9, pz);
      skylight.userData.keepUv = true;
      archCore.add(skylight);
      box(archCore, chromeMat, 5.4, 0.2, 5.4, px, 110.9, pz);
    }
  }

  // 中央空中展厅低矮露台核心舱 (Low-Profile Central Sky Pavilion, 严守顶部水平基准线)
  box(archCore, marbleWhite, 36.0, 1.2, 44.0, 0, 110.9, 0);

  // 7. 周边经典地标语境：CNIT 巨型三角拱壳大厅 (外移至 X=118m 避开北侧塔楼穿模)
  const cnitGroup = new THREE.Group();
  cnitGroup.position.set(118.0, 2.0, 44.0);
  cnitGroup.rotation.y = -0.32;
  const cnitShell = new THREE.Mesh(
    new THREE.ConeGeometry(46.0, 32.0, 3),
    cnitConcrete
  );
  cnitShell.rotation.y = Math.PI / 6;
  cnitShell.position.set(0, 16.0, 0);
  cnitGroup.add(cnitShell);

  const cnitGlass = new THREE.Mesh(new THREE.CylinderGeometry(39.0, 43.0, 14.0, 3, 1, true), glassDay);
  cnitGlass.rotation.y = Math.PI / 6;
  cnitGlass.position.set(0, 7.0, 0);
  cnitGlass.userData.isOfficeGlass = true;
  cnitGlass.userData.keepUv = true;
  cnitGroup.add(cnitGlass);
  root.add(cnitGroup);

  // 8. 倒角门洞与「云朵」夜间建筑泛光照明 (Undercroft & Cloud Uplight)
  // 专门投射在 45° 倒角大理石斜面的下侧洗墙泛光
  const frontChamferSpot = new THREE.SpotLight(0xffeedd, 0, 120, 0.75, 0.45, 1.2);
  frontChamferSpot.position.set(0, 14.0, 48.0);
  frontChamferSpot.target.position.set(0, 65.0, 52.0);
  archCore.add(frontChamferSpot);
  archCore.add(frontChamferSpot.target);

  // 特氟龙「云朵」专用极光蓝洗天泛光灯 (Azure Cloud Uplight)
  const cloudSpot = new THREE.SpotLight(0x38bdf8, 0, 110, 0.72, 0.45, 1.2);
  cloudSpot.position.set(0, 16.0, 0);
  cloudSpot.target.position.set(0, 42.0, 0);
  archCore.add(cloudSpot);
  archCore.add(cloudSpot.target);

  // 中庭虚空漫反射泛光 (Void Diffuse Ambient Light)
  const voidSpot = new THREE.PointLight(0xf8fafc, 0, 100, 1.4);
  voidSpot.position.set(0, 22.0, 0);
  archCore.add(voidSpot);

  // 9. 昼夜模式切换 (Night Mode Switcher)
  root.userData.setNightMode = (night: boolean) => {
    leftGlass.material = night ? glassNight : glassDay;
    rightGlass.material = night ? glassNight : glassDay;
    cnitGlass.material = night ? glassNight : glassDay;
    for (const ew of exteriorWindows) {
      ew.material = night ? exteriorWinNight : exteriorWinDay;
    }
    for (const pod of podMeshes) {
      pod.material = night ? podGlassNight : podGlassDay;
    }
    cloudGroup.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.userData?.isCloud) {
        mesh.material = night ? cloudMatNight : cloudMatDay;
      }
    });
    frontChamferSpot.intensity = night ? 3.2 : 0;
    cloudSpot.intensity = night ? 3.5 : 0;
    voidSpot.intensity = night ? 2.0 : 0;
    for (const el of elevatorLights) {
      el.intensity = night ? 1.8 : 0;
    }
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 巴黎埃菲尔铁塔 (Eiffel Tower)
// ─────────────────────────────────────────────────────────

