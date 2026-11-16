import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";

function makeGlobalCenterFacadeTexture(isNight: boolean): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  // 基础现代低辐射海蓝色反射玻璃幕墙底色
  g.fillStyle = isNight ? "#050d1a" : "#1e40af";
  g.fillRect(0, 0, w, h);

  const floors = 18;
  const fh = h / floors;
  for (let f = 0; f < floors; f++) {
    const y = f * fh;

    // 纯白水平连续挑檐 / 遮阳带 (Spandrel Louver Fin)
    g.fillStyle = isNight ? "#1e293b" : "#ffffff";
    g.fillRect(0, y, w, 5);

    for (let x = 0; x < w; x += 16) {
      if (isNight) {
        // 夜景动态写字楼与商场内部照明灯火
        const lit = ((f * 17 + x * 11) % 13) > 3;
        if (lit) {
          const warm = (f + x) % 3 === 0;
          g.fillStyle = warm ? "#fef08a" : "#67e8f9";
          g.fillRect(x + 2, y + 5, 12, fh - 6);
        } else {
          g.fillStyle = "#0f172a";
          g.fillRect(x + 2, y + 5, 12, fh - 6);
        }
      } else {
        const grad = g.createLinearGradient(0, y, 0, y + fh);
        grad.addColorStop(0, "#bae6fd");
        grad.addColorStop(0.2, "#38bdf8");
        grad.addColorStop(0.65, "#0284c7");
        grad.addColorStop(1, "#0369a1");
        g.fillStyle = grad;
        g.fillRect(x + 2, y + 5, 12, fh - 6);

        // 竖向高光窗框分格线 (Curtain Wall Mullion)
        g.fillStyle = "rgba(255, 255, 255, 0.65)";
        g.fillRect(x + 2, y + 5, 1.5, fh - 6);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 1);
  return tex;
}

export function createChengduGlobalCenter(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "ChengduGlobalCenter";

  // 真实尺寸与坐标系映射：
  // 东西长 500 米（沿当地东西 X 轴，-X 对应东面天府大道，+X 对应西面益州大道）
  // 南北宽 400 米（沿当地南北 Z 轴，+Z 对应北面锦城大道，-Z 对应南面绕城高速/锦城湖）
  // 主体高 72 米，中央双曲波浪与玻璃苍穹最高达 112 米
  const L_EW = 500;
  const W_NS = 400;
  const BASE_H = 72;
  const CORNER_R = 38;
  const ATRIUM_L = 230;
  const ATRIUM_W = 150;

  const facadeDay = makeGlobalCenterFacadeTexture(false);
  const facadeNight = makeGlobalCenterFacadeTexture(true);

  const wallMatDay = new THREE.MeshStandardMaterial({
    map: facadeDay,
    roughness: 0.42,
    metalness: 0.12,
  });
  const wallMatNight = new THREE.MeshStandardMaterial({
    map: facadeNight,
    emissive: new THREE.Color(0x38bdf8),
    emissiveMap: facadeNight,
    emissiveIntensity: 1.15,
    roughness: 0.35,
    metalness: 0.15,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xcfe2fe,
    roughness: 0.38,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const fasciaMatDay = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.08,
  });
  const fasciaMatNight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0x93c5fd),
    emissiveIntensity: 0.85,
    roughness: 0.3,
    metalness: 0.1,
  });

  // 1. 主楼四角弧形收口 + 中央巨型中庭空腔环形体量 (Perimeter Ring with Rounded Corners & Central Hollow Void)
  const outerShape = new THREE.Shape();
  const ox = L_EW / 2; // 250
  const oz = W_NS / 2; // 200
  const r = CORNER_R;

  outerShape.moveTo(-ox + r, -oz);
  outerShape.lineTo(ox - r, -oz);
  outerShape.absarc(ox - r, -oz + r, r, -Math.PI / 2, 0, false);
  outerShape.lineTo(ox, oz - r);
  outerShape.absarc(ox - r, oz - r, r, 0, Math.PI / 2, false);
  outerShape.lineTo(-ox + r, oz);
  outerShape.absarc(-ox + r, oz - r, r, Math.PI / 2, Math.PI, false);
  outerShape.lineTo(-ox, -oz + r);
  outerShape.absarc(-ox + r, -oz + r, r, Math.PI, Math.PI * 1.5, false);

  // 内部中庭空腔（安置天堂岛海洋乐园水上乐园与室内海滩）
  const innerPath = new THREE.Path();
  const ix = ATRIUM_L / 2; // 115
  const iz = ATRIUM_W / 2; // 75
  const ir = 24;

  innerPath.moveTo(-ix + ir, -iz);
  innerPath.lineTo(ix - ir, -iz);
  innerPath.absarc(ix - ir, -iz + ir, ir, -Math.PI / 2, 0, false);
  innerPath.lineTo(ix, iz - ir);
  innerPath.absarc(ix - ir, iz - ir, ir, 0, Math.PI / 2, false);
  innerPath.lineTo(-ix + ir, iz);
  innerPath.absarc(-ix + ir, iz - ir, ir, Math.PI / 2, Math.PI, false);
  innerPath.lineTo(-ix, -iz + ir);
  innerPath.absarc(-ix + ir, -iz + ir, ir, Math.PI, Math.PI * 1.5, false);

  outerShape.holes.push(innerPath);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: BASE_H,
    bevelEnabled: false,
  };
  const bodyGeo = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
  bodyGeo.rotateX(-Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, wallMatDay);
  body.userData.isWall = true;
  group.add(body);

  // 2. 标志性海鸥展翅海浪起伏钢构曲面大屋顶 (Undulating Seagull Wave Roof, 65m ~ 103m)
  const roofCols = 64;
  const roofRows = 52;
  const roofW = L_EW + 24; // 524m 悬挑
  const roofD = W_NS + 24; // 424m 悬挑
  const roofGeo = new THREE.PlaneGeometry(roofW, roofD, roofCols, roofRows);
  roofGeo.rotateX(-Math.PI / 2);

  const getWaveY = (x: number, z: number): number => {
    const nz = z / (roofD / 2); // -1 (South) to 1 (North)
    const nx = x / (roofW / 2); // -1 (East, Tianfu Ave) to 1 (West, Yizhou Ave)

    // 南北向标志性「M 型海浪双波峰」(M-Wave Twin Crests)
    // 严密契合天府大道立面实景照片：
    // nz = 0（正中心大门/中庭上空）为下凹的波谷
    // nz = ±0.52（南北两翼）为高耸飞扬的海鸥展翅双波峰
    // nz = ±1.0（建筑尽端）平缓回落并在端部角点微翘
    const waveZ = -Math.cos(nz * Math.PI * 2.0) * 14.5 + Math.pow(Math.abs(nz), 4) * 4.5;

    // 东西向海鸥展翅中央拱顶跨度 (Central Barrel Vault Swoop)
    const swoopX = Math.cos(nx * Math.PI * 0.5) * 13.0;

    return BASE_H + 4 + waveZ + swoopX;
  };

  const posAttr = roofGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, getWaveY(x, z));
  }
  roofGeo.computeVertexNormals();

  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  group.add(roofMesh);

  // 3. 3D 流线型白色檐口多层复合波浪飘带轮廓 (4-Layer Aerodynamic Wave Fascia Ribbons)
  // 沿屋顶四周构造 4 道上下平行的三维立体波浪挑檐封边飘带
  const edgeStepsX = 36;
  const edgeStepsZ = 28;
  const hx = roofW / 2;
  const hz = roofD / 2;

  const baseLoopPoints: THREE.Vector3[] = [];
  // 北沿 (-hx to hx at z = hz)
  for (let s = 0; s <= edgeStepsX; s++) {
    const cx = -hx + (s / edgeStepsX) * roofW;
    const cz = hz;
    baseLoopPoints.push(new THREE.Vector3(cx, getWaveY(cx, cz), cz));
  }
  // 西沿 (hz to -hz at x = hx)
  for (let s = 1; s <= edgeStepsZ; s++) {
    const cx = hx;
    const cz = hz - (s / edgeStepsZ) * roofD;
    baseLoopPoints.push(new THREE.Vector3(cx, getWaveY(cx, cz), cz));
  }
  // 南沿 (hx to -hx at z = -hz)
  for (let s = 1; s <= edgeStepsX; s++) {
    const cx = hx - (s / edgeStepsX) * roofW;
    const cz = -hz;
    baseLoopPoints.push(new THREE.Vector3(cx, getWaveY(cx, cz), cz));
  }
  // 东沿 (-hz to hz at x = -hx)
  for (let s = 1; s < edgeStepsZ; s++) {
    const cx = -hx;
    const cz = -hz + (s / edgeStepsZ) * roofD;
    baseLoopPoints.push(new THREE.Vector3(cx, getWaveY(cx, cz), cz));
  }

  const fasciaOffsets = [-3.0, -1.0, 1.0, 3.0];
  for (let f = 0; f < fasciaOffsets.length; f++) {
    const dy = fasciaOffsets[f];
    const pts = baseLoopPoints.map((p) => new THREE.Vector3(p.x, p.y + dy, p.z));
    const path = new THREE.CatmullRomCurve3(pts, true);
    const tubeGeo = new THREE.TubeGeometry(path, 160, f === 0 || f === 3 ? 1.6 : 1.2, 8, true);
    const fascia = new THREE.Mesh(tubeGeo, fasciaMatDay);
    fascia.userData.isFascia = true;
    group.add(fascia);
  }

  // 4. 中央天堂岛海洋乐园无柱大跨度晶莹玻璃苍穹 (Paradise Island Transparent Glass Barrel-Vault Dome)
  const glassVaultMatDay = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.25,
    opacity: 0.82,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const glassVaultMatNight = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0.15,
    opacity: 0.88,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const domeGeo = new THREE.CylinderGeometry(75, 75, ATRIUM_L, 36, 16, true, 0, Math.PI);
  domeGeo.rotateZ(Math.PI / 2);
  domeGeo.scale(1.0, 0.45, 1.0); // 苍穹跨度 150m，拱高 33.75m，顶点达 112m
  domeGeo.translate(0, BASE_H + 6, 0);

  const glassVault = new THREE.Mesh(domeGeo, glassVaultMatDay);
  glassVault.userData.isVault = true;
  group.add(glassVault);

  // 玻璃苍穹两端封闭拱山花玻璃 (End Cap Tympanums)
  const tympanumShape = new THREE.Shape();
  tympanumShape.moveTo(-75, 0);
  tympanumShape.absarc(0, 0, 75, Math.PI, 0, false);
  tympanumShape.lineTo(-75, 0);
  const tympanumGeo = new THREE.ShapeGeometry(tympanumShape);
  tympanumGeo.scale(1.0, 0.45, 1.0);

  for (const side of [-1, 1]) {
    const tympanum = new THREE.Mesh(tympanumGeo, glassVaultMatDay);
    tympanum.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
    tympanum.position.set(side * (ATRIUM_L / 2), BASE_H + 6, 0);
    tympanum.userData.isVault = true;
    group.add(tympanum);
  }

  // 空间钢网架拱肋与纵梁桁架 (White Steel Space-Frame Arches & Purlins)
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.1,
  });

  const ribXs = [-95, -70, -45, -20, 0, 20, 45, 70, 95];
  ribXs.forEach((rx) => {
    const ribGeo = new THREE.CylinderGeometry(75.5, 75.5, 1.4, 36, 1, true, 0, Math.PI);
    ribGeo.rotateZ(Math.PI / 2);
    ribGeo.scale(1.0, 0.455, 1.0);
    ribGeo.translate(rx, BASE_H + 6, 0);
    group.add(new THREE.Mesh(ribGeo, steelMat));
  });

  // 顶脊与两侧主要纵向主梁桁架 (Longitudinal Truss Beams)
  for (const angle of [Math.PI * 0.5, Math.PI * 0.25, Math.PI * 0.75]) {
    const zOffset = Math.cos(angle) * 75.5;
    const yOffset = Math.sin(angle) * 75.5 * 0.455;
    const purlin = new THREE.Mesh(new THREE.BoxGeometry(ATRIUM_L, 0.9, 0.9), steelMat);
    purlin.position.set(0, BASE_H + 6 + yOffset, zOffset);
    group.add(purlin);
  }

  // 5. 室内天堂岛海洋乐园水上造浪池与黄金沙滩 (Indoor Ocean Wave Pool & Beach)
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.2,
  });
  const pool = new THREE.Mesh(new THREE.BoxGeometry(160, 1.5, 75), poolMat);
  pool.position.set(0, 0.8, -15);
  group.add(pool);

  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.95,
    metalness: 0.05,
  });
  const beach = new THREE.Mesh(new THREE.BoxGeometry(180, 1.2, 35), beachMat);
  beach.position.set(0, 0.6, 32);
  group.add(beach);

  // 室内巨型环幕 LED 屏幕 (Giant Indoor Ocean LED Screen)
  const screenMatDay = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.35,
    metalness: 0.1,
  });
  const screenMatNight = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 1.2,
    roughness: 0.25,
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(150, 20, 2), screenMatDay);
  screen.position.set(0, 10, -50);
  screen.userData.isScreen = true;
  group.add(screen);

  // 中庭内圈洲际酒店向海客房退台露台 (Terraced Hotel Balconies)
  const balconyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  for (const by of [14, 26, 38, 50, 62]) {
    for (const side of [-1, 1]) {
      const bTier = new THREE.Mesh(new THREE.BoxGeometry(ATRIUM_L, 1.2, 4), balconyMat);
      bTier.position.set(0, by, side * (ATRIUM_W / 2 - 2));
      group.add(bTier);

      const bTierEW = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, ATRIUM_W), balconyMat);
      bTierEW.position.set(side * (ATRIUM_L / 2 - 2), by, 0);
      group.add(bTierEW);
    }
  }

  // 6. 东面天府大道主入口：标志性放射状巨型拱形玻璃门厅 (Tianfu Avenue Grand Sunburst Arch Canopy)
  // 位于 X = -250 (东侧面向天府大道与锦城广场)，正好对应 M 型波浪的中央谷底，拱高 28m，跨度 80m
  const archCanopyGroup = new THREE.Group();
  archCanopyGroup.position.set(-250, 0, 0);

  const archSpanR = 40; // 半径 40m，跨度 80m
  const archDepth = 35; // 向天府大道悬挑 35m

  // 拱顶透光玻璃穹顶
  const archShellGeo = new THREE.CylinderGeometry(archSpanR, archSpanR, archDepth, 32, 8, true, 0, Math.PI);
  archShellGeo.rotateZ(Math.PI / 2);
  archShellGeo.rotateY(Math.PI / 2);
  archShellGeo.scale(1.0, 0.72, 1.0); // 拱高约 28.8m
  archShellGeo.translate(-archDepth / 2, 0, 0);

  const eastCanopyMatDay = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.25,
    opacity: 0.85,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const eastCanopyMatNight = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 1.4,
    roughness: 0.25,
    opacity: 0.92,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const archShellMesh = new THREE.Mesh(archShellGeo, eastCanopyMatDay);
  archShellMesh.userData.isCanopy = true;
  archCanopyGroup.add(archShellMesh);

  // 同心同轴放射状钢桁架拱圈与立面阳光散射肋 (Concentric Sunburst Ribs)
  for (let r = 10; r <= archSpanR; r += 10) {
    const ringGeo = new THREE.TorusGeometry(r, 0.65, 6, 24, Math.PI);
    ringGeo.rotateY(Math.PI / 2);
    ringGeo.scale(1.0, 0.72, 1.0);
    ringGeo.translate(-archDepth, 0, 0);
    archCanopyGroup.add(new THREE.Mesh(ringGeo, steelMat));
  }
  // 纵向主肋条
  for (let a = 0; a <= Math.PI; a += Math.PI / 6) {
    const ribZ = Math.cos(a) * archSpanR;
    const ribY = Math.sin(a) * archSpanR * 0.72;
    const longRib = new THREE.Mesh(new THREE.BoxGeometry(archDepth, 0.75, 0.75), steelMat);
    longRib.position.set(-archDepth / 2, ribY, ribZ);
    archCanopyGroup.add(longRib);
  }

  // 门厅支撑白色斜向钢立柱
  for (const zc of [-36, -18, 18, 36]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.2, 24, 12), steelMat);
    col.position.set(-archDepth - 2, 12, zc);
    col.rotation.z = 0.08;
    archCanopyGroup.add(col);
  }

  group.add(archCanopyGroup);

  // 东侧天府大道迎宾前广场微地景与喷泉水系 (Tianfu Avenue Arrival Plaza)
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const eastPlaza = new THREE.Mesh(new THREE.BoxGeometry(45, 0.8, 260), plazaMat);
  eastPlaza.position.set(-272, 0.4, 0);
  group.add(eastPlaza);

  const eastFountainMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.6 });
  for (const fz of [-65, 0, 65]) {
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 1.2, 24), eastFountainMat);
    fountain.position.set(-272, 0.9, fz);
    group.add(fountain);
  }

  // 7. 南侧锦城湖/绕城高速迎宾门厅 (South Lake & Highway Portal)
  // 位于 Z = -200 (面向锦城湖)，半圆弧形落地玻璃大堂
  const southPortalGeo = new THREE.CylinderGeometry(42, 42, 22, 24, 1, true, -Math.PI * 0.5, Math.PI);
  const southPortal = new THREE.Mesh(southPortalGeo, eastCanopyMatDay);
  southPortal.position.set(0, 11, -200);
  southPortal.userData.isCanopy = true;
  group.add(southPortal);

  // 8. 昼夜模式切换 (Dynamic Architectural Lighting System)
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.userData?.isWall) {
        mesh.material = night ? wallMatNight : wallMatDay;
      }
      if (mesh.userData?.isVault) {
        mesh.material = night ? glassVaultMatNight : glassVaultMatDay;
      }
      if (mesh.userData?.isFascia) {
        mesh.material = night ? fasciaMatNight : fasciaMatDay;
      }
      if (mesh.userData?.isCanopy) {
        mesh.material = night ? eastCanopyMatNight : eastCanopyMatDay;
      }
      if (mesh.userData?.isScreen) {
        mesh.material = night ? screenMatNight : screenMatDay;
      }
    });
  };

  return group;
}

// --- 15. 港珠澳大桥 · 东人工岛与香港接线高架桥 (HZMB) 真实场景重构 ---
