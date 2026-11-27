import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";
import { box, cyl, stone } from "./_shared";

function eggOuterPoint(u: number): [number, number] {
  const cu = Math.cos(u);
  const su = Math.sin(u);
  // 圆润平滑的非对称“未来之蛋”外廓：总高 77.0m，总长 104m（饱满平滑，略微前倾）
  const eggTaperZ = 1.0 - 0.07 * su;
  const z = 52.0 * eggTaperZ * cu + 5.5 * su;
  const y = 40.0 + 37.0 * su + 1.8 * cu;
  return [z, y];
}

function eggHolePoint(u: number): [number, number] {
  const cu = Math.cos(u);
  const su = Math.sin(u);
  // 中心椭圆孔洞宽高为主体蛋形的一半（约 52m × 36m），向左侧（+Z）自然偏心，非几何正中
  const eggTaperZ = 1.0 - 0.05 * su;
  const z = 6.8 + 26.0 * eggTaperZ * cu + 4.2 * su;
  const y = 41.2 + 18.0 * su + 1.0 * cu;
  return [z, y];
}

function createRoundedMuseumEggGeometry(
  radialSegments = 128,
  tubularSegments = 64,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 先采样整环顶点并按真实三维弧长积分，保证前后立面、外缘与孔洞内缘贴图 100% 均匀无拉伸
  const ringPts: THREE.Vector3[][] = [];
  const uArcDist: number[] = [0];
  let prevMid = new THREE.Vector3();

  for (let i = 0; i <= radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2;
    const su = Math.sin(u);
    const [zOut, yOut] = eggOuterPoint(u);
    const [zIn, yIn] = eggHolePoint(u);

    const mz = (zOut + zIn) * 0.5;
    const my = (yOut + yIn) * 0.5;
    const hz = (zOut - zIn) * 0.5;
    const hy = (yOut - yIn) * 0.5;

    // 饱满圆润的蛋体厚度（沿 X 向约 30m ~ 38m）
    const halfD = 16.5 - 2.2 * su;

    const mid = new THREE.Vector3(0, my, mz);
    if (i > 0) {
      uArcDist.push(uArcDist[i - 1] + mid.distanceTo(prevMid));
    }
    prevMid = mid;

    const slice: THREE.Vector3[] = [];
    for (let j = 0; j <= tubularSegments; j++) {
      const v = (j / tubularSegments) * Math.PI * 2;
      // 纯正顺滑椭圆截面，令外沿、表面与中心孔洞内壁浑然一体圆润过渡
      const py = my + Math.cos(v) * hy;
      const pz = mz + Math.cos(v) * hz;
      const px = Math.sin(v) * halfD;
      slice.push(new THREE.Vector3(px, py, pz));
    }
    ringPts.push(slice);
  }

  const totalU = Math.max(uArcDist[uArcDist.length - 1], 1);
  // 贴图平铺比例：整圈绕行 3 次、截面整数倍绕行 2 次，彻底消除接缝并保持全身均匀密度
  const uTiles = 3.0;
  const vTiles = 2.0;

  for (let i = 0; i <= radialSegments; i++) {
    const uCoord = (uArcDist[i] / totalU) * uTiles;
    const slice = ringPts[i];

    const vArc: number[] = [0];
    for (let j = 1; j <= tubularSegments; j++) {
      vArc.push(vArc[j - 1] + slice[j].distanceTo(slice[j - 1]));
    }
    const totalV = Math.max(vArc[vArc.length - 1], 1);

    for (let j = 0; j <= tubularSegments; j++) {
      const p = slice[j];
      positions.push(p.x, p.y, p.z);
      uvs.push(uCoord, (vArc[j] / totalV) * vTiles);
    }
  }

  for (let i = 0; i < radialSegments; i++) {
    for (let j = 0; j < tubularSegments; j++) {
      const a = i * (tubularSegments + 1) + j;
      const b = (i + 1) * (tubularSegments + 1) + j;
      const c = (i + 1) * (tubularSegments + 1) + (j + 1);
      const d = i * (tubularSegments + 1) + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function drawUniformArabicCalligraphy(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokeColor: string,
  dotColor: string,
  haloColor?: string,
): void {
  // 8 条跨行交织、重点覆盖正立面中腹 (y=512) 及内外倒角带的均衡迪瓦尼行草，彻底消除中带留白与平行条纹感
  const rows = 8;
  const rowStep = h / rows;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let r = 0; r < rows; r++) {
    const cy = (r + 0.5) * rowStep;
    const drawPass = (lwScale: number, col: string) => {
      ctx.strokeStyle = col;
      ctx.fillStyle = col;

      const segs = 9;
      const segW = w / segs;
      for (let s = 0; s < segs; s++) {
        const x0 = s * segW;
        const x1 = (s + 1) * segW;
        const offsetY = ((s * 3 + r * 5) % 5 - 2) * 16;
        const wave = ((s * 7 + r * 2) % 4 - 1.5) * 28;
        const lw = (16 + ((s + r) % 3) * 5) * lwScale;

        // 跨行顺滑连接的主行草波浪弧线
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x0, cy + offsetY * 0.4);
        ctx.bezierCurveTo(
          x0 + segW * 0.3,
          cy + wave * 1.15,
          x0 + segW * 0.7,
          cy - wave * 1.05,
          x1,
          cy + (((s + 1) * 3 + r * 5) % 5 - 2) * 6.4,
        );
        ctx.stroke();

        // 跨带斜升舒展笔锋与交叉连笔（打破等距环形视觉）
        ctx.lineWidth = lw * 0.74;
        ctx.beginPath();
        ctx.moveTo(x0 + segW * 0.18, cy + 28);
        ctx.quadraticCurveTo(
          x0 + segW * 0.52,
          cy - 18,
          x0 + segW * 0.86,
          cy - 54,
        );
        ctx.stroke();

        // 圆润古体字弧环 (Waw / Ain / Mim 圈势)
        if ((s + r) % 2 === 0) {
          ctx.lineWidth = lw * 0.68;
          ctx.beginPath();
          ctx.arc(
            x0 + segW * 0.58,
            cy + ((s * r) % 2 === 0 ? 18 : -18),
            18 + ((s + r) % 3) * 5,
            0.1 * Math.PI,
            1.55 * Math.PI,
          );
          ctx.stroke();
        }
      }

      // 饱满菱形音符点
      ctx.fillStyle = dotColor;
      for (let s = 0; s < segs; s++) {
        if ((s + r) % 2 !== 0) continue;
        const dx = (s + 0.42) * segW;
        const dy = cy + ((s + r) % 4 === 0 ? -24 : 26);
        const dr = 8.5 * lwScale;
        ctx.beginPath();
        ctx.moveTo(dx, dy - dr);
        ctx.lineTo(dx + dr * 1.2, dy);
        ctx.lineTo(dx, dy + dr);
        ctx.lineTo(dx - dr * 1.2, dy);
        ctx.closePath();
        ctx.fill();
      }
    };

    if (haloColor) {
      drawPass(1.18, haloColor);
    }
    drawPass(1.0, strokeColor);
  }
}

function makeMuseumDiffuseTexture(isNight: boolean): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  if (isNight) {
    bg.addColorStop(0, "#0b1322");
    bg.addColorStop(0.5, "#121d30");
    bg.addColorStop(1, "#0b1322");
  } else {
    bg.addColorStop(0, "#e2e8f0");
    bg.addColorStop(0.5, "#d3dce6");
    bg.addColorStop(1, "#e2e8f0");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 均匀细腻的菱形特种不锈钢分格线
  ctx.strokeStyle = isNight ? "rgba(148,163,184,0.14)" : "rgba(71,85,105,0.22)";
  ctx.lineWidth = 1.2;
  const stepX = 64;
  const stepY = 128;
  for (let y = 0; y < h; y += stepY) {
    for (let x = 0; x < w; x += stepX) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + stepX * 0.5, y + stepY);
      ctx.lineTo(x + stepX, y);
      ctx.stroke();
    }
  }

  // 全身均匀阿拉伯书法玻璃窗带（日间为深灰青铜反光玻璃，柔和不刺眼；夜间亮银青光）
  if (isNight) {
    drawUniformArabicCalligraphy(ctx, w, h, "#bae6fd", "#e0f2fe", "#0284c7");
  } else {
    drawUniformArabicCalligraphy(ctx, w, h, "#202b38", "#202b38", "#f1f5f9");
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeMuseumNightEmissive(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  drawUniformArabicCalligraphy(ctx, w, h, "#38bdf8", "#e0f2fe", "#0369a1");
  ctx.shadowBlur = 0;
  drawUniformArabicCalligraphy(ctx, w, h, "#e0f7ff", "#ffffff");

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createSculptedGreenMoundGeometry(): THREE.BufferGeometry {
  const radialSegs = 64;
  const ringSegs = 22;
  const radiusZ = 84.0;
  const radiusX = 56.0;
  const peakH = 18.0;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= ringSegs; r++) {
    const t = r / ringSegs;
    const y = Math.max(0, peakH * Math.pow(Math.cos(t * Math.PI * 0.5), 1.35));
    const rx = t * radiusX;
    const rz = t * radiusZ;

    for (let s = 0; s <= radialSegs; s++) {
      const a = (s / radialSegs) * Math.PI * 2;
      positions.push(Math.cos(a) * rx, y, Math.sin(a) * rz);
      uvs.push(s / radialSegs, t);
    }
  }

  for (let r = 0; r < ringSegs; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = r * (radialSegs + 1) + s;
      const b = (r + 1) * (radialSegs + 1) + s;
      const c = (r + 1) * (radialSegs + 1) + (s + 1);
      const d = r * (radialSegs + 1) + (s + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createEmbeddedHillsideArch(
  width: number,
  height: number,
  rimDepth: number,
  frameMat: THREE.Material,
  glassMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const outerR = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-outerR, 0);
  shape.absarc(0, 0, outerR, Math.PI, 0, true);
  shape.lineTo(outerR - 0.7, 0);
  shape.absarc(0, 0, outerR - 0.7, 0, Math.PI, false);
  shape.closePath();

  const rimGeo = new THREE.ExtrudeGeometry(shape, { depth: rimDepth, bevelEnabled: false });
  rimGeo.translate(0, 0, -rimDepth * 0.5);
  rimGeo.scale(1.0, height / outerR, 1.0);
  const rim = new THREE.Mesh(rimGeo, frameMat);
  rim.rotation.y = Math.PI / 2;
  g.add(rim);

  const paneShape = new THREE.Shape();
  paneShape.moveTo(-(outerR - 0.6), 0);
  paneShape.absarc(0, 0, outerR - 0.6, Math.PI, 0, true);
  paneShape.closePath();
  const paneGeo = new THREE.ShapeGeometry(paneShape, 24);
  paneGeo.scale(1.0, height / outerR, 1.0);
  const pane = new THREE.Mesh(paneGeo, glassMat);
  pane.rotation.y = Math.PI / 2;
  pane.position.x = rimDepth * 0.2;
  pane.userData.isLobbyGlass = true;
  g.add(pane);
  return g;
}

export function createMuseumOfTheFuture(kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "futuremuseum";

  const grassMat = stone(0x3a7a2c, 0.92, 0.0);
  const plazaStone = stone(0xd6d1c7, 0.85, 0.04);
  const concreteTrim = stone(0xe2e8f0, 0.55, 0.12);
  const darkStoneWall = stone(0x645d54, 0.88, 0.05);

  const diffDay = makeMuseumDiffuseTexture(false);
  const diffNight = makeMuseumDiffuseTexture(true);
  const emissiveNight = makeMuseumNightEmissive();

  // 单一无缝拉丝不锈钢+均匀书法材质（日间亮银质感，孔内无黑块）
  const eggMatDay = new THREE.MeshStandardMaterial({
    map: diffDay,
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.48,
  });
  const eggMatNight = new THREE.MeshStandardMaterial({
    map: diffNight,
    color: 0x0f172a,
    roughness: 0.45,
    metalness: 0.35,
    emissiveMap: emissiveNight,
    emissive: 0xffffff,
    emissiveIntensity: 1.9,
  });

  const lobbyGlassDay = new THREE.MeshStandardMaterial({
    color: 0x1e2c3e,
    roughness: 0.14,
    metalness: 0.82,
    side: THREE.DoubleSide,
  });
  const lobbyGlassNight = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  // 1. 左侧挡土翼台（移除与地表 y=0 重叠闪烁的扁平广场板与薄水池膜）
  const terraceWall = box(root, darkStoneWall, 26, 11.5, 22, 40, 0, 78);
  terraceWall.userData.skipLines = true;

  // 2. 连续曲面覆土生态绿丘
  const moundGeo = createSculptedGreenMoundGeometry();
  const mound = new THREE.Mesh(moundGeo, grassMat);
  mound.userData.skipLines = true;
  mound.userData.keepUv = true;
  root.add(mound);

  // 绿丘坡面嵌入的拱形玻璃入口（精准置于坡体外缘，让拱顶白沿与深色玻璃自然呈现）
  for (const side of [1, -1]) {
    const mainArch = createEmbeddedHillsideArch(24.0, 8.6, 3.8, concreteTrim, lobbyGlassDay);
    mainArch.position.set(side * 37.5, 0, 12.0);
    mainArch.rotation.z = side * 0.14;
    if (side < 0) mainArch.rotation.y = Math.PI;
    root.add(mainArch);

    const sideArch = createEmbeddedHillsideArch(22.0, 6.2, 3.2, concreteTrim, lobbyGlassDay);
    sideArch.position.set(side * 36.5, 1.6, -24.0);
    sideArch.rotation.z = side * 0.14;
    if (side < 0) sideArch.rotation.y = Math.PI;
    root.add(sideArch);
  }

  // 3. 主体圆润蛋形曲面（单材质全身均匀书法覆盖，中心孔洞约主体蛋形的一半且向侧偏）
  const eggGeo = createRoundedMuseumEggGeometry(128, 64);
  const eggMesh = new THREE.Mesh(eggGeo, eggMatDay);
  eggMesh.userData.keepUv = true;
  eggMesh.castShadow = true;
  eggMesh.receiveShadow = true;
  root.add(eggMesh);

  // 4. 广场棕榈绿化列阵
  const palmPositions: [number, number][] = [
    [52, 46], [50, 34], [54, -6], [52, -34],
    [-46, 44], [-48, -32], [46, 58],
  ];
  const trunkMat = stone(0x7c5c3e, 0.9, 0.02);
  for (const [px, pz] of palmPositions) {
    cyl(root, trunkMat, 0.35, 0.5, 7.5, px, 0, pz, 7);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.8, 7), grassMat);
    crown.position.set(px, 8.2, pz);
    root.add(crown);
  }

  // 5. 迪拜地铁高架桥（外移至 +X = 92m 谢赫扎耶德路外侧边缘，避免横挡迎宾前广场与绿丘视线）
  const bridge = box(root, plazaStone, 11.5, 2.6, 188.0, 92.0, 8.5, 0);
  bridge.userData.skipLines = true;
  for (let bz = -72; bz <= 72; bz += 24.0) {
    cyl(root, concreteTrim, 0.75, 0.9, 8.5, 92.0, 0, bz, 12);
  }
  const bridgeDeckTrim = box(root, concreteTrim, 12.2, 0.65, 188.0, 92.0, 11.1, 0);
  bridgeDeckTrim.userData.skipLines = true;

  const pedTube = box(root, concreteTrim, 28.0, 3.8, 5.2, 68.0, 9.0, 72.0);
  pedTube.userData.skipLines = true;

  // 6. 昼夜灯光联动
  const voidLight = new THREE.PointLight(0x38bdf8, 0.2, 95, 1.5);
  voidLight.position.set(0, 41.5, 7.5);
  root.add(voidLight);

  const hillSpot = new THREE.PointLight(0x22d3ee, 0, 70, 1.7);
  hillSpot.position.set(34.0, 12.0, 12.0);
  root.add(hillSpot);

  void kit;
  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    eggMesh.material = night ? eggMatNight : eggMatDay;
    root.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.userData?.isLobbyGlass) {
        m.material = night ? lobbyGlassNight : lobbyGlassDay;
      }
    });
    voidLight.intensity = night ? 1.5 : 0.2;
    hillSpot.intensity = night ? 1.1 : 0;
  };

  return root;
}
