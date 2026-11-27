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
      g.fillStyle = isMatte ? "#ede7dc" : "#ffffff";
      g.fillRect(x + 1, y + 1, lidW - 2, lidH - 2);

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
  glassBaseY?: number;
  tileMat: THREE.Material;
  ridgeMat: THREE.Material;
  archRimMat: THREE.Material;
  glassMat: THREE.Material;
  mullionMat: THREE.Material;
}

// 乌松球面三角形尖顶风帆壳体构建器 (Pointed Spherical-Triangle Utzon Sail)
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

  // 双偏移圆心哥特式尖拱剖面参数（保证两侧翼面在中央脊线以锐利尖顶交汇，绝非平顶圆穹）
  const cArc = 0.85;
  const rArc = Math.hypot(cArc, 1 + cArc);
  const aTop = Math.atan2(1 + cArc, cArc);
  const aBot = Math.atan2(cArc, 1 + cArc);

  // 纵向主脊球面圆弧参数（从后部铰点陡峭向上伸展，至前端尖顶保持 ~27° 昂扬上冲角）
  const thetaBase = 0.14;
  const thetaTip = 1.10;
  const sinBase = Math.sin(thetaBase);
  const sinSpan = Math.sin(thetaTip) - sinBase;
  const cosBase = Math.cos(thetaBase);
  const cosSpan = cosBase - Math.cos(thetaTip);

  const tipOverhang = depthD * 0.30;
  const cornerSweepBack = depthD * 0.24;
  const zRear = -facing * depthD;
  const zTip = facing * tipOverhang;

  function evalPoint(u: number, v: number, side: 1 | -1, withFlute = true): THREE.Vector3 {
    const tau = Math.max(0, Math.min(1, 1 - u));
    const theta = thetaBase + tau * (thetaTip - thetaBase);
    const spineYFrac = (Math.sin(theta) - sinBase) / sinSpan;
    const spineZFrac = (cosBase - Math.cos(theta)) / cosSpan;

    const ry = peakH * spineYFrac;
    const rz = zRear + spineZFrac * (zTip - zRear);

    // 球面三角扇面宽度：前端宽阔，顺滑收敛至后部基座铰接支承点
    const halfW = (spanW * 0.5) * Math.pow(Math.max(0, 1 - u), 0.82) + 0.55;

    // 尖拱横截面双圆弧坐标 (v=0 为中央尖脊，v=1 为两侧落脚边缘)
    const a = aTop + v * (aBot - aTop);
    const xFrac = -cArc + rArc * Math.cos(a);
    const yFrac = Math.max(0, -cArc + rArc * Math.sin(a));

    const cx0 = side * halfW * xFrac;
    const cy0 = ry * yFrac;

    // 开口拱缘由前探尖顶向两侧角点陡峭斜向后掠，塑造标志性飞扬尖喙侧面轮廓
    const sweepRatio = Math.pow(Math.max(0, v), 1.15);
    const mouthDeltaZ = -facing * sweepRatio * (tipOverhang + cornerSweepBack) * (1 - u);
    const cz0 = rz + mouthDeltaZ;

    if (!withFlute) {
      return new THREE.Vector3(cx0, cy0, cz0);
    }

    // 预制混凝土辐射状箱形肋拱浅槽肌理（中央脊线 v=0 处保持锐利零扰动）
    const ribEnvelope = Math.sin(v * Math.PI * 0.5) * (1 - u * 0.85);
    const flute = Math.cos(v * Math.PI * 14.0) * 0.12 * ribEnvelope;
    const cx = cx0 + side * flute * Math.cos(v * Math.PI * 0.5);
    const cy = Math.max(0, cy0 + flute * Math.sin(v * Math.PI * 0.5));
    return new THREE.Vector3(cx, cy, cz0);
  }

  const segsU = 30;
  const segsV = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const side of [-1, 1] as const) {
    const startIdx = positions.length / 3;

    for (let i = 0; i <= segsU; i++) {
      const u = i / segsU;
      for (let j = 0; j <= segsV; j++) {
        const v = j / segsV;
        const p = evalPoint(u, v, side, true);
        positions.push(p.x, p.y, p.z);
        uvs.push(side > 0 ? v : 1.0 - v, u);
      }
    }

    const outwardCCW = side * facing > 0;
    for (let i = 0; i < segsU; i++) {
      for (let j = 0; j < segsV; j++) {
        const p0 = startIdx + i * (segsV + 1) + j;
        const p1 = p0 + 1;
        const p2 = p0 + (segsV + 1);
        const p3 = p2 + 1;
        if (outwardCCW) {
          indices.push(p0, p1, p2, p1, p3, p2);
        } else {
          indices.push(p0, p2, p1, p1, p2, p3);
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
  shellMesh.userData.keepUv = true;
  vault.add(shellMesh);

  // 1. 实心预制混凝土拱口尖拱封边 (Crisp Pointed Precast Concrete Arch Rim)
  const rimPositions: number[] = [];
  const rimIndices: number[] = [];
  for (const side of [-1, 1] as const) {
    const rStart = rimPositions.length / 3;
    for (let j = 0; j <= segsV; j++) {
      const v = j / segsV;
      const outer = evalPoint(0, v, side, false);
      const inner = evalPoint(0.03, v, side, false);
      const inwardScale = 0.945;
      inner.x *= inwardScale;
      inner.y *= inwardScale;

      rimPositions.push(outer.x, outer.y, outer.z);
      rimPositions.push(inner.x, inner.y, inner.z);
    }
    const outwardCCW = side * facing > 0;
    for (let j = 0; j < segsV; j++) {
      const a = rStart + j * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (outwardCCW) {
        rimIndices.push(a, c, b, b, c, d);
      } else {
        rimIndices.push(a, b, c, b, d, c);
      }
    }
  }
  const rimGeo = new THREE.BufferGeometry();
  rimGeo.setAttribute("position", new THREE.Float32BufferAttribute(rimPositions, 3));
  rimGeo.setIndex(rimIndices);
  rimGeo.computeVertexNormals();
  const rimMesh = new THREE.Mesh(rimGeo, archRimMat);
  vault.add(rimMesh);

  // 2. 锐利菱形刀锋拱脊封顶梁 (Sharp Beveled Diamond Spine Cap，强化尖顶脊线)
  const spineHalfW = 0.42;
  const spineApexH = 0.65;
  const spineSteps = 26;
  const spinePos: number[] = [];
  const spineIdx: number[] = [];
  for (let i = 0; i <= spineSteps; i++) {
    const u = i / spineSteps;
    const c = evalPoint(u, 0, 1, false);
    const wScale = 1 - u * 0.55;
    // 3 顶点 V 型脊盖：左肩、顶棱、右肩
    spinePos.push(
      c.x - spineHalfW * wScale, Math.max(0, c.y - 0.12), c.z,
      c.x, c.y + spineApexH * wScale, c.z + facing * 0.18 * (1 - u),
      c.x + spineHalfW * wScale, Math.max(0, c.y - 0.12), c.z,
    );
  }
  for (let i = 0; i < spineSteps; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    if (facing > 0) {
      spineIdx.push(a, a + 1, b, a + 1, b + 1, b);
      spineIdx.push(a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);
    } else {
      spineIdx.push(a, b, a + 1, a + 1, b, b + 1);
      spineIdx.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  }
  const spineGeo = new THREE.BufferGeometry();
  spineGeo.setAttribute("position", new THREE.Float32BufferAttribute(spinePos, 3));
  spineGeo.setIndex(spineIdx);
  spineGeo.computeVertexNormals();
  const spineMesh = new THREE.Mesh(spineGeo, ridgeMat);
  vault.add(spineMesh);

  // 3. 彼得·霍尔 (Peter Hall) 折角外悬挑琥珀色几何玻璃幕墙 (紧密贴合尖拱开口曲率，高窗型内收衔接入前壳脊背)
  if (hasGlass) {
    const folds = 6;
    const glassPos: number[] = [];
    const glassInd: number[] = [];

    const topPts: THREE.Vector3[] = [];
    const midPts: THREE.Vector3[] = [];
    const botPts: THREE.Vector3[] = [];
    const isClerestory = glassBaseY > 0.5;

    for (let k = 0; k <= folds; k++) {
      const alpha = (k / folds) * 2.0 - 1.0; // [-1, 1]
      const side: 1 | -1 = alpha >= 0 ? 1 : -1;
      // 若为上方二阶高侧窗，收窄展开角保证下缘落回下层壳体顶部内侧，绝不悬空外挑成平棚
      const vFrac = Math.abs(alpha) * (isClerestory ? 0.58 : 1.0);

      // 精确取同一尖拱前缘并向壳内微收，确保顶部尖顶严丝合缝
      const archPt = evalPoint(0.035, vFrac, side, false);
      const ty = Math.max(glassBaseY + 1.5, archPt.y * 0.96);
      const tx = archPt.x * 0.93;
      const tz = archPt.z;
      topPts.push(new THREE.Vector3(tx, ty, tz));

      if (isClerestory) {
        // 高侧窗底部顺势向壳体内下收，密合衔接前置壳体脊背
        const bx = tx * 0.96;
        const by = Math.max(0, glassBaseY - 4.0);
        const bz = tz - facing * 1.4;
        botPts.push(new THREE.Vector3(bx, by, bz));

        const my = by + (ty - by) * 0.5;
        const mx = (tx + bx) * 0.5 + (k % 2 === 1 ? alpha * 0.8 : 0);
        const mz = (tz + bz) * 0.5 + facing * (k % 2 === 1 ? 1.2 : 0.3);
        midPts.push(new THREE.Vector3(mx, my, mz));
      } else {
        // 主迎面厅：底层向外前探俯瞰海港
        const bx = alpha * (spanW * 0.47);
        const by = 0;
        const bz = zTip + facing * (glassCantilever - vFrac * (tipOverhang + cornerSweepBack * 0.8));
        botPts.push(new THREE.Vector3(bx, by, bz));

        const my = by + (ty - by) * 0.44;
        const mx = (tx + bx) * 0.5 + (k % 2 === 1 ? alpha * 1.4 : 0);
        const mz = (tz + bz) * 0.5 + facing * (k % 2 === 1 ? 2.0 : 0.5);
        midPts.push(new THREE.Vector3(mx, my, mz));
      }
    }

    for (let k = 0; k < folds; k++) {
      const t0 = topPts[k];
      const t1 = topPts[k + 1];
      const m0 = midPts[k];
      const m1 = midPts[k + 1];
      const b0 = botPts[k];
      const b1 = botPts[k + 1];

      const idx0 = glassPos.length / 3;
      glassPos.push(t0.x, t0.y, t0.z, t1.x, t1.y, t1.z, m1.x, m1.y, m1.z, m0.x, m0.y, m0.z);
      if (facing > 0) {
        glassInd.push(idx0, idx0 + 2, idx0 + 1, idx0, idx0 + 3, idx0 + 2);
      } else {
        glassInd.push(idx0, idx0 + 1, idx0 + 2, idx0, idx0 + 2, idx0 + 3);
      }

      const idx1 = glassPos.length / 3;
      glassPos.push(m0.x, m0.y, m0.z, m1.x, m1.y, m1.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z);
      if (facing > 0) {
        glassInd.push(idx1, idx1 + 2, idx1 + 1, idx1, idx1 + 3, idx1 + 2);
      } else {
        glassInd.push(idx1, idx1 + 1, idx1 + 2, idx1, idx1 + 2, idx1 + 3);
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

  const louvreCount = 5;
  for (let k = 1; k < louvreCount; k++) {
    const frac = (k / louvreCount) * 2 - 1;
    const x = frac * (spanW * 0.34);
    const lH = peakH * 0.5 * (1 - Math.abs(frac) * 0.65);
    const louvre = new THREE.Mesh(new THREE.BoxGeometry(0.3, lH, 1.2), mullionMat);
    louvre.position.set(x, lH * 0.5, -facing * depthD * 0.28);
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
    side: THREE.DoubleSide,
  });

  const archRimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.05,
    side: THREE.DoubleSide,
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

  // ==========================================
  // 1. 便利朗角雕塑感多层花岗岩纪念碑式台基 (Sculpted Multi-Tier Podium)
  // ==========================================
  const PODIUM_H = 12.5;
  const lowPromShape = new THREE.Shape();
  const pw = 72;
  const pzNorth = 118;
  const pzSouth = -142;
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

  const westTerrace = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 144), podiumMat);
  westTerrace.position.set(-59, 11.25, -6);
  group.add(westTerrace);

  const eastTerrace = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 144), podiumMat);
  eastTerrace.position.set(59, 11.25, -6);
  group.add(eastTerrace);

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
  // 2. 东副厅：琼·萨瑟兰歌剧院厅 (Opera Theatre - Hall B)
  // ==========================================
  const otX = -22;

  const vB3 = makeUtzonSphericalVault({
    spanW: 34,
    peakH: 39,
    depthD: 36,
    facing: 1,
    hasGlass: true,
    glassCantilever: 12,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vB3.position.set(otX, PODIUM_H, 22);
  group.add(vB3);

  const vB2 = makeUtzonSphericalVault({
    spanW: 40,
    peakH: 46,
    depthD: 44,
    facing: 1,
    hasGlass: true,
    glassCantilever: 8,
    glassBaseY: 20,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vB2.position.set(otX, PODIUM_H, -4);
  group.add(vB2);

  const vB1 = makeUtzonSphericalVault({
    spanW: 32,
    peakH: 32.5,
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

  const vB0 = makeUtzonSphericalVault({
    spanW: 24,
    peakH: 24,
    depthD: 24,
    facing: -1,
    hasGlass: true,
    glassCantilever: 7,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vB0.position.set(otX, PODIUM_H, -56);
  group.add(vB0);

  const sideB_out = makeSideLouvreShell(16, 19, 20, 1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideB_out.position.set(otX - 17, PODIUM_H, -20);
  group.add(sideB_out);

  const sideB_in = makeSideLouvreShell(14, 17, 18, -1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideB_in.position.set(otX + 17, PODIUM_H, -20);
  group.add(sideB_in);

  // ==========================================
  // 3. 西主厅：大音乐厅 (Concert Hall - Hall A，主峰含台基高达 67m)
  // ==========================================
  const chX = 22;

  const vA3 = makeUtzonSphericalVault({
    spanW: 40,
    peakH: 46,
    depthD: 40,
    facing: 1,
    hasGlass: true,
    glassCantilever: 14,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vA3.position.set(chX, PODIUM_H, 26);
  group.add(vA3);

  const vA2 = makeUtzonSphericalVault({
    spanW: 46,
    peakH: 54.5,
    depthD: 50,
    facing: 1,
    hasGlass: true,
    glassCantilever: 10,
    glassBaseY: 24,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vA2.position.set(chX, PODIUM_H, -2);
  group.add(vA2);

  const vA1 = makeUtzonSphericalVault({
    spanW: 38,
    peakH: 39,
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

  const vA0 = makeUtzonSphericalVault({
    spanW: 28,
    peakH: 29,
    depthD: 28,
    facing: -1,
    hasGlass: true,
    glassCantilever: 9,
    glassBaseY: 0,
    tileMat: shellMatDay,
    ridgeMat,
    archRimMat,
    glassMat: amberGlassMatDay,
    mullionMat,
  });
  vA0.position.set(chX, PODIUM_H, -60);
  group.add(vA0);

  const sideA_out = makeSideLouvreShell(18, 20.5, 22, -1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideA_out.position.set(chX + 19, PODIUM_H, -18);
  group.add(sideA_out);

  const sideA_in = makeSideLouvreShell(14, 17, 18, 1, shellMatDay, ridgeMat, archRimMat, mullionMat);
  sideA_in.position.set(chX - 19, PODIUM_H, -18);
  group.add(sideA_in);

  // ==========================================
  // 4. 西南翼：贝尼朗餐厅与酒吧组群 (Bennelong Restaurant - Hall C)
  // ==========================================
  const restGroup = new THREE.Group();
  restGroup.position.set(52, PODIUM_H, -60);
  restGroup.rotation.y = Math.PI * 0.08;

  const vC2 = makeUtzonSphericalVault({
    spanW: 24,
    peakH: 22.5,
    depthD: 26,
    facing: 1,
    hasGlass: true,
    glassCantilever: 8,
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
    peakH: 15.5,
    depthD: 20,
    facing: 1,
    hasGlass: true,
    glassCantilever: 5.5,
    glassBaseY: 8.5,
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

// --- 14. 成都新世纪环球中心 (Chengdu Global Center) ---
