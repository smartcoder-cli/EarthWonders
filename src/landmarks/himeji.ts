import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";
import { box } from "./_shared";

/**
 * 姬路城 · 白鹭城 (Himeji Castle - Authentic Architectural Fidelity)
 * 严格按照日本城郭古建筑学文献及实景照片（西之丸与备前丸双重视点）进行毫米级重构：
 * 
 * 破风体系（尖顶与波浪山墙）在各层各面的数量与排布真实律动：
 * 
 * 【南面 (正面 / 正南向视角)】从上至下：
 * - 五重（最上层望楼）：中央设 1 座精致【轩唐破风】(弧形起拱)，两侧设 5 扇连子长方窗
 * - 四重：屋面上左右对称配置 2 座独立的【千鸟破风】(两个三角形尖顶并列)
 * - 三重：中央配置 1 组罕见而雄伟的【比翼千鸟破风】(左右紧密连为一体的双峰连体尖顶)
 * - 二重：中央配置 1 座宏阔的【轩唐破风】，下方出挑纯白竖棂【出格子窗】与转角【石落】
 * 
 * 【西面 (侧面 / 西之丸视角)】从上至下：
 * - 五重：大入母屋造歇山屋顶三角形大山花，顶脊南北两端耸立展鳍金光【鯱瓦】
 * - 四重：中央设 1 座挺拔锐利的【千鸟破风】
 * - 三重：中央设 1 座跨两层的大型【千鸟破风】，白漆喰山花配深木梁枋、双联方窗与白雕悬鱼
 * - 二重：东西两侧横贯体量巨大的【大入母屋破风】，斜向穿透三重屋面
 * 
 * 【左翼小天守与防御连廊】：
 * - 西小天守：二重南立面设 1 座正面朝向镜头的挺拔【千鸟破风】；三重顶脊一对金鯱
 * - 渡橹长廊：屋面中央设 1 座小千鸟破风与连续狭间防御射孔
 * 
 * 【白鹭城美学特征】：
 * - 白目地隅棟：每重飞檐 4 道斜脊（隅棟）与大棟全部覆盖纯白灰泥勾缝垄瓦，檐底纯白漆喰
 * - 扇之勾配高石垣：近 15 米花岗岩石垣，底部平缓、近顶垂直倒拔如刃的抛物线扇形弧度
 */

// ─────────────────────────────────────────────────────────────
// 1. 程序化材质与纹理
// ─────────────────────────────────────────────────────────────

function makeWarmStoneTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#5c5448";
  ctx.fillRect(0, 0, size, size);

  const colors = [
    "#948b7d", "#857c6f", "#a3998a", "#787063",
    "#9c9385", "#aba192", "#6e6659", "#827a6d", "#5c5447"
  ];

  const rows = 18;
  const rowH = size / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    let x = (r % 2 === 0 ? 0 : -rowH * 0.45);

    while (x < size + 60) {
      const stoneW = 24 + ((r * 13 + x * 7) % 32);
      const col = colors[Math.abs(Math.floor(x * 5 + r * 17)) % colors.length];
      ctx.fillStyle = col;

      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, stoneW - 4, rowH - 4, 3);
      ctx.fill();

      // 深色石缝
      ctx.strokeStyle = "#322c24";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // 上缘自然受光高光
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + stoneW - 3, y + 3);
      ctx.stroke();

      x += stoneW;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makePlasterTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 极细腻纯白消石灰底色
  ctx.fillStyle = "#fcfdfe";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "rgba(203, 213, 225, 0.12)";
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  // 几何射孔（狭间）
  const samas = [
    { x: 90, y: 150, type: "circle" },
    { x: 250, y: 150, type: "triangle" },
    { x: 410, y: 150, type: "rect" },
    { x: 170, y: 350, type: "circle" },
    { x: 330, y: 350, type: "triangle" },
  ];

  ctx.fillStyle = "#181d24";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;

  for (const s of samas) {
    if (s.type === "circle") {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (s.type === "triangle") {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 8);
      ctx.lineTo(s.x - 7, s.y + 6);
      ctx.lineTo(s.x + 7, s.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(s.x - 4, s.y - 7, 8, 14);
      ctx.strokeRect(s.x - 4, s.y - 7, 8, 14);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeKawaraTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#333842";
  ctx.fillRect(0, 0, size, size);

  const tiles = 20;
  const step = size / tiles;

  for (let i = 0; i < tiles; i++) {
    const x = i * step;
    const grad = ctx.createLinearGradient(x, 0, x + step, 0);
    grad.addColorStop(0.0, "#222730");
    grad.addColorStop(0.4, "#4b5362");
    grad.addColorStop(0.7, "#383f4d");
    grad.addColorStop(1.0, "#1e232b");

    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, 0, step - 2, size);

    // 姬路城标志性的白灰泥勾缝（白目地漆喰）
    ctx.fillStyle = "rgba(248, 250, 252, 0.42)";
    ctx.fillRect(x + step * 0.4, 0, 1.8, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeDegoshiTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, w, h);

  // 纯白消石灰竖向出格子窗棂条
  const bars = 16;
  const bw = w / bars;
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;

  for (let i = 0; i < bars; i++) {
    const x = i * bw + 2;
    ctx.fillRect(x, 6, bw - 5, h - 12);
    ctx.strokeRect(x, 6, bw - 5, h - 12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// ─────────────────────────────────────────────────────────────
// 2. 参数化构件生成器 (带白目地隅棟与起翘飞檐)
// ─────────────────────────────────────────────────────────────

/**
 * 创建带有四道纯白斜脊（隅棟）与平缓反宇起翘的四坡飞檐屋顶
 */
function createEavesRoof(
  width: number,
  depth: number,
  height: number,
  overhang: number,
  ridgeW: number,
  ridgeD: number,
  tileMat: THREE.Material,
  whiteTrimMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  const totalW = width + overhang * 2;
  const totalD = depth + overhang * 2;
  const hw = totalW / 2;
  const hd = totalD / 2;
  const hrw = ridgeW / 2;
  const hrd = ridgeD / 2;

  const pos: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const segX = 10;
  const segZ = 10;

  for (let iz = 0; iz <= segZ; iz++) {
    const tz = iz / segZ;
    const factorZ = Math.abs(tz - 0.5) * 2;
    const signZ = tz >= 0.5 ? 1 : -1;

    for (let ix = 0; ix <= segX; ix++) {
      const tx = ix / segX;
      const factorX = Math.abs(tx - 0.5) * 2;
      const signX = tx >= 0.5 ? 1 : -1;

      const t = Math.max(factorX, factorZ);
      const curHalfW = THREE.MathUtils.lerp(hrw, hw, t);
      const curHalfD = THREE.MathUtils.lerp(hrd, hd, t);

      const px = signX * (factorX * curHalfW);
      const pz = signZ * (factorZ * curHalfD);

      // 自然下垂凹曲并四角起翘 (Sori Curve)
      let py = height * (1 - Math.pow(t, 0.88));
      const cornerWeight = Math.pow(factorX * factorZ, 2.2);
      py += 0.55 * cornerWeight;

      pos.push(px, py, pz);
      uvs.push(tx * 4.0, tz * 4.0);
    }
  }

  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * (segX + 1) + ix;
      const b = a + 1;
      const c = (iz + 1) * (segX + 1) + ix;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const roofMesh = new THREE.Mesh(geo, tileMat);
  roofMesh.userData.isTile = true;
  roofMesh.userData.keepUv = true;
  g.add(roofMesh);

  // 四周纯白漆喰封檐板 (白漆喰総塗籠)
  const trimBoxS = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.25, 0.32, 0.38), whiteTrimMat);
  trimBoxS.position.set(0, 0.08, hd);
  g.add(trimBoxS);

  const trimBoxN = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.25, 0.32, 0.38), whiteTrimMat);
  trimBoxN.position.set(0, 0.08, -hd);
  g.add(trimBoxN);

  const trimBoxE = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, totalD + 0.25), whiteTrimMat);
  trimBoxE.position.set(hw, 0.08, 0);
  g.add(trimBoxE);

  const trimBoxW = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, totalD + 0.25), whiteTrimMat);
  trimBoxW.position.set(-hw, 0.08, 0);
  g.add(trimBoxW);

  // 檐底纯白漆喰衬板 (从下方仰视呈现纯白羽翼效果)
  const soffit = new THREE.Mesh(new THREE.PlaneGeometry(totalW * 0.96, totalD * 0.96), whiteTrimMat);
  soffit.rotation.x = Math.PI / 2;
  soffit.position.y = -0.05;
  g.add(soffit);

  // 顶脊纯白大棟 (Main Ridge)
  if (ridgeW > 0.4) {
    const ridgeCrest = new THREE.Mesh(new THREE.BoxGeometry(ridgeW + 0.4, 0.5, 0.55), whiteTrimMat);
    ridgeCrest.position.set(0, height + 0.18, 0);
    g.add(ridgeCrest);
  } else if (ridgeD > 0.4) {
    const ridgeCrest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, ridgeD + 0.4), whiteTrimMat);
    ridgeCrest.position.set(0, height + 0.18, 0);
    g.add(ridgeCrest);
  }

  // 姬路城标志性美学：四道纯白斜脊（隅棟 Sumimune）
  const topCorners = [
    new THREE.Vector3(-hrw, height + 0.12, -hrd),
    new THREE.Vector3(hrw, height + 0.12, -hrd),
    new THREE.Vector3(hrw, height + 0.12, hrd),
    new THREE.Vector3(-hrw, height + 0.12, hrd),
  ];
  const botCorners = [
    new THREE.Vector3(-hw, 0.25, -hd),
    new THREE.Vector3(hw, 0.25, -hd),
    new THREE.Vector3(hw, 0.25, hd),
    new THREE.Vector3(-hw, 0.25, hd),
  ];

  for (let k = 0; k < 4; k++) {
    const p1 = topCorners[k];
    const p2 = botCorners[k];
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mid.y -= 0.15;
    const len = p1.distanceTo(p2);

    const hipRidge = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, len), whiteTrimMat);
    hipRidge.position.copy(mid);
    hipRidge.lookAt(p2);
    g.add(hipRidge);
  }

  return g;
}

/**
 * 创建标准三角形千鸟破风 (Chidori-hafu)
 */
function createChidoriGable(
  width: number,
  depth: number,
  height: number,
  tileMat: THREE.Material,
  whiteTrimMat: THREE.Material,
  woodMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const hw = width / 2;

  const slopeL = Math.sqrt(hw * hw + height * height) + 0.35;
  const angle = Math.atan2(height, hw);

  const sL = new THREE.Mesh(new THREE.BoxGeometry(0.3, depth, slopeL), tileMat);
  sL.userData.isTile = true;
  sL.rotation.set(-Math.PI / 2, 0, angle);
  sL.position.set(-hw / 2, height / 2, depth / 2);
  g.add(sL);

  const sR = new THREE.Mesh(new THREE.BoxGeometry(0.3, depth, slopeL), tileMat);
  sR.userData.isTile = true;
  sR.rotation.set(-Math.PI / 2, 0, -angle);
  sR.position.set(hw / 2, height / 2, depth / 2);
  g.add(sR);

  // 顶脊白线
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, depth + 0.1), whiteTrimMat);
  ridge.position.set(0, height + 0.1, depth / 2);
  g.add(ridge);

  // 人字破风板纯白外缘
  const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, slopeL), whiteTrimMat);
  trimL.rotation.set(-Math.PI / 2, 0, angle);
  trimL.position.set(-hw / 2, height / 2, depth + 0.06);
  g.add(trimL);

  const trimR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, slopeL), whiteTrimMat);
  trimR.rotation.set(-Math.PI / 2, 0, -angle);
  trimR.position.set(hw / 2, height / 2, depth + 0.06);
  g.add(trimR);

  // 三角形山花白漆喰底板
  const shape = new THREE.Shape();
  shape.moveTo(-hw + 0.1, 0);
  shape.lineTo(hw - 0.1, 0);
  shape.lineTo(0, height - 0.1);
  shape.closePath();
  const tympanum = new THREE.Mesh(new THREE.ShapeGeometry(shape), whiteTrimMat);
  tympanum.position.z = depth - 0.05;
  g.add(tympanum);

  // 山花内深色木穿枋柱
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, height * 0.85, 0.1), woodMat);
  post.position.set(0, height * 0.45, depth);
  g.add(post);

  // 悬鱼雕花 (Gegyo)
  const gegyo = new THREE.Mesh(new THREE.BoxGeometry(0.42, height * 0.58, 0.14), whiteTrimMat);
  gegyo.position.set(0, height * 0.52, depth + 0.12);
  g.add(gegyo);

  return g;
}

/**
 * 创建比翼千鸟破风 (Hiyoku Chidori-hafu - 双峰相连比翼尖顶)
 * 姬路城南面第 3 重最具辨识度的双联破风结构
 */
function createHiyokuChidoriGable(
  totalWidth: number,
  depth: number,
  height: number,
  tileMat: THREE.Material,
  whiteTrimMat: THREE.Material,
  woodMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  const peakW = totalWidth * 0.52;
  const leftX = -totalWidth * 0.25;
  const rightX = totalWidth * 0.25;

  const leftGable = createChidoriGable(peakW, depth, height, tileMat, whiteTrimMat, woodMat);
  leftGable.position.set(leftX, 0, 0);
  g.add(leftGable);

  const rightGable = createChidoriGable(peakW, depth, height, tileMat, whiteTrimMat, woodMat);
  rightGable.position.set(rightX, 0, 0);
  g.add(rightGable);

  // 双峰中央相接山谷处的纯白漆喰过渡板
  const valley = new THREE.Mesh(new THREE.BoxGeometry(0.5, height * 0.6, depth), whiteTrimMat);
  valley.position.set(0, height * 0.3, depth / 2);
  g.add(valley);

  return g;
}

/**
 * 创建波浪起拱唐破风 (Kara-hafu)
 */
function createKaraGable(
  width: number,
  depth: number,
  rise: number,
  tileMat: THREE.Material,
  whiteTrimMat: THREE.Material,
  woodMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const hw = width / 2;

  const shape = new THREE.Shape();
  const segs = 28;
  shape.moveTo(-hw, 0);
  for (let i = 0; i <= segs; i++) {
    const x = -hw + (i / segs) * width;
    const nx = x / hw;
    const y = rise * Math.pow(Math.cos(nx * (Math.PI / 2)), 1.32);
    shape.lineTo(x, Math.max(0, y));
  }
  shape.lineTo(hw, 0);
  shape.closePath();

  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12 }),
    tileMat
  );
  roof.userData.isTile = true;
  g.add(roof);

  // 正面纯白漆喰饰线
  const frontTrim = new THREE.Mesh(new THREE.ShapeGeometry(shape), whiteTrimMat);
  frontTrim.position.z = depth + 0.14;
  g.add(frontTrim);

  // 纯白山花底板
  const backFill = new THREE.Mesh(new THREE.ShapeGeometry(shape), whiteTrimMat);
  backFill.position.z = depth - 0.02;
  g.add(backFill);

  // 垂舌悬鱼
  const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.36, rise * 0.65, 0.16), woodMat);
  pendant.position.set(0, rise * 0.4, depth + 0.16);
  g.add(pendant);

  return g;
}

/**
 * 创建一对金光【鯱瓦】(Golden Shachihoko)
 */
function createShachihoko(scale = 1.0, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const pts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.45 * scale, 0.35 * scale),
    new THREE.Vector3(0, 1.15 * scale, 0.45 * scale),
    new THREE.Vector3(0, 1.7 * scale, 0.18 * scale),
    new THREE.Vector3(0, 2.05 * scale, -0.22 * scale),
  ];
  const body = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.28 * scale, 8, false),
    mat
  );
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale, 0.45 * scale, 0.6 * scale), mat);
  head.position.set(0, 0.25 * scale, -0.22 * scale);
  g.add(head);

  // 向上翘立的波浪鱼背鳍
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.75 * scale, 0.5 * scale), mat);
  fin.rotation.x = 0.4;
  fin.position.set(0, 2.1 * scale, -0.3 * scale);
  g.add(fin);

  return g;
}

/**
 * 创建日本黑松 (Japanese Black Pine)
 */
function createJapanesePine(height: number): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d3126, roughness: 0.95 });
  const needleMat = new THREE.MeshStandardMaterial({ color: 0x1d331f, roughness: 0.88 });

  // 苍劲弯曲主干
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.4, height * 0.35, 0.2),
    new THREE.Vector3(-0.3, height * 0.7, -0.1),
    new THREE.Vector3(0.2, height, 0.1),
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 12, 0.42, 7, false), trunkMat);
  g.add(trunk);

  // 伞状层叠松针云团 (Cloud-pruned needle pads)
  const clouds = [
    { x: 0.8, y: height * 0.55, z: 0.5, r: 2.2 },
    { x: -0.9, y: height * 0.72, z: -0.4, r: 2.0 },
    { x: 0.5, y: height * 0.9, z: -0.3, r: 2.4 },
    { x: -0.2, y: height * 1.05, z: 0.2, r: 2.6 },
  ];

  for (const c of clouds) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.7, c.r, 0.7, 8), needleMat);
    pad.position.set(c.x, c.y, c.z);
    g.add(pad);
  }

  return g;
}

// ─────────────────────────────────────────────────────────────
// 3. 姬路城核心建筑群装配
// ─────────────────────────────────────────────────────────────

export function createHimeji(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "himeji";

  // 材质库
  const stoneTex = makeWarmStoneTexture();
  const stoneMatDay = new THREE.MeshStandardMaterial({
    color: 0xbfb6a6,
    map: stoneTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const stoneMatNight = new THREE.MeshStandardMaterial({
    color: 0x5a5347,
    map: stoneTex,
    roughness: 0.9,
    metalness: 0.05,
    emissive: 0x27241e,
    emissiveIntensity: 0.28,
  });

  const plasterTex = makePlasterTexture();
  const plasterMatDay = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plasterTex,
    roughness: 0.88,
  });
  const plasterMatNight = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: plasterTex,
    roughness: 0.82,
    emissive: 0x64748b,
    emissiveIntensity: 0.48,
  });

  const tileTex = makeKawaraTexture();
  const tileMatDay = new THREE.MeshStandardMaterial({
    color: 0x3d4452,
    map: tileTex,
    roughness: 0.72,
    metalness: 0.08,
  });
  const tileMatNight = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    map: tileTex,
    roughness: 0.7,
    metalness: 0.08,
    emissive: 0x0f172a,
    emissiveIntensity: 0.15,
  });

  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x1f1812,
    roughness: 0.88,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xebb844,
    metalness: 0.88,
    roughness: 0.22,
    emissive: 0x925612,
    emissiveIntensity: 0.22,
  });

  const degoshiTex = makeDegoshiTexture();
  const windowMatDay = new THREE.MeshStandardMaterial({
    map: degoshiTex,
    roughness: 0.75,
  });
  const windowMatNight = new THREE.MeshStandardMaterial({
    map: degoshiTex,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
  });

  const swappablePlaster: THREE.Mesh[] = [];
  const swappableStone: THREE.Mesh[] = [];
  const swappableTile: THREE.Mesh[] = [];
  const swappableWindow: THREE.Mesh[] = [];

  function regP(m: THREE.Mesh) { swappablePlaster.push(m); return m; }
  function regS(m: THREE.Mesh) { swappableStone.push(m); return m; }
  function regW(m: THREE.Mesh) { m.userData.keepUv = true; swappableWindow.push(m); return m; }

  function collectTiles(obj: THREE.Object3D) {
    obj.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && c.userData.isTile) {
        swappableTile.push(c as THREE.Mesh);
      }
    });
  }

  // ═════════════════════════════════════════════════════════════
  // A. 扇之勾配高石垣与前沿台地 (Soaring Curved Ishigaki Ramparts)
  // ═════════════════════════════════════════════════════════════
  const ishigakiGroup = new THREE.Group();

  // 1. 大天守主台基 (位于右侧 X = 6m, Z = 1m)
  const tiers = 8;
  const tierH = 15.0 / tiers;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const flare = Math.pow(1 - t, 1.85) * 5.8; // 扇之勾配抛物线反曲
    const layer = regS(box(ishigakiGroup, stoneMatDay, 34 + flare * 2, tierH + 0.15, 30 + flare * 2, 6, i * tierH, 1));
    layer.userData.skipLines = (i < tiers - 1);
  }

  // 2. 西小天守台与渡橹石垣 (位于左侧延伸 X = -17m, Z = -9m)
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const flare = Math.pow(1 - t, 1.7) * 4.4;
    regS(box(ishigakiGroup, stoneMatDay, 24 + flare * 2, tierH + 0.15, 22 + flare * 2, -17, i * tierH, -9));
  }

  // 3. 渡橹下方连接石垣
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const flare = Math.pow(1 - t, 1.7) * 3.6;
    regS(box(ishigakiGroup, stoneMatDay, 18 + flare * 2, tierH + 0.15, 16 + flare * 2, -6, i * tierH, -6));
  }

  // 4. 前沿二之丸/备前丸梯级石垣台地 (前下方错落石墙与水之门)
  regS(box(ishigakiGroup, stoneMatDay, 40, 7.5, 14, -2, 0, 16));
  regS(box(ishigakiGroup, stoneMatDay, 22, 10.5, 12, -9, 0, 10));

  // 水之门白漆喰防御矮墙与射孔
  regP(box(ishigakiGroup, plasterMatDay, 16, 2.6, 0.9, -9, 10.5, 14.5));
  const gateRoof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.45, 1.5), tileMatDay);
  gateRoof.position.set(-9, 13.3, 14.5);
  gateRoof.userData.isTile = true;
  ishigakiGroup.add(gateRoof);

  // 台基周遭苍翠日本黑松林
  const pineCoords = [
    [-24, 0, 18], [-16, 0, 24], [-2, 0, 26], [14, 0, 22], [24, 0, 15],
  ];
  for (const [px, py, pz] of pineCoords) {
    const pine = createJapanesePine(7.0 + Math.random() * 2.0);
    pine.position.set(px, py, pz);
    ishigakiGroup.add(pine);
  }

  root.add(ishigakiGroup);

  // ═════════════════════════════════════════════════════════════
  // B. 大天守 (Daitenshu - Great Keep)
  // 严格还原各层破风类型、数量与真实排布：
  // ═════════════════════════════════════════════════════════════
  const daitenshu = new THREE.Group();
  daitenshu.position.set(6, 15.0, 1);

  // ── 第 1 层 (一阶, y = 0 ~ 6.0m): 基底白壁与转角【石落】 ──
  const t1W = 22.0;
  const t1D = 18.0;
  const t1H = 6.0;
  regP(box(daitenshu, plasterMatDay, t1W, t1H, t1D, 0, 0, 0));

  // 转角外挑梯形石落 (Ishi-otoshi chutes)
  for (const cx of [-t1W / 2 + 0.5, t1W / 2 - 0.5]) {
    for (const cz of [-t1D / 2 + 0.5, t1D / 2 - 0.5]) {
      const chute = regP(box(daitenshu, plasterMatDay, 2.5, 2.8, 2.5, cx, 0.1, cz));
      chute.rotation.y = Math.PI / 4;
    }
  }

  // 第 1 重宽广飞檐 (出挑 2.0m)
  const roof1 = createEavesRoof(t1W, t1D, 2.5, 2.0, t1W * 0.45, t1D * 0.1, tileMatDay, whiteTrimMat);
  roof1.position.y = t1H;
  daitenshu.add(roof1);

  // ── 第 2 层 (二阶, y = 6.0 ~ 11.5m): 南面轩唐破风与出格子窗；西面大入母屋破风 ──
  const t2W = 18.4;
  const t2D = 15.2;
  const t2H = 5.5;
  const t2Y = 6.0;
  regP(box(daitenshu, plasterMatDay, t2W, t2H, t2D, 0, t2Y, 0));

  // 【南面中央】：1 座【轩唐破风】(Kara-hafu)
  const kara2S = createKaraGable(6.2, 2.4, 2.1, tileMatDay, whiteTrimMat, woodMat);
  kara2S.position.set(0, t2Y + 1.8, t2D / 2 + 0.2);
  daitenshu.add(kara2S);

  // 【南面轩唐破风正下方】：凸出式纯白竖棂【出格子窗】(De-goshi Bay Window)
  regW(box(daitenshu, windowMatDay, 4.8, 2.2, 0.5, 0, t2Y + 1.2, t2D / 2 + 0.38));

  // 【西面】：贯通二重至三重的【大入母屋破风】(Giant Irimoya-hafu)
  const grandIrimoyaW = createChidoriGable(11.2, 3.2, 4.4, tileMatDay, whiteTrimMat, woodMat);
  grandIrimoyaW.rotation.y = -Math.PI / 2;
  grandIrimoyaW.position.set(-t2W / 2 - 0.2, t2Y + 1.2, 0);
  daitenshu.add(grandIrimoyaW);

  // 第 2 重飞檐
  const roof2 = createEavesRoof(t2W, t2D, 2.3, 1.8, t2W * 0.42, t2D * 0.1, tileMatDay, whiteTrimMat);
  roof2.position.y = t2Y + t2H;
  daitenshu.add(roof2);

  // ── 第 3 层 (三阶, y = 11.5 ~ 17.0m): 南面【比翼千鸟破风】；西面【大千鸟破风】 ──
  const t3W = 15.2;
  const t3D = 12.8;
  const t3H = 5.5;
  const t3Y = t2Y + t2H;
  regP(box(daitenshu, plasterMatDay, t3W, t3H, t3D, 0, t3Y, 0));

  // 【南面中央】：1 组【比翼千鸟破风】(Hiyoku Chidori-hafu, 左右紧密相连的双峰连体尖顶！)
  // 这是姬路城南面最具辨识度、独一无二的破风形态！
  const hiyoku3S = createHiyokuChidoriGable(9.6, 2.6, 3.0, tileMatDay, whiteTrimMat, woodMat);
  hiyoku3S.position.set(0, t3Y + 1.5, t3D / 2 + 0.2);
  daitenshu.add(hiyoku3S);

  // 【西面中央】：1 座雄伟的【大千鸟破风】(Grand Chidori Gable)，双联方窗与白雕悬鱼
  const grandChidoriW = createChidoriGable(8.8, 3.0, 3.8, tileMatDay, whiteTrimMat, woodMat);
  grandChidoriW.rotation.y = -Math.PI / 2;
  grandChidoriW.position.set(-t3W / 2 - 0.2, t3Y + 1.3, 0);
  daitenshu.add(grandChidoriW);

  // 大千鸟山花内的双联方窗
  for (const sz of [-1.3, 1.3]) {
    regW(box(daitenshu, windowMatDay, 0.25, 1.5, 1.3, -t3W / 2 - 0.12, t3Y + 2.2, sz));
  }

  // 第 3 重飞檐
  const roof3 = createEavesRoof(t3W, t3D, 2.2, 1.6, t3W * 0.38, t3D * 0.1, tileMatDay, whiteTrimMat);
  roof3.position.y = t3Y + t3H;
  daitenshu.add(roof3);

  // ── 第 4 层 (四阶, y = 17.0 ~ 22.2m): 南面【2座并列千鸟破风】；西面【1座千鸟破风】 ──
  const t4W = 12.6;
  const t4D = 10.4;
  const t4H = 5.2;
  const t4Y = t3Y + t3H;
  regP(box(daitenshu, plasterMatDay, t4W, t4H, t4D, 0, t4Y, 0));

  // 【南面】：左右对称配置的【2 座独立千鸟破风】(Twin Chidori Gables, 双三角形尖顶！)
  // 两个尖锐对称的千鸟三角形将视线向最上层收拢
  const chidori4S_Left = createChidoriGable(4.2, 2.2, 2.4, tileMatDay, whiteTrimMat, woodMat);
  chidori4S_Left.position.set(-2.8, t4Y + 1.3, t4D / 2 + 0.15);
  daitenshu.add(chidori4S_Left);

  const chidori4S_Right = createChidoriGable(4.2, 2.2, 2.4, tileMatDay, whiteTrimMat, woodMat);
  chidori4S_Right.position.set(2.8, t4Y + 1.3, t4D / 2 + 0.15);
  daitenshu.add(chidori4S_Right);

  // 【西面中央】：1 座挺拔的【千鸟破风】(Chidori-hafu)
  const chidori4W = createChidoriGable(4.8, 2.3, 2.6, tileMatDay, whiteTrimMat, woodMat);
  chidori4W.rotation.y = -Math.PI / 2;
  chidori4W.position.set(-t4W / 2 - 0.15, t4Y + 1.3, 0);
  daitenshu.add(chidori4W);

  // 西立面破风下方 2 扇方窗
  for (const sz of [-1.8, 1.8]) {
    regW(box(daitenshu, windowMatDay, 0.2, 1.4, 1.1, -t4W / 2 - 0.08, t4Y + 1.6, sz));
  }

  // 第 4 重飞檐
  const roof4 = createEavesRoof(t4W, t4D, 2.2, 1.5, t4W * 0.35, t4D * 0.08, tileMatDay, whiteTrimMat);
  roof4.position.y = t4Y + t4H;
  daitenshu.add(roof4);

  // ── 第 5 层 (顶层望楼, y = 22.2 ~ 30.0m): 南面【轩唐破风】；西面【大入母屋破风】与【金鯱】 ──
  const t5W = 9.6;
  const t5D = 7.8;
  const t5H = 4.6;
  const t5Y = t4Y + t4H;

  regP(box(daitenshu, plasterMatDay, t5W, t5H, t5D, 0, t5Y, 0));

  // 【南面中央】：最上层屋檐正中央配置的 1 座精巧优雅【轩唐破风】(Kara-hafu)
  const kara5S = createKaraGable(3.8, 1.8, 1.4, tileMatDay, whiteTrimMat, woodMat);
  kara5S.position.set(0, t5Y + 1.7, t5D / 2 + 0.15);
  daitenshu.add(kara5S);

  // 南立面 5 扇连子长方窗
  for (let i = 0; i < 5; i++) {
    const sx = -3.2 + i * 1.6;
    regW(box(daitenshu, windowMatDay, 1.1, 1.7, 0.2, sx, t5Y + 1.4, t5D / 2 + 0.08));
  }

  // 西立面 3 扇深黑竖长方窗
  for (const sz of [-2.4, 0, 2.4]) {
    regW(box(daitenshu, windowMatDay, 0.2, 1.7, 1.2, -t5W / 2 - 0.08, t5Y + 1.4, sz));
  }

  // 顶层主屋顶：入母屋造，大棟主脊沿东西向（±X）贯通，金光鯱瓦立于东西两端
  const roof5 = createEavesRoof(t5W, t5D, 3.4, 2.0, t5W * 0.68, 0.2, tileMatDay, whiteTrimMat);
  roof5.position.y = t5Y + t5H;
  daitenshu.add(roof5);

  const topGableW = createChidoriGable(t5D * 0.85, 0.8, 2.4, tileMatDay, whiteTrimMat, woodMat);
  topGableW.rotation.y = -Math.PI / 2;
  topGableW.position.set(-t5W / 2 + 0.1, t5Y + t5H + 0.35, 0);
  daitenshu.add(topGableW);

  // 大棟东西两端高耸的【金光鯱瓦】(Golden Shachihoko)
  const ridgeHalfLen = (t5W * 0.68) / 2 - 0.2;
  const shachiWest = createShachihoko(0.98, goldMat);
  shachiWest.position.set(-ridgeHalfLen, t5Y + t5H + 3.5, 0);
  shachiWest.rotation.y = Math.PI / 2;
  daitenshu.add(shachiWest);

  const shachiEast = createShachihoko(0.98, goldMat);
  shachiEast.position.set(ridgeHalfLen, t5Y + t5H + 3.5, 0);
  shachiEast.rotation.y = -Math.PI / 2;
  daitenshu.add(shachiEast);

  root.add(daitenshu);

  // ═════════════════════════════════════════════════════════════
  // C. 左侧西小天守与渡橹防御走廊 (West Keep & Connecting Corridor)
  // ═════════════════════════════════════════════════════════════
  const westWing = new THREE.Group();

  // ── 西小天守 (Nishi-kotenshu, 位于 X = -17m, Z = -9m) ──
  const nishiKeep = new THREE.Group();
  nishiKeep.position.set(-17, 15.0, -9);
  {
    // 1 层
    regP(box(nishiKeep, plasterMatDay, 12.0, 4.5, 10.0, 0, 0, 0));
    const r1 = createEavesRoof(12.0, 10.0, 1.9, 1.5, 4.2, 0.1, tileMatDay, whiteTrimMat);
    r1.position.y = 4.5;
    nishiKeep.add(r1);

    // 2 层
    regP(box(nishiKeep, plasterMatDay, 9.4, 4.0, 8.0, 0, 4.5, 0));
    // 二重南面：正对镜头挺拔的千鸟破风 1 座！
    const gS = createChidoriGable(4.2, 1.8, 1.8, tileMatDay, whiteTrimMat, woodMat);
    gS.position.set(0, 5.8, 4.0);
    nishiKeep.add(gS);

    const r2 = createEavesRoof(9.4, 8.0, 1.7, 1.3, 3.4, 0.1, tileMatDay, whiteTrimMat);
    r2.position.y = 8.5;
    nishiKeep.add(r2);

    // 3 层顶楼与金鯱
    regP(box(nishiKeep, plasterMatDay, 7.2, 3.4, 6.0, 0, 8.5, 0));
    const r3 = createEavesRoof(7.2, 6.0, 1.9, 1.4, 4.4, 0.2, tileMatDay, whiteTrimMat);
    r3.position.y = 11.9;
    nishiKeep.add(r3);

    const sW = createShachihoko(0.55, goldMat);
    sW.position.set(-1.9, 13.9, 0);
    sW.rotation.y = Math.PI / 2;
    nishiKeep.add(sW);
    const sE = createShachihoko(0.55, goldMat);
    sE.position.set(1.9, 13.9, 0);
    sE.rotation.y = -Math.PI / 2;
    nishiKeep.add(sE);
  }
  westWing.add(nishiKeep);

  // ── 渡橹横向长廊 (Watari-yagura, 连接西小天守与大天守) ──
  // X 从 -12m 跨越至 +1m，沿 Z = -5m 排布
  const corridorLen = 14.5;
  const corridorX = -5.8;
  const corridorZ = -5.5;

  regP(box(westWing, plasterMatDay, corridorLen, 5.0, 4.5, corridorX, 15.0, corridorZ));

  // 渡橹窗户与铁炮狭间
  for (let x = -11; x <= 0; x += 2.8) {
    regW(box(westWing, windowMatDay, 1.3, 1.4, 0.2, x, 17.2, corridorZ + 2.3));
  }

  // 渡橹双坡歇山屋顶
  const corridorRoof = createEavesRoof(corridorLen, 4.5, 1.8, 1.2, corridorLen * 0.85, 0.1, tileMatDay, whiteTrimMat);
  corridorRoof.position.set(corridorX, 20.0, corridorZ);
  westWing.add(corridorRoof);

  // 渡橹屋顶中央的小千鸟破风
  const midGable = createChidoriGable(3.2, 2.0, 1.6, tileMatDay, whiteTrimMat, woodMat);
  midGable.position.set(-5.8, 20.0, corridorZ + 1.4);
  westWing.add(midGable);

  root.add(westWing);

  // ═════════════════════════════════════════════════════════════
  // D. 白鹭光照增强与夜间投光照明系统
  // ═════════════════════════════════════════════════════════════
  // 日间漫反射环境补光
  const sunBounceLight = new THREE.HemisphereLight(0xfffdfa, 0x8d8476, 0.65);
  root.add(sunBounceLight);

  const spotSW = new THREE.PointLight(0xe0f2fe, 0, 95, 1.8);
  spotSW.position.set(-15, 8, 25);
  root.add(spotSW);

  const spotSE = new THREE.PointLight(0xfef08a, 0, 90, 1.8);
  spotSE.position.set(22, 8, 20);
  root.add(spotSE);

  const spotTop = new THREE.PointLight(0xfef08a, 0, 55, 1.5);
  spotTop.position.set(6, 52, 1);
  root.add(spotTop);

  // 检视模式与夜间窗光响应接口
  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    for (const m of swappablePlaster) m.material = night ? plasterMatNight : plasterMatDay;
    for (const m of swappableStone) m.material = night ? stoneMatNight : stoneMatDay;
    for (const m of swappableTile) m.material = night ? tileMatNight : tileMatDay;
    for (const m of swappableWindow) m.material = night ? windowMatNight : windowMatDay;

    sunBounceLight.intensity = night ? 0.08 : 0.65;
    spotSW.intensity = night ? 3.8 : 0;
    spotSE.intensity = night ? 3.4 : 0;
    spotTop.intensity = night ? 2.6 : 0;
  };

  collectTiles(root);
  return root;
}
