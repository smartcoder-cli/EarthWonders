import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  cyl,
} from "./_shared";

function createMuseumTorusGeometry(
  radialSegments = 96,
  tubularSegments = 48,
  Ax = 34.0,
  Ay = 23.5,
  Cy0 = 43.5
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2;
    // 中心脊线在 XY 平面的非对称气动椭圆轨迹
    const cx = Ax * Math.cos(u);
    const cy = Cy0 + Ay * Math.sin(u) - 1.8 * Math.sin(2 * u);

    // XY 切线与外法向单位向量
    const tx = -Ax * Math.sin(u);
    const ty = Ay * Math.cos(u) - 3.6 * Math.cos(2 * u);
    const tLen = Math.hypot(tx, ty);
    const nx = ty / tLen;
    const ny = -tx / tLen;

    // 管截面半径随 u 的空间渐变（底部加厚平缓扎根覆土绿丘，顶部轻盈收窄呈飞翼气动轮廓）
    const sinU = Math.sin(u);
    const rz = 15.0 - 3.0 * sinU;
    const rn = 12.0 + 1.8 * Math.cos(u) * Math.cos(u);

    for (let j = 0; j <= tubularSegments; j++) {
      const v = (j / tubularSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const px = cx + rn * cosV * nx;
      const py = cy + rn * cosV * ny;
      const pz = rz * sinV;

      positions.push(px, py, pz);
      // UV: u 顺环向环绕 [0, 1]，v 沿管周截面环绕 [0, 1]
      uvs.push(i / radialSegments, j / tubularSegments);
    }
  }

  for (let i = 0; i < radialSegments; i++) {
    for (let j = 0; j < tubularSegments; j++) {
      const a = i * (tubularSegments + 1) + j;
      const b = (i + 1) * (tubularSegments + 1) + j;
      const c = (i + 1) * (tubularSegments + 1) + (j + 1);
      const d = i * (tubularSegments + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// 漫反射基础贴图 (Diffuse Surface Map)
function makeMuseumArabicDiffuse(isNight: boolean): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 1. 特种不锈钢拉丝金属底色渐变
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  if (isNight) {
    bgGrad.addColorStop(0, "#030712");
    bgGrad.addColorStop(0.5, "#080e1a");
    bgGrad.addColorStop(1, "#02050d");
  } else {
    bgGrad.addColorStop(0, "#f8fafc");
    bgGrad.addColorStop(0.35, "#e2e8f0");
    bgGrad.addColorStop(0.7, "#cbd5e1");
    bgGrad.addColorStop(1, "#f1f5f9");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 金属表面微细水平拉丝纹理
  ctx.strokeStyle = isNight ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 2. 1,024 块复杂曲面三角形拓扑分格线 (Parametric Diagrid)
  ctx.strokeStyle = isNight ? "rgba(255,255,255,0.06)" : "rgba(100,116,139,0.32)";
  ctx.lineWidth = 1.2;
  for (let x = 0; x < w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 24, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // 3. 迪拜未来博物馆阿拉伯书法窗带 (Luminous Glass Ribbon Windows, NOT dark cracks)
  const tracks = [140, 300, 480, 680, 860];
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let t = 0; t < tracks.length; t++) {
    const cy = tracks[t];

    const drawScriptPath = () => {
      let curX = 24;
      ctx.beginPath();
      ctx.moveTo(curX, cy);
      while (curX < w - 30) {
        const segW = 85 + ((curX * 17) % 75);
        const waveY = Math.sin((curX / w) * Math.PI * 10 + t) * 36;
        ctx.quadraticCurveTo(curX + segW * 0.45, cy + waveY + 24, curX + segW, cy + waveY * 0.4);

        if (curX % 120 < 60) {
          const ascH = 55 + (curX % 30);
          ctx.moveTo(curX + segW * 0.7, cy + waveY);
          ctx.quadraticCurveTo(curX + segW * 0.72, cy + waveY - ascH, curX + segW * 0.85, cy + waveY - ascH);
          ctx.moveTo(curX + segW, cy + waveY * 0.4);
        }
        if (curX % 140 < 70) {
          const descH = 42 + (curX % 25);
          ctx.moveTo(curX + segW * 0.3, cy + waveY);
          ctx.bezierCurveTo(
            curX + segW * 0.35, cy + waveY + descH,
            curX + segW * 0.6, cy + waveY + descH,
            curX + segW * 0.65, cy + waveY + 8
          );
          ctx.moveTo(curX + segW, cy + waveY * 0.4);
        }
        curX += segW + 15;
      }
      ctx.stroke();
    };

    const drawScriptDots = () => {
      for (let dx = 40; dx < w - 40; dx += 90 + (dx % 45)) {
        const dy = cy + Math.sin(dx * 0.08 + t) * 22;
        const isAbove = (dx % 2 === 0);
        const dotY = isAbove ? (dy - 36) : (dy + 34);

        ctx.beginPath();
        ctx.arc(dx, dotY, 7.5, 0, Math.PI * 2);
        ctx.fill();

        if (dx % 90 === 0) {
          ctx.lineWidth = 5.0;
          ctx.beginPath();
          ctx.moveTo(dx - 10, dotY - 12);
          ctx.lineTo(dx + 8, dotY - 3);
          ctx.stroke();
        }
      }
    };

    if (isNight) {
      // 夜间：深色背景上的发光青蓝书法带
      ctx.strokeStyle = "rgba(14, 165, 233, 0.45)";
      ctx.lineWidth = 18;
      drawScriptPath();

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 12;
      drawScriptPath();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      drawScriptPath();

      ctx.fillStyle = "#ffffff";
      drawScriptDots();
    } else {
      // 日间：绝非黑纹暗痕！乃是精密嵌合在不锈钢曲面中的采光透光玻璃带
      // 1) 边缘微细金属嵌槽
      ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
      ctx.lineWidth = 18;
      drawScriptPath();

      // 2) 莹润明亮的冰青白色透光玻璃长卷
      ctx.strokeStyle = "#cffafe";
      ctx.lineWidth = 13;
      drawScriptPath();

      // 3) 中心阳光高光耀斑
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      drawScriptPath();

      // 4) 闪亮透光音符点
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#38bdf8";
      drawScriptDots();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// 纯自发光贴图 (Pure Emissive Map with Absolute Pitch-Black Background)
function makeMuseumArabicEmissive(isNight: boolean): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 严格纯黑底色，确保不发光的金属主体在夜间保持深邃质感，不发生泛灰泛光
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  const tracks = [140, 300, 480, 680, 860];
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let t = 0; t < tracks.length; t++) {
    const cy = tracks[t];

    const drawScriptPath = () => {
      let curX = 24;
      ctx.beginPath();
      ctx.moveTo(curX, cy);
      while (curX < w - 30) {
        const segW = 85 + ((curX * 17) % 75);
        const waveY = Math.sin((curX / w) * Math.PI * 10 + t) * 36;
        ctx.quadraticCurveTo(curX + segW * 0.45, cy + waveY + 24, curX + segW, cy + waveY * 0.4);

        if (curX % 120 < 60) {
          const ascH = 55 + (curX % 30);
          ctx.moveTo(curX + segW * 0.7, cy + waveY);
          ctx.quadraticCurveTo(curX + segW * 0.72, cy + waveY - ascH, curX + segW * 0.85, cy + waveY - ascH);
          ctx.moveTo(curX + segW, cy + waveY * 0.4);
        }
        if (curX % 140 < 70) {
          const descH = 42 + (curX % 25);
          ctx.moveTo(curX + segW * 0.3, cy + waveY);
          ctx.bezierCurveTo(
            curX + segW * 0.35, cy + waveY + descH,
            curX + segW * 0.6, cy + waveY + descH,
            curX + segW * 0.65, cy + waveY + 8
          );
          ctx.moveTo(curX + segW, cy + waveY * 0.4);
        }
        curX += segW + 15;
      }
      ctx.stroke();
    };

    const drawScriptDots = () => {
      for (let dx = 40; dx < w - 40; dx += 90 + (dx % 45)) {
        const dy = cy + Math.sin(dx * 0.08 + t) * 22;
        const isAbove = (dx % 2 === 0);
        const dotY = isAbove ? (dy - 36) : (dy + 34);

        ctx.beginPath();
        ctx.arc(dx, dotY, 7.5, 0, Math.PI * 2);
        ctx.fill();

        if (dx % 90 === 0) {
          ctx.lineWidth = 5.0;
          ctx.beginPath();
          ctx.moveTo(dx - 10, dotY - 12);
          ctx.lineTo(dx + 8, dotY - 3);
          ctx.stroke();
        }
      }
    };

    if (isNight) {
      // 夜间极光级璀璨霓虹自发光 (Crisp, High-Contrast Multi-Pass Radiant Bloom)
      ctx.save();
      // Pass 1: 紧致的青蓝环境光晕 (Tight Cyan Halo Bloom)
      ctx.strokeStyle = "#0284c7";
      ctx.shadowColor = "#00b4d8";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 20;
      drawScriptPath();

      // Pass 2: 鲜明电光青蓝中层 (Vibrant Electric Cyan Ribbon)
      ctx.strokeStyle = "#38bdf8";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 12;
      drawScriptPath();

      // Pass 3: 纯白激光核心 (Pure White Core LED Line)
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 4;
      ctx.lineWidth = 6;
      drawScriptPath();

      // 闪烁书法重音点
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      drawScriptDots();
      ctx.restore();
    } else {
      // 日间莹亮透光玻璃自发光：彻底消除日间“暗纹”，让书法玻璃带在明亮日光下如宝石般晶莹发亮
      ctx.save();
      ctx.strokeStyle = "#e0f2fe";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 12;
      drawScriptPath();

      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 4;
      ctx.lineWidth = 6;
      drawScriptPath();

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 6;
      drawScriptDots();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createMuseumOfTheFuture(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "futuremuseum";

  // 材质体系
  const grassMat = stone(0x367c2b, 0.92, 0.0);
  const curbMat = stone(0xcfd4dc, 0.65, 0.08);
  const concreteMat = stone(0x94a3b8, 0.75, 0.1);
  const poolWater = stone(0x090d16, 0.08, 0.95);

  const diffDay = makeMuseumArabicDiffuse(false);
  const diffNight = makeMuseumArabicDiffuse(true);
  const emissiveDay = makeMuseumArabicEmissive(false);
  const emissiveNight = makeMuseumArabicEmissive(true);

  const torusMatDay = new THREE.MeshStandardMaterial({
    map: diffDay,
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.32,
    emissiveMap: emissiveDay,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
  });
  const torusMatNight = new THREE.MeshStandardMaterial({
    map: diffNight,
    color: 0x0a0f1d,
    roughness: 0.65,
    metalness: 0.15,
    emissiveMap: emissiveNight,
    emissive: 0xffffff,
    emissiveIntensity: 3.2,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.85,
  });
  const glassDay = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.65,
  });
  const glassNight = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.2,
    metalness: 0.2,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.9,
  });

  // 1. 三层有机起伏覆土绿丘生态基座 (Landscaped Multi-Tiered Green Podium Hill, y = 0 ~ 11m)
  // 底层主覆土台地 (Tier 1: 118m x 76m x 3.8m)
  const mound1 = new THREE.Mesh(new THREE.CylinderGeometry(58.0, 64.0, 3.8, 32), grassMat);
  mound1.position.set(0, 1.9, 0);
  mound1.scale.set(1.08, 1.0, 0.72);
  mound1.userData.skipLines = true;
  root.add(mound1);

  // 中层景观台地 (Tier 2: 96m x 62m x 3.5m)
  const mound2 = new THREE.Mesh(new THREE.CylinderGeometry(48.0, 53.0, 3.5, 32), grassMat);
  mound2.position.set(0, 5.2, 0);
  mound2.scale.set(1.05, 1.0, 0.7);
  mound2.userData.skipLines = true;
  root.add(mound2);

  // 顶层环抱台地 (Tier 3: 78m x 48m x 3.2m)
  const mound3 = new THREE.Mesh(new THREE.CylinderGeometry(38.0, 43.0, 3.2, 32), grassMat);
  mound3.position.set(0, 8.4, 0);
  mound3.scale.set(1.03, 1.0, 0.68);
  mound3.userData.skipLines = true;
  root.add(mound3);

  // 弧形层叠挡土矮墙收边石 (Curved Retaining Curbs)
  const curb1 = new THREE.Mesh(new THREE.TorusGeometry(59.0, 0.35, 8, 32), curbMat);
  curb1.rotation.x = Math.PI / 2;
  curb1.position.set(0, 3.8, 0);
  curb1.scale.set(1.08, 0.72, 1.0);
  root.add(curb1);

  // 广场静谧镜面反光水池 (Reflecting Pool)
  box(root, poolWater, 52.0, 0.3, 26.0, 0, 9.8, 26.0);

  // 玻璃入口大堂 (Curved Entrance Pavilion)
  const lobbyGlass = box(root, glassDay, 36.0, 4.2, 12.0, 0, 9.9, 21.0);
  lobbyGlass.userData.keepUv = true;

  // 2. 标志性三维连续光滑双曲圆环体 (Iconic 3D Smooth Parametric Torus Ring, y = 7.7m ~ 79.3m)
  // 长度 95.6 米，总高 71.6 米，横截面厚度 36 米渐变收窄至 24 米，无任何生硬平面
  const torusGeo = createMuseumTorusGeometry(96, 48, 34.0, 23.5, 43.5);
  const torusMesh = new THREE.Mesh(torusGeo, torusMatDay);
  torusMesh.userData.keepUv = true;
  root.add(torusMesh);

  // 3. 内部无柱通透中空椭圆空洞与悬挑观景天台 (Column-Free Void & Cantilevered Observation Deck)
  // 真实未来博物馆中空内部绝无任何钢柱遮挡！仅在底部内凹弧段设有一处悬挑观景平台 (y = 29.5m)
  const deck = box(root, concreteMat, 18.0, 0.8, 16.0, 0, 29.2, 0);
  deck.userData.skipLines = true;
  box(root, steelMat, 18.2, 1.1, 0.3, 0, 29.8, 7.8);
  box(root, steelMat, 18.2, 1.1, 0.3, 0, 29.8, -7.8);
  box(root, glassDay, 18.0, 1.0, 0.2, 0, 29.8, 7.8);
  box(root, glassDay, 18.0, 1.0, 0.2, 0, 29.8, -7.8);

  // 4. 周边迪拜轻轨连接天桥与未来主义圆环立柱 (Metro Link Bridge)
  const bridge = box(root, concreteMat, 12.0, 2.8, 88.0, 42.0, 7.5, 0);
  bridge.userData.skipLines = true;
  for (let bz = -35; bz <= 35; bz += 17.5) {
    cyl(root, curbMat, 0.6, 0.6, 7.5, 42.0, 0, bz, 12);
    // 现代圆环遮阳构架
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.22, 8, 24), steelMat);
    ring.position.set(42.0, 9.8, bz);
    ring.rotation.y = Math.PI / 2;
    root.add(ring);
  }

  // 5. 夜间未来科技泛光与激光光束
  const voidLight = new THREE.PointLight(0x38bdf8, 0.3, 80, 1.6);
  voidLight.position.set(0, 43.5, 0);
  root.add(voidLight);

  const hillSpot = new THREE.PointLight(0x00f0ff, 0, 60, 1.8);
  hillSpot.position.set(0, 12.0, 28.0);
  root.add(hillSpot);

  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    torusMesh.material = night ? torusMatNight : torusMatDay;
    lobbyGlass.material = night ? glassNight : glassDay;
    voidLight.intensity = night ? 1.6 : 0.3;
    hillSpot.intensity = night ? 1.0 : 0;
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 巴塞罗那圣家堂 (Basílica de la Sagrada Família)
// ─────────────────────────────────────────────────────────

