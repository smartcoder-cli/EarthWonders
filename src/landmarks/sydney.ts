import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";

function makeSydneyTileTexture(): THREE.CanvasTexture {
  const sz = 1024;
  const c = document.createElement("canvas");
  c.width = sz;
  c.height = sz;
  const g = c.getContext("2d")!;

  // 瑞典 Höganäs 自洁瓷砖底色：珍珠微光纯白
  g.fillStyle = "#fafaf9";
  g.fillRect(0, 0, sz, sz);

  // 绘制标志性人字形（Chevron）交错拼贴瓦盖（Tile Lids）网格
  const lidW = 32;
  const lidH = 64;
  for (let y = 0; y < sz; y += lidH) {
    const row = Math.floor(y / lidH);
    for (let x = 0; x < sz; x += lidW) {
      const col = Math.floor(x / lidW);
      const isMatte = (row + col) % 3 === 0;
      // 交错乳白高光瓷砖与浅暖米色哑光瓷砖
      g.fillStyle = isMatte ? "#ede7dc" : "#ffffff";
      g.fillRect(x + 1, y + 1, lidW - 2, lidH - 2);

      // 人字形微斜对角分格微纹
      g.strokeStyle = "rgba(180, 168, 145, 0.28)";
      g.lineWidth = 1;
      g.beginPath();
      if ((row + col) % 2 === 0) {
        g.moveTo(x + 1, y + 1);
        g.lineTo(x + lidW - 1, y + lidH - 1);
      } else {
        g.moveTo(x + lidW - 1, y + 1);
        g.lineTo(x + 1, y + lidH - 1);
      }
      g.stroke();
    }
  }

  // 瓦盖间隙主勾缝线
  g.strokeStyle = "rgba(150, 138, 120, 0.4)";
  g.lineWidth = 1.5;
  for (let y = 0; y <= sz; y += lidH) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(sz, y);
    g.stroke();
  }
  for (let x = 0; x <= sz; x += lidW) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, sz);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

interface UtzonVaultOptions {
  spanW: number;
  peakH: number;
  depthD: number;
  facing: 1 | -1;
  hasGlass?: boolean;
  glassCantilever?: number;
  glassBaseY?: number; // 允许高侧窗玻璃底部悬空于前厅屋顶之上
  tileMat: THREE.Material;
  ridgeMat: THREE.Material;
  archRimMat: THREE.Material;
  glassMat: THREE.Material;
  mullionMat: THREE.Material;
}

// 乌松经典单母球曲率风帆壳顶构建器 (Spherical Solution Utzon Vault)
function makeUtzonSphericalVault(opts: UtzonVaultOptions): THREE.Group {
  const vault = new THREE.Group();
  const {
    spanW,
    peakH,
    depthD,
    facing,
    hasGlass = true,
    glassCantilever = 12,
    glassBaseY = 0,
    tileMat,
    ridgeMat,
    archRimMat,
    glassMat,
    mullionMat,
  } = opts;

  const segsU = 32;
  const segsV = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 左右对称双翼球面三角形半壳体 (Left and Right Spherical Triangle Half-Shells)
  for (let side = -1; side <= 1; side += 2) {
    const startIdx = positions.length / 3;

    for (let i = 0; i <= segsU; i++) {
      const u = i / segsU;
      // 真实乌松圆弧母球脊梁曲线：顶点在 u=0 处昂首挺立，沿余弦母球平滑顺应至基座铰点 u=1 (到达地面 ry=0)
      const ry = peakH * Math.cos(Math.pow(u, 1.35) * Math.PI * 0.5);
      const rz = -facing * (u * depthD);

      // 横向展开半宽度：前端开阔，后部收拢汇聚至铰接支承点 (w -> 0.8m)
      const w = (spanW * 0.5) * Math.cos(u * Math.PI * 0.5) + 0.8;

      for (let j = 0; j <= segsV; j++) {
        const v = j / segsV;
        const ang = v * Math.PI * 0.5;
        // 沿侧翼横向展开之哥特式尖拱圆弧（v=0 处具有锐利的脊脊尖线）
        const cy0 = Math.max(0, ry * Math.pow(Math.cos(ang), 0.72));
        const cx0 = side * w * Math.sin(ang);

        // 前开口圆弧在三维母球上的前后凹凸自适
        const deltaZ = -facing * ((1.0 - Math.cos(ang)) * spanW * 0.16 * (1.0 - u * 0.5));
        const cz0 = rz + deltaZ;

        // 预制混凝土辐射状 V 形箱形肋拱微波浪肌理 (Precast Radial Rib Fluting, 14 根肋拱)
        const flute = Math.cos(v * Math.PI * 14.0) * 0.16 * Math.sin(ang) * (1.0 - u * 0.4);
        const cx = cx0 + side * flute * Math.cos(ang);
        const cy = cy0 + flute * Math.sin(ang);
        const cz = cz0;

        positions.push(cx, cy, cz);
        uvs.push(side > 0 ? v : 1.0 - v, u);
      }
    }

    for (let i = 0; i < segsU; i++) {
      for (let j = 0; j < segsV; j++) {
        const p0 = startIdx + i * (segsV + 1) + j;
        const p1 = p0 + 1;
        const p2 = p0 + (segsV + 1);
        const p3 = p2 + 1;
        if (side > 0) {
          indices.push(p0, p2, p1, p1, p2, p3);
        } else {
          indices.push(p0, p1, p2, p1, p3, p2);
        }
      }
    }
  }

  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  shellGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  shellGeo.setIndex(indices);
  shellGeo.computeVertexNormals();

  const shellMesh = new THREE.Mesh(shellGeo, tileMat);
  shellMesh.userData.isShell = true;
  vault.add(shellMesh);

  // 1. 实心预制混凝土拱口封边 (Thick Precast Concrete Arch Rim)
  const rimPositions: number[] = [];
  const rimIndices: number[] = [];
  for (let side = -1; side <= 1; side += 2) {
    const rStart = rimPositions.length / 3;
    const w = spanW * 0.5 + 0.8;
    for (let j = 0; j <= segsV; j++) {
      const v = j / segsV;
      const ang = v * Math.PI * 0.5;
      const cy = peakH * Math.pow(Math.cos(ang), 0.72);
      const cx = side * w * Math.sin(ang);
      const cz = -facing * ((1.0 - Math.cos(ang)) * spanW * 0.16);

      // 外缘
      rimPositions.push(cx, cy, cz);
      // 内缘 (沿法向向内收缩，并向内缩进)
      const scaleIn = 0.94;
      rimPositions.push(cx * scaleIn, cy * scaleIn, cz - facing * 1.5);
    }
    for (let j = 0; j < segsV; j++) {
      const a = rStart + j * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (side > 0) {
        rimIndices.push(a, b, c, b, d, c);
      } else {
        rimIndices.push(a, c, b, b, c, d);
      }
    }
  }
  const rimGeo = new THREE.BufferGeometry();
  rimGeo.setAttribute("position", new THREE.Float32BufferAttribute(rimPositions, 3));
  rimGeo.setIndex(rimIndices);
  rimGeo.computeVertexNormals();
  const rimMesh = new THREE.Mesh(rimGeo, archRimMat);
  vault.add(rimMesh);

  // 2. 标志性洁白连续拱脊封顶梁 (Ridge Cap Beam)
  const spinePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 28; i++) {
    const u = i / 28;
    const ry = peakH * Math.cos(Math.pow(u, 1.35) * Math.PI * 0.5) + 0.45;
    const rz = -facing * (u * depthD);
    spinePts.push(new THREE.Vector3(0, ry, rz));
  }
  const spineCurve = new THREE.CatmullRomCurve3(spinePts);
  const spineGeo = new THREE.TubeGeometry(spineCurve, 32, 0.55, 8, false);
  const spineMesh = new THREE.Mesh(spineGeo, ridgeMat);
  vault.add(spineMesh);

  // 3. 彼得·霍尔 (Peter Hall) 折角外悬挑琥珀色几何玻璃幕墙 (Outward-Leaning Faceted Glass Walls)
  if (hasGlass) {
    const folds = 6;
    const glassPos: number[] = [];
    const glassInd: number[] = [];

    const topPts: THREE.Vector3[] = [];
    const midPts: THREE.Vector3[] = [];
    const botPts: THREE.Vector3[] = [];

    for (let k = 0; k <= folds; k++) {
      const alpha = (k / folds) * 2.0 - 1.0; // [-1, 1]
      const ang = Math.abs(alpha) * Math.PI * 0.5;

      // 拱口顶部约束点
      const ty = Math.max(glassBaseY, peakH * 0.93 * Math.pow(Math.cos(ang), 0.72));
      const tx = alpha * (spanW * 0.46) * Math.pow(Math.cos(ang), 0.28);
      const tz = -facing * ((1.0 - Math.cos(ang)) * spanW * 0.16);
      topPts.push(new THREE.Vector3(tx, ty, tz));

      // 底层外挑点（倾斜前探）
      const bx = alpha * (spanW * 0.5);
      const by = glassBaseY;
      const bz = facing * (glassCantilever - Math.abs(alpha) * spanW * 0.12);
      botPts.push(new THREE.Vector3(bx, by, bz));

      // 腰线外突折痕点（创造强烈的立体折面光影）
      const my = by + (ty - by) * 0.44;
      const mx = (tx + bx) * 0.5 + (k % 2 === 1 ? alpha * 1.5 : 0);
      const mz = (tz + bz) * 0.5 + facing * (k % 2 === 1 ? 2.2 : 0.6);
      midPts.push(new THREE.Vector3(mx, my, mz));
    }

    // 组装折板网格 (Top -> Mid -> Bot)
    for (let k = 0; k < folds; k++) {
      const t0 = topPts[k];
      const t1 = topPts[k + 1];
      const m0 = midPts[k];
      const m1 = midPts[k + 1];
      const b0 = botPts[k];
      const b1 = botPts[k + 1];

      // 上半段多边形
      const idx0 = glassPos.length / 3;
      glassPos.push(t0.x, t0.y, t0.z, t1.x, t1.y, t1.z, m1.x, m1.y, m1.z, m0.x, m0.y, m0.z);
      if (facing > 0) {
        glassInd.push(idx0, idx0 + 1, idx0 + 2, idx0, idx0 + 2, idx0 + 3);
      } else {
        glassInd.push(idx0, idx0 + 2, idx0 + 1, idx0, idx0 + 3, idx0 + 2);
      }

      // 下半段多边形
      const idx1 = glassPos.length / 3;
      glassPos.push(m0.x, m0.y, m0.z, m1.x, m1.y, m1.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z);
      if (facing > 0) {
        glassInd.push(idx1, idx1 + 1, idx1 + 2, idx1, idx1 + 2, idx1 + 3);
      } else {
        glassInd.push(idx1, idx1 + 2, idx1 + 1, idx1, idx1 + 3, idx1 + 2);
      }
    }

    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("position", new THREE.Float32BufferAttribute(glassPos, 3));
    gGeo.setIndex(glassInd);
    gGeo.computeVertexNormals();

    const gMesh = new THREE.Mesh(gGeo, glassMat);
    gMesh.userData.isGlass = true;
    vault.add(gMesh);

    // 青铜折框骨架立柱 (Dark Bronze Vertical Mullions)
    for (let k = 0; k <= folds; k++) {
      const pts = [topPts[k], midPts[k], botPts[k]];
      const mCurve = new THREE.CatmullRomCurve3(pts);
      const mGeo = new THREE.TubeGeometry(mCurve, 12, 0.28, 6, false);
      const mMul = new THREE.Mesh(mGeo, mullionMat);
      vault.add(mMul);
    }
  }

  return vault;
}

// 侧向过渡连接百叶壳体 (Side Louvre Shells between main vaults)
function makeSideLouvreShell(
  spanW: number,
  peakH: number,
  depthD: number,
  facing: 1 | -1,
  tileMat: THREE.Material,
  ridgeMat: THREE.Material,
  archRimMat: THREE.Material,
  mullionMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const vault = makeUtzonSphericalVault({
    spanW,
    peakH,
    depthD,
    facing,
    hasGlass: false,
    tileMat,
    ridgeMat,
    archRimMat,
    glassMat: mullionMat,
    mullionMat,
  });
  g.add(vault);

  // 垂直声学青铜百叶
  const louvreCount = 5;
  for (let k = 1; k < louvreCount; k++) {
    const frac = (k / louvreCount) * 2 - 1;
    const x = frac * (spanW * 0.35);
    const lH = peakH * 0.55 * Math.cos(Math.abs(frac) * Math.PI * 0.45);
    const louvre = new THREE.Mesh(new THREE.BoxGeometry(0.3, lH, 1.2), mullionMat);
    louvre.position.set(x, lH * 0.5, -facing * depthD * 0.3);
    g.add(louvre);
  }
  return g;
}

export function createSydneyOperaHouse(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "SydneyOperaHouse";

  const tileTex = makeSydneyTileTexture();

  const shellMatDay = new THREE.MeshStandardMaterial({
    map: tileTex,
    color: 0xfcfcfc,
    roughness: 0.22,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const shellMatNight = new THREE.MeshStandardMaterial({
    map: tileTex,
    color: 0xffeedd,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 0.48,
    roughness: 0.28,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.18,
    metalness: 0.08,
  });

  const archRimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.05,
  });

  const amberGlassMatDay = new THREE.MeshStandardMaterial({
    color: 0xbf7824,
    metalness: 0.82,
    roughness: 0.12,
    opacity: 0.82,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const amberGlassMatNight = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.6,
    metalness: 0.25,
    roughness: 0.18,
    side: THREE.DoubleSide,
  });

  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0x22150c,
    metalness: 0.85,
    roughness: 0.32,
  });

  const podiumMat = new THREE.MeshStandardMaterial({
    color: 0xad9e8d,
    roughness: 0.82,
    metalness: 0.04,
  });

  const seaWallMat = new THREE.MeshStandardMaterial({
    color: 0x384152,
    roughness: 0.95,
    metalness: 0.02,
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1b3854,
    roughness: 0.2,
    metalness: 0.6,
  });

  // ==========================================
  // 1. 便利朗角雕塑感多层花岗岩纪念碑式台基 (Sculpted Multi-Tier Podium)
  // ==========================================
  const PODIUM_H = 12.5;

  // (0) 便利朗角悉尼海港深蓝海面基座 (Sydney Harbour Water Basin)
  const waterBasin = new THREE.Mesh(new THREE.PlaneGeometry(240, 320), waterMat);
  waterBasin.rotation.x = -Math.PI * 0.5;
  waterBasin.position.set(0, 0.2, 0);
  group.add(waterBasin);

  // (A) 下层临海水岸环岛散步长廊 (Lower Waterfront Boardwalk, +3.5m)
  // 契合便利朗角三面临海地势：东西宽 144m，南北长 236m，北部为 45° 倒角海岬尖端
  const lowPromShape = new THREE.Shape();
  const pw = 72;
  const pzNorth = 118;
  const pzSouth = -118;
  lowPromShape.moveTo(-pw + 22, pzNorth);
  lowPromShape.lineTo(pw - 22, pzNorth);
  lowPromShape.lineTo(pw, pzNorth - 22);
  lowPromShape.lineTo(pw, pzSouth);
  lowPromShape.lineTo(-pw, pzSouth);
  lowPromShape.lineTo(-pw, pzNorth - 22);
  lowPromShape.closePath();

  const lowPromGeo = new THREE.ExtrudeGeometry(lowPromShape, { depth: 3.5, bevelEnabled: false });
  lowPromGeo.rotateX(Math.PI * 0.5);
  const lowPromMesh = new THREE.Mesh(lowPromGeo, seaWallMat);
  lowPromMesh.position.set(0, 3.5, 0);
  group.add(lowPromMesh);

  // (B) 上层大体量花岗岩主台基核心体 (+12.5m, 宽 116m, 长 176m)
  const mainPodiumShape = new THREE.Shape();
  const mw = 58;
  const mzNorth = 82;
  const mzSouth = -94;
  mainPodiumShape.moveTo(-mw + 16, mzNorth);
  mainPodiumShape.lineTo(mw - 16, mzNorth);
  mainPodiumShape.lineTo(mw, mzNorth - 16);
  mainPodiumShape.lineTo(mw, mzSouth);
  mainPodiumShape.lineTo(-mw, mzSouth);
  mainPodiumShape.lineTo(-mw, mzNorth - 16);
  mainPodiumShape.closePath();

  const mainPodiumGeo = new THREE.ExtrudeGeometry(mainPodiumShape, { depth: 9.0, bevelEnabled: false });
  mainPodiumGeo.rotateX(Math.PI * 0.5);
  const mainPodiumMesh = new THREE.Mesh(mainPodiumGeo, podiumMat);
  mainPodiumMesh.position.set(0, 12.5, 0);
  group.add(mainPodiumMesh);

  // 主台基东西两侧悬挑观景露台与阴影凹凸线脚
  const westTerrace = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 144), podiumMat);
  westTerrace.position.set(-59, 11.25, -6);
  group.add(westTerrace);

  const eastTerrace = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 144), podiumMat);
  eastTerrace.position.set(59, 11.25, -6);
  group.add(eastTerrace);

  // (C) 南端迎宾世界著名花岗岩大台阶 (Grand Monumental Southern Steps, 96m wide)
  // 自大地前庭 (+2m) 逐级壮丽攀升至主台基 (+12.5m)
  const stepFlights = 14;
  const stepDepth = 3.2;
  const stepRise = (PODIUM_H - 2.0) / stepFlights;
  for (let s = 0; s < stepFlights; s++) {
    const sH = (s + 1) * stepRise;
    const sZ = -94 - (stepFlights - 1 - s) * stepDepth;
    const sStep = new THREE.Mesh(new THREE.BoxGeometry(96, sH, stepDepth + 0.1), podiumMat);
    sStep.position.set(0, 2.0 + sH * 0.5, sZ);
    group.add(sStep);
  }

  // ==========================================
  // 2. 东副厅：琼·萨瑟兰歌剧院厅 (Joan Sutherland Opera Theatre - Hall B, 位于东侧 X = +22)
  // 契合海港朝向：面向北海港视角，东厅位于画面左侧，体量约为西大厅的 86%
  // ==========================================
  const otX = 22;

  // Shell B3: 北海港前厅主风帆（高 46m，面向海港 +Z，外悬挑折角琥珀幕墙 13m）
  const vB3 = makeUtzonSphericalVault({
    spanW: 34,
    peakH: 46,
    depthD: 36,
    facing: 1,
    hasGlass: true,
    glassCantilever: 13,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vB3.position.set(otX, PODIUM_H, 22);
  group.add(vB3);

  // Shell B2: 中央高耸主厅帆（高 54m，向北海港方向叠落，高侧窗采光幕墙高出 B3 顶）
  const vB2 = makeUtzonSphericalVault({
    spanW: 40,
    peakH: 54,
    depthD: 44,
    facing: 1,
    hasGlass: true,
    glassCantilever: 9,
    glassBaseY: 24, // 高侧窗采光带
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vB2.position.set(otX, PODIUM_H, -4);
  group.add(vB2);

  // Shell B1: 南向观众厅/舞台帆（高 38m，反向朝南 -Z 迎向大台阶）
  const vB1 = makeUtzonSphericalVault({
    spanW: 32,
    peakH: 38,
    depthD: 32,
    facing: -1,
    hasGlass: false,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vB1.position.set(otX, PODIUM_H, -34);
  group.add(vB1);

  // Shell B0: 南向后部叠落入口帆（高 28m，朝南 -Z，带南向琥珀幕墙）
  const vB0 = makeUtzonSphericalVault({
    spanW: 24,
    peakH: 28,
    depthD: 24,
    facing: -1,
    hasGlass: true,
    glassCantilever: 8,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vB0.position.set(otX, PODIUM_H, -56);
  group.add(vB0);

  // 东侧与内侧低矮侧翼风帆
  const sideB_out = makeSideLouvreShell(16, 22, 20, 1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideB_out.position.set(otX + 17, PODIUM_H, -20);
  group.add(sideB_out);

  const sideB_in = makeSideLouvreShell(14, 20, 18, -1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideB_in.position.set(otX - 17, PODIUM_H, -20);
  group.add(sideB_in);

  // ==========================================
  // 3. 西主厅：大音乐厅 (Concert Hall Complex - Hall A, 位于西侧 X = -22)
  // 歌剧院最大体量核心：双重主峰高达 67m，面向北海港视角位于画面正中
  // ==========================================
  const chX = -22;

  // Shell A3: 北海港前厅主风帆（高 54m，面向海港 +Z，外悬挑折角琥珀幕墙 15m）
  const vA3 = makeUtzonSphericalVault({
    spanW: 40,
    peakH: 54,
    depthD: 40,
    facing: 1,
    hasGlass: true,
    glassCantilever: 15,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vA3.position.set(chX, PODIUM_H, 26);
  group.add(vA3);

  // Shell A2: 中央最高耸主峰帆（高 64m，气势磅礴，高出前厅的高侧窗采光幕墙）
  const vA2 = makeUtzonSphericalVault({
    spanW: 46,
    peakH: 64,
    depthD: 50,
    facing: 1,
    hasGlass: true,
    glassCantilever: 11,
    glassBaseY: 28, // 高侧窗采光带
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vA2.position.set(chX, PODIUM_H, -2);
  group.add(vA2);

  // Shell A1: 南向观众厅主帆（高 46m，反向朝南 -Z 迎向大台阶）
  const vA1 = makeUtzonSphericalVault({
    spanW: 38,
    peakH: 46,
    depthD: 38,
    facing: -1,
    hasGlass: false,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vA1.position.set(chX, PODIUM_H, -36);
  group.add(vA1);

  // Shell A0: 南向舞台叠落帆（高 34m，朝南 -Z，带南向琥珀幕墙）
  const vA0 = makeUtzonSphericalVault({
    spanW: 28,
    peakH: 34,
    depthD: 28,
    facing: -1,
    hasGlass: true,
    glassCantilever: 10,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vA0.position.set(chX, PODIUM_H, -60);
  group.add(vA0);

  // 西侧与内侧低矮侧翼风帆
  const sideA_out = makeSideLouvreShell(18, 24, 22, -1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideA_out.position.set(chX - 19, PODIUM_H, -18);
  group.add(sideA_out);

  const sideA_in = makeSideLouvreShell(14, 20, 18, 1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideA_in.position.set(chX + 19, PODIUM_H, -18);
  group.add(sideA_in);

  // ==========================================
  // 4. 西南翼：贝尼朗餐厅与酒吧组群 (Bennelong Restaurant - Hall C, 位于西侧 X = -52)
  // 位于西南方位台基旁，北向与西北向朝向悉尼海港大桥与海面，在画面右侧展开
  // ==========================================
  const restGroup = new THREE.Group();
  restGroup.position.set(-52, PODIUM_H, -60);
  restGroup.rotation.y = -Math.PI * 0.08;

  const vC2 = makeUtzonSphericalVault({
    spanW: 24,
    peakH: 26,
    depthD: 26,
    facing: 1,
    hasGlass: true,
    glassCantilever: 9,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vC2.position.set(0, 0, 8);
  restGroup.add(vC2);

  const vC1 = makeUtzonSphericalVault({
    spanW: 18,
    peakH: 18,
    depthD: 20,
    facing: 1,
    hasGlass: true,
    glassCantilever: 6,
    glassBaseY: 10,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vC1.position.set(0, 0, -8);
  restGroup.add(vC1);

  group.add(restGroup);

  // 夜间模式联动
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      if ((c as THREE.Mesh).userData?.isGlass) {
        (c as THREE.Mesh).material = night ? amberGlassMatNight : amberGlassMatDay;
      }
      if ((c as THREE.Mesh).userData?.isShell) {
        (c as THREE.Mesh).material = night ? shellMatNight : shellMatDay;
      }
    });
  };

  return group;
}

// --- 14. 成都新世纪环球中心 (Chengdu Global Center) 精细化与精准天府大道方位重构 ---
