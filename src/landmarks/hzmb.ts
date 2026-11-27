import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";

export function createHZMB(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "HZMB";

  // 1. 材质定义 (Materials)

  const islandConcreteMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.65,
    metalness: 0.1,
  });
  const revetmentMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // 消浪扭王字块斜坡护岸
    roughness: 0.92,
    metalness: 0.06,
  });
  const armorToeMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // 水线扭王字块脚堤深灰混凝土
    roughness: 0.95,
    metalness: 0.04,
  });
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // 高强预制白灰结构混凝土/抗盐雾涂层
    roughness: 0.32,
    metalness: 0.18,
  });
  const glassDayMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // 碧蓝海洋全景隔热幕墙玻璃
    roughness: 0.08,
    metalness: 0.88,
  });
  const glassNightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb, // 夜间温暖金色/日光灯办公与展厅照明
    emissive: 0xfde047,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.92,
    metalness: 0.02,
  });
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
    metalness: 0.08,
  });
  const redRoadMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // 标志性深红陶粒抗滑降速路面
    roughness: 0.82,
    metalness: 0.05,
  });
  const plazaGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd6c4b2, // 揽胜观景广场米黄花岗岩铺装
    roughness: 0.72,
    metalness: 0.1,
  });
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.6,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.25,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.8,
  });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 0.0,
  });
  const louverMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // 纯白高光反射遮阳门架
    roughness: 0.22,
    metalness: 0.15,
  });


  // 2. 真实蚝贝造型东人工岛 (Aerodynamic Oyster Shell Island Deck)
  const shape = new THREE.Shape();
  shape.moveTo(0, 230);
  shape.bezierCurveTo(48, 225, 78, 185, 88, 130);
  shape.bezierCurveTo(96, 75, 96, -20, 86, -80);
  shape.bezierCurveTo(76, -140, 52, -195, 30, -240);
  shape.bezierCurveTo(18, -265, 8, -278, 0, -280);
  shape.bezierCurveTo(-8, -278, -18, -265, -30, -240);
  shape.bezierCurveTo(-52, -195, -76, -140, -86, -80);
  shape.bezierCurveTo(-96, -20, -96, 75, -88, 130);
  shape.bezierCurveTo(-78, 185, -48, 225, 0, 230);

  // 岛面高程基台
  const deckGeo = new THREE.ExtrudeGeometry(shape, { depth: 7.2, bevelEnabled: false });
  deckGeo.rotateX(Math.PI / 2);
  deckGeo.translate(0, 7.2, 0);
  const islandDeck = new THREE.Mesh(deckGeo, islandConcreteMat);
  islandDeck.userData.skipLines = true;
  group.add(islandDeck);

  // 消浪扭王字块斜坡护岸 (Wave-breaker Armor Revetment Slope) & 防浪墙 (Seawall Crest Parapet)
  const pts = shape.getSpacedPoints(180);
  const revPos: number[] = [];
  const toePos: number[] = [];
  const wallPos: number[] = [];
  const N = pts.length;

  for (let i = 0; i < N; i++) {
    const cur = pts[i];
    const pPrev = pts[(i - 1 + N) % N];
    const pNext = pts[(i + 1) % N];
    const dx = pNext.x - pPrev.x;
    const dy = pNext.y - pPrev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const nz = dx / len;

    // 斜坡护岸顶点: 顶缘(y=7.2m)与海平面水线(y=0.0m, 外延11.5m)
    revPos.push(cur.x, 7.2, cur.y);
    revPos.push(cur.x + nx * 11.5, 0.0, cur.y + nz * 11.5);

    // 水下消浪扭王字块脚堤 (Toe armor: 外延11.5m ~ 16.5m, y=0.0m ~ 0.8m)
    toePos.push(cur.x + nx * 11.5, 0.6, cur.y + nz * 11.5);
    toePos.push(cur.x + nx * 16.5, 0.0, cur.y + nz * 16.5);

    // 白色防浪墙顶点: 外缘与内缘 (y=7.2m ~ 8.3m, 厚0.8m)
    wallPos.push(cur.x, 7.2, cur.y);
    wallPos.push(cur.x, 8.3, cur.y);
    wallPos.push(cur.x - nx * 0.8, 8.3, cur.y - nz * 0.8);
    wallPos.push(cur.x - nx * 0.8, 7.2, cur.y - nz * 0.8);
  }

  const revIndices: number[] = [];
  const toeIndices: number[] = [];
  const wallIndices: number[] = [];
  for (let i = 0; i < N - 1; i++) {
    const t0 = 2 * i;
    const b0 = 2 * i + 1;
    const t1 = 2 * (i + 1);
    const b1 = 2 * (i + 1) + 1;
    revIndices.push(t0, b0, t1);
    revIndices.push(b0, b1, t1);

    toeIndices.push(t0, b0, t1);
    toeIndices.push(b0, b1, t1);

    const i0 = 4 * i;
    const i1 = 4 * (i + 1);
    wallIndices.push(i0 + 0, i1 + 0, i0 + 1);
    wallIndices.push(i1 + 0, i1 + 1, i0 + 1);
    wallIndices.push(i0 + 1, i1 + 1, i0 + 2);
    wallIndices.push(i1 + 1, i1 + 2, i0 + 2);
    wallIndices.push(i0 + 2, i1 + 2, i0 + 3);
    wallIndices.push(i1 + 2, i1 + 3, i0 + 3);
  }

  const revGeo = new THREE.BufferGeometry();
  revGeo.setAttribute("position", new THREE.Float32BufferAttribute(revPos, 3));
  revGeo.setIndex(revIndices);
  revGeo.computeVertexNormals();
  const revMesh = new THREE.Mesh(revGeo, revetmentMat);
  revMesh.userData.skipLines = true;

  const toeGeo = new THREE.BufferGeometry();
  toeGeo.setAttribute("position", new THREE.Float32BufferAttribute(toePos, 3));
  toeGeo.setIndex(toeIndices);
  toeGeo.computeVertexNormals();
  const toeMesh = new THREE.Mesh(toeGeo, armorToeMat);
  toeMesh.userData.skipLines = true;
  group.add(revMesh, toeMesh);

  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute("position", new THREE.Float32BufferAttribute(wallPos, 3));
  wallGeo.setIndex(wallIndices);
  wallGeo.computeVertexNormals();
  const parapetMesh = new THREE.Mesh(wallGeo, bridgeMat);
  parapetMesh.userData.skipLines = true;
  group.add(parapetMesh);

  // 岛上外环巡检通行路面
  const ringRoadGeo = new THREE.RingGeometry(76, 83, 60);
  ringRoadGeo.scale(1.02, 2.55, 1.0);
  ringRoadGeo.rotateX(-Math.PI / 2);
  const ringRoad = new THREE.Mesh(ringRoadGeo, roadMat);
  ringRoad.position.set(0, 7.25, 0);
  ringRoad.userData.skipLines = true;
  group.add(ringRoad);

  // 岛心左右侧景观绿化带
  const lawnLeftGeo = new THREE.CylinderGeometry(25, 25, 0.2, 32);
  lawnLeftGeo.scale(0.8, 1, 3.2);
  const lawnLeft = new THREE.Mesh(lawnLeftGeo, lawnMat);
  lawnLeft.position.set(-45, 7.3, -50);
  lawnLeft.userData.skipLines = true;
  const lawnRight = lawnLeft.clone();
  lawnRight.position.set(45, 7.3, -50);
  group.add(lawnLeft, lawnRight);

  // 3. 香港接线跨海预应力连续箱梁高架桥 (Hong Kong Link Marine Box-Girder Viaduct)
  // 杜绝断层或飞索塔，无缝连接岛尾 (z = -275m) 直达外海 (z = -1185m)
  const VIADUCT_START_Z = -275;
  const VIADUCT_END_Z = -1185;
  const pierSpacing = 65;
  const viaductStations: number[] = [];
  for (let sz = VIADUCT_START_Z; sz >= VIADUCT_END_Z; sz -= pierSpacing) {
    viaductStations.push(sz);
  }

  // 构建各跨连续双箱预制梁节段 (Continuous Box-Girder Spans)
  for (let i = 0; i < viaductStations.length - 1; i++) {
    const z0 = viaductStations[i];
    const z1 = viaductStations[i + 1];
    const spanLen = z0 - z1; // 65m
    const spanCenterZ = (z0 + z1) / 2;

    const t0 = Math.min(1.0, (-275 - z0) / 220);
    const y0 = 7.2 + t0 * 7.8;
    const t1 = Math.min(1.0, (-275 - z1) / 220);
    const y1 = 7.2 + t1 * 7.8;
    const spanDeckY = (y0 + y1) / 2;
    const slopeAngle = Math.atan2(y1 - y0, spanLen);

    // 左右幅预制节段双箱梁
    const spanGeo = new THREE.BoxGeometry(14.2, 3.2, spanLen + 0.4);
    spanGeo.rotateX(slopeAngle);

    const leftGirder = new THREE.Mesh(spanGeo, bridgeMat);
    leftGirder.position.set(-8.5, spanDeckY - 0.2, spanCenterZ);
    const rightGirder = new THREE.Mesh(spanGeo, bridgeMat);
    rightGirder.position.set(8.5, spanDeckY - 0.2, spanCenterZ);
    group.add(leftGirder, rightGirder);

    // 沥青行车道路面
    const roadGeo = new THREE.BoxGeometry(31.5, 0.4, spanLen + 0.4);
    roadGeo.rotateX(slopeAngle);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, spanDeckY + 1.45, spanCenterZ);
    roadMesh.userData.skipLines = true;
    group.add(roadMesh);

    // 中央防撞护栏与两侧防护墙
    const medGeo = new THREE.BoxGeometry(1.2, 1.1, spanLen + 0.4);
    medGeo.rotateX(slopeAngle);
    const medMesh = new THREE.Mesh(medGeo, barrierMat);
    medMesh.position.set(0, spanDeckY + 2.0, spanCenterZ);
    medMesh.userData.skipLines = true;

    const parGeo = new THREE.BoxGeometry(0.8, 1.2, spanLen + 0.4);
    parGeo.rotateX(slopeAngle);
    const leftParapet = new THREE.Mesh(parGeo, bridgeMat);
    leftParapet.position.set(-15.6, spanDeckY + 2.05, spanCenterZ);
    const rightParapet = new THREE.Mesh(parGeo, bridgeMat);
    rightParapet.position.set(15.6, spanDeckY + 2.05, spanCenterZ);
    group.add(medMesh, leftParapet, rightParapet);

    // 跨中中央路灯杆
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 5.0, 8), metalMat);
    lampPole.position.set(0, spanDeckY + 4.5, spanCenterZ);
    const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), lampGlowMat);
    lampHead.position.set(0, spanDeckY + 7.0, spanCenterZ);
    lampHead.userData.skipLines = true;
    group.add(lampPole, lampHead);
  }

  // 各墩位海中承台与高强耐腐蚀双肢桥墩 (Piers at Each Station)
  for (let i = 1; i < viaductStations.length; i++) {
    const pz = viaductStations[i];
    const t = Math.min(1.0, (-275 - pz) / 220);
    const deckY = 7.2 + t * 7.8;

    // 海中承台 / 沉箱基础 (Pile Cap at Waterline)
    const capGeo = new THREE.BoxGeometry(32, 3.2, 8.5);
    const cap = new THREE.Mesh(capGeo, islandConcreteMat);
    cap.position.set(0, 1.6, pz);
    group.add(cap);

    // 双肢流线型耐海水腐蚀高强混凝土桥墩
    const colHeight = Math.max(2.0, deckY - 4.5);
    const colGeo = new THREE.CylinderGeometry(2.4, 2.8, colHeight, 16);
    colGeo.scale(1.0, 1.0, 1.4);
    const leftCol = new THREE.Mesh(colGeo, islandConcreteMat);
    leftCol.position.set(-8.5, 3.2 + colHeight / 2, pz);
    const rightCol = new THREE.Mesh(colGeo, islandConcreteMat);
    rightCol.position.set(8.5, 3.2 + colHeight / 2, pz);
    group.add(leftCol, rightCol);

    // 墩顶横梁与支座垫块 (Pier Crosshead Diaphragm)
    const crosshead = new THREE.Mesh(new THREE.BoxGeometry(30, 1.6, 6.0), islandConcreteMat);
    crosshead.position.set(0, deckY - 1.2, pz);
    group.add(crosshead);
  }

  // 4. 岛尾着陆过渡段与红色抗滑降速引道 (Approach Road & Red Anti-skid Deceleration Zone)
  // 接合岛尾处 (z = -275m)
  const approachRoad = new THREE.Mesh(new THREE.BoxGeometry(31.5, 0.35, 75), roadMat);
  approachRoad.position.set(0, 7.35, -237.5);
  approachRoad.userData.skipLines = true;
  const approachMedian = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 75), barrierMat);
  approachMedian.position.set(0, 7.9, -237.5);
  approachMedian.userData.skipLines = true;
  group.add(approachRoad, approachMedian);

  // 标志性深红色高摩擦陶粒抗滑降速路面
  const redApproach = new THREE.Mesh(new THREE.BoxGeometry(27, 0.38, 40), redRoadMat);
  redApproach.position.set(0, 7.39, -180);
  redApproach.userData.skipLines = true;
  group.add(redApproach);

  // 5. 沉管隧道入口敞开段与 15 道白色连续减光罩群 (Subsea Tunnel Ramp & 15 Louver Pergolas)
  const troughLen = 135;
  const troughCenterZ = -92.5;
  const troughDrop = 11.7; // 7.2m 降至 -4.5m
  const rampSlopeAngle = Math.atan2(troughDrop, troughLen);

  // 钢筋混凝土防洪挡浪深基槽侧壁 (Trough Concrete Retaining Walls)
  const wallLGeo = new THREE.BoxGeometry(1.8, 12, troughLen);
  const wallL = new THREE.Mesh(wallLGeo, islandConcreteMat);
  wallL.position.set(-14.8, 1.5, troughCenterZ);
  const wallR = new THREE.Mesh(wallLGeo, islandConcreteMat);
  wallR.position.set(14.8, 1.5, troughCenterZ);
  group.add(wallL, wallR);

  // 敞开段红陶粒斜坡入海路面 (+rampSlopeAngle: z 越大 y 越低，由 7.2m 准确俯冲至 -4.5m)
  const rampFloorGeo = new THREE.BoxGeometry(28, 0.5, troughLen);
  rampFloorGeo.rotateX(rampSlopeAngle);
  const rampFloor = new THREE.Mesh(rampFloorGeo, redRoadMat);
  rampFloor.position.set(0, 1.35, troughCenterZ);
  rampFloor.userData.skipLines = true;
  group.add(rampFloor);

  // 15 道白色门式连续减光罩拱棚群 (15 White Light-Filtering Portal Frames)
  const pergolaGroup = new THREE.Group();
  for (let i = 0; i < 15; i++) {
    const pz = -155 + i * 8.6;
    const frac = i / 14;
    const roadY = 7.2 - frac * troughDrop;
    const beamY = roadY + 5.6; // 恒定净空 5.6m

    // 门式跨路主横梁 (厚实白漆门架)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(31.4, 1.4, 1.8), louverMat);
    beam.position.set(0, beamY, pz);
    pergolaGroup.add(beam);

    // 左右承重立柱
    const postHeight = 5.6;
    const postGeo = new THREE.BoxGeometry(1.5, postHeight, 1.8);
    const postL = new THREE.Mesh(postGeo, louverMat);
    postL.position.set(-14.2, roadY + postHeight / 2, pz);
    const postR = new THREE.Mesh(postGeo, louverMat);
    postR.position.set(14.2, roadY + postHeight / 2, pz);
    pergolaGroup.add(postL, postR);

    // 横梁下方的 4 道水平百叶遮阳格栅叶片
    for (let b = 1; b <= 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(27.5, 0.22, 0.9), louverMat);
      blade.position.set(0, beamY - b * 0.45, pz);
      pergolaGroup.add(blade);
    }
  }
  group.add(pergolaGroup);

  // 沉管隧道暗埋段主洞门端墙与双孔隧道入口 (Tunnel Portal Headwall & Dual Bores)
  const portalWall = new THREE.Mesh(new THREE.BoxGeometry(36, 14, 20), bridgeMat);
  portalWall.position.set(0, 2.5, -15);
  const boreMat = new THREE.MeshBasicMaterial({ color: 0x030712 });
  const boreLeft = new THREE.Mesh(new THREE.BoxGeometry(12.2, 6.2, 22), boreMat);
  boreLeft.position.set(-7.2, 0.0, -15);
  const boreRight = new THREE.Mesh(new THREE.BoxGeometry(12.2, 6.2, 22), boreMat);
  boreRight.position.set(7.2, 0.0, -15);
  group.add(portalWall, boreLeft, boreRight);

  // 6. 游轮型综合运营大楼与海事指挥塔 (Cruise-Ship Streamlined Terminal & Maritime Spire)
  // 真实复现层叠退台白色甲板挑檐、深蓝海洋幕墙与圆锥形指挥塔
  const cruiseGroup = new THREE.Group();
  const bldgCenterZ = 105;
  const nightWindows: THREE.Mesh[] = [];

  // 第 1 层: 裙楼大厅甲板 (Tier 1: z 35~175m, 长140m, 宽60m)
  const t1Len = 140;
  const t1Width = 60;
  const t1Y = 7.2;
  const t1Height = 5.4;

  const t1DeckGeo = new THREE.CylinderGeometry(t1Width / 2, (t1Width + 3) / 2, 0.9, 48);
  t1DeckGeo.scale(1.0, 1.0, (t1Len + 4) / t1Width);
  const t1DeckSlab = new THREE.Mesh(t1DeckGeo, bridgeMat);
  t1DeckSlab.position.set(0, t1Y + t1Height + 0.45, bldgCenterZ);
  cruiseGroup.add(t1DeckSlab);

  const t1GlassGeo = new THREE.CylinderGeometry((t1Width - 3) / 2, (t1Width - 3) / 2, t1Height, 48);
  t1GlassGeo.scale(1.0, 1.0, (t1Len - 4) / t1Width);
  const t1Glass = new THREE.Mesh(t1GlassGeo, glassDayMat);
  t1Glass.position.set(0, t1Y + t1Height / 2, bldgCenterZ);
  cruiseGroup.add(t1Glass);
  nightWindows.push(t1Glass);

  // 第 2 层: 漫步观景甲板 (Tier 2: z 46~162m, 长116m, 宽48m)
  const t2Len = 116;
  const t2Width = 48;
  const t2Y = t1Y + t1Height + 0.9;
  const t2Height = 4.8;

  const t2DeckGeo = new THREE.CylinderGeometry(t2Width / 2, (t2Width + 3) / 2, 0.9, 48);
  t2DeckGeo.scale(1.0, 1.0, (t2Len + 4) / t2Width);
  const t2DeckSlab = new THREE.Mesh(t2DeckGeo, bridgeMat);
  t2DeckSlab.position.set(0, t2Y + t2Height + 0.45, bldgCenterZ);
  cruiseGroup.add(t2DeckSlab);

  const t2GlassGeo = new THREE.CylinderGeometry((t2Width - 3) / 2, (t2Width - 3) / 2, t2Height, 48);
  t2GlassGeo.scale(1.0, 1.0, (t2Len - 4) / t2Width);
  const t2Glass = new THREE.Mesh(t2GlassGeo, glassDayMat);
  t2Glass.position.set(0, t2Y + t2Height / 2, bldgCenterZ);
  cruiseGroup.add(t2Glass);
  nightWindows.push(t2Glass);

  // 第 3 层: 驾驶桥楼上层甲板 (Tier 3: z 58~148m, 长90m, 宽38m)
  const t3Len = 90;
  const t3Width = 38;
  const t3Y = t2Y + t2Height + 0.9;
  const t3Height = 4.6;

  const t3DeckGeo = new THREE.CylinderGeometry(t3Width / 2, (t3Width + 3) / 2, 0.9, 48);
  t3DeckGeo.scale(1.0, 1.0, (t3Len + 4) / t3Width);
  const t3DeckSlab = new THREE.Mesh(t3DeckGeo, bridgeMat);
  t3DeckSlab.position.set(0, t3Y + t3Height + 0.45, bldgCenterZ);
  cruiseGroup.add(t3DeckSlab);

  const t3GlassGeo = new THREE.CylinderGeometry((t3Width - 3) / 2, (t3Width - 3) / 2, t3Height, 48);
  t3GlassGeo.scale(1.0, 1.0, (t3Len - 4) / t3Width);
  const t3Glass = new THREE.Mesh(t3GlassGeo, glassDayMat);
  t3Glass.position.set(0, t3Y + t3Height / 2, bldgCenterZ);
  cruiseGroup.add(t3Glass);
  nightWindows.push(t3Glass);

  // 第 4 层: 顶部飞翼遮阳天幕与顶层观光厅 (Tier 4 Airfoil Roof Canopy)
  const t4Len = 64;
  const t4Width = 26;
  const t4Y = t3Y + t3Height + 0.9;
  const t4Height = 4.2;

  const canopyGeo = new THREE.CylinderGeometry(t4Width / 2, (t4Width + 5) / 2, 1.8, 48);
  canopyGeo.scale(1.0, 1.0, (t4Len + 10) / t4Width);
  const canopy = new THREE.Mesh(canopyGeo, bridgeMat);
  canopy.position.set(0, t4Y + t4Height + 0.9, bldgCenterZ);
  cruiseGroup.add(canopy);

  const t4GlassGeo = new THREE.CylinderGeometry((t4Width - 2.5) / 2, (t4Width - 2.5) / 2, t4Height, 48);
  t4GlassGeo.scale(1.0, 1.0, (t4Len - 2) / t4Width);
  const t4Glass = new THREE.Mesh(t4GlassGeo, glassDayMat);
  t4Glass.position.set(0, t4Y + t4Height / 2, bldgCenterZ);
  cruiseGroup.add(t4Glass);
  nightWindows.push(t4Glass);

  // 白色圆锥形海事交通指挥控制塔 (Conical Maritime Traffic Control Spire)
  const towerConeGeo = new THREE.ConeGeometry(5.2, 12, 32);
  const towerCone = new THREE.Mesh(towerConeGeo, bridgeMat);
  towerCone.position.set(0, t4Y + t4Height + 7.0, bldgCenterZ + 10);

  // 360 度全景环形雷达调度指挥透光窗
  const bridgeRingGeo = new THREE.TorusGeometry(3.6, 1.1, 16, 32);
  const bridgeRing = new THREE.Mesh(bridgeRingGeo, glassDayMat);
  bridgeRing.position.set(0, t4Y + t4Height + 9.5, bldgCenterZ + 10);
  bridgeRing.rotateX(Math.PI / 2);
  nightWindows.push(bridgeRing);

  // 不锈钢通信与海事雷达天线桅杆
  const spireMast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 16, 12), metalMat);
  spireMast.position.set(0, t4Y + t4Height + 20.0, bldgCenterZ + 10);

  // 红色航空航空障碍指示信标 (Red Aviation Obstruction Beacon)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), beaconMat);
  beacon.position.set(0, t4Y + t4Height + 28.0, bldgCenterZ + 10);
  beacon.userData.skipLines = true;

  cruiseGroup.add(towerCone, bridgeRing, spireMast, beacon);
  group.add(cruiseGroup);

  // 7. 岛头半圆形揽胜观景广场 (Bow Scenic Observation Plaza)
  const plazaGeo = new THREE.CylinderGeometry(28, 28, 0.3, 48);
  const plaza = new THREE.Mesh(plazaGeo, plazaGoldMat);
  plaza.position.set(0, 7.35, 198);
  plaza.userData.skipLines = true;
  group.add(plaza);

  const plazaLawnGeo = new THREE.RingGeometry(29, 36, 48);
  plazaLawnGeo.rotateX(-Math.PI / 2);
  const plazaLawn = new THREE.Mesh(plazaLawnGeo, lawnMat);
  plazaLawn.position.set(0, 7.36, 198);
  plazaLawn.userData.skipLines = true;
  group.add(plazaLawn);

  // 8. 南侧海事综合救援巡航专用码头 (modelHeading=-75 下 +X 为南侧)
  const wharfGeo = new THREE.BoxGeometry(26, 3.8, 48);
  const wharf = new THREE.Mesh(wharfGeo, islandConcreteMat);
  wharf.position.set(98, 3.8, 10);
  wharf.userData.skipLines = true;
  group.add(wharf);

  // 码头下部支撑桩基 (Marine Concrete Pilings)
  for (let px = 90; px <= 106; px += 8) {
    for (let pz = -10; pz <= 30; pz += 12) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4.2, 12), islandConcreteMat);
      piling.position.set(px, 2.1, pz);
      group.add(piling);
    }
  }

  // 两艘海事救援巡逻艇 (Patrol Boats)
  for (let b = 0; b < 2; b++) {
    const boatZ = -2 + b * 20;
    const boatHullGeo = new THREE.BoxGeometry(5.2, 2.2, 14);
    const boatHull = new THREE.Mesh(boatHullGeo, bridgeMat);
    boatHull.position.set(115, 1.8, boatZ);
    const boatCabin = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.8, 7.0), glassDayMat);
    boatCabin.position.set(115, 3.4, boatZ - 1.0);
    group.add(boatHull, boatCabin);
  }

  // 9. 昼夜模式切换联动响应 (Day / Night Mode Handler)
  group.userData.setNightMode = (isNight: boolean) => {
    lampGlowMat.emissiveIntensity = isNight ? 2.4 : 0.0;
    beaconMat.emissiveIntensity = isNight ? 3.5 : 0.8;
    nightWindows.forEach((w) => {
      w.material = isNight ? glassNightMat : glassDayMat;
    });
  };

  return group;
}

// --- 16. 旧金山金门大桥 (Golden Gate Bridge) 精细化与精准南北朝向重构 ---
