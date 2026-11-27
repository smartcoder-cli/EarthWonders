import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import { box, cyl } from "./_shared";

/** 合批矩形结构几何累加器（用于内壁 3D 深凹窗格肋网与顶棚井字梁，减少 Draw Call 并保留锐利轮廓） */
class BoxBatchAccumulator {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];

  private static readonly UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
  private static readonly V = new THREE.Vector3();
  private static readonly N = new THREE.Vector3();
  private static readonly UP = new THREE.Vector3(0, 1, 0);
  private static readonly M = new THREE.Matrix4();
  private static readonly Q = new THREE.Quaternion();
  private static readonly S = new THREE.Vector3(1, 1, 1);
  private static readonly DIR = new THREE.Vector3();
  private static readonly MID = new THREE.Vector3();
  private static readonly NM = new THREE.Matrix3();

  addBoxMatrix(matrix: THREE.Matrix4, sx: number, sy: number, sz: number) {
    const base = BoxBatchAccumulator.UNIT_BOX;
    const posAttr = base.getAttribute("position") as THREE.BufferAttribute;
    const normAttr = base.getAttribute("normal") as THREE.BufferAttribute;
    const uvAttr = base.getAttribute("uv") as THREE.BufferAttribute;
    const idxAttr = base.getIndex()!;

    const offset = this.positions.length / 3;
    const v = BoxBatchAccumulator.V;
    const n = BoxBatchAccumulator.N;
    const nm = BoxBatchAccumulator.NM.getNormalMatrix(matrix);

    for (let i = 0; i < posAttr.count; i++) {
      v.set(posAttr.getX(i) * sx, posAttr.getY(i) * sy, posAttr.getZ(i) * sz).applyMatrix4(matrix);
      this.positions.push(v.x, v.y, v.z);

      n.set(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i)).applyMatrix3(nm).normalize();
      this.normals.push(n.x, n.y, n.z);

      this.uvs.push(uvAttr.getX(i), uvAttr.getY(i));
    }

    for (let i = 0; i < idxAttr.count; i++) {
      this.indices.push(offset + idxAttr.getX(i));
    }
  }

  addBox(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) {
    const m = BoxBatchAccumulator.M.compose(
      new THREE.Vector3(cx, cy, cz),
      BoxBatchAccumulator.Q.identity(),
      BoxBatchAccumulator.S,
    );
    this.addBoxMatrix(m, sx, sy, sz);
  }

  addStrut(a: THREE.Vector3, b: THREE.Vector3, w: number, d = w) {
    const dir = BoxBatchAccumulator.DIR.subVectors(b, a);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.multiplyScalar(1 / len);
    const mid = BoxBatchAccumulator.MID.addVectors(a, b).multiplyScalar(0.5);
    const q = BoxBatchAccumulator.Q.setFromUnitVectors(BoxBatchAccumulator.UP, dir);
    const m = BoxBatchAccumulator.M.compose(mid, q, BoxBatchAccumulator.S);
    this.addBoxMatrix(m, w, len, d);
  }

  toMesh(material: THREE.Material): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(this.normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    geo.setIndex(this.indices);
    return new THREE.Mesh(geo, material);
  }
}

function makeGrandeArcheWindowTexture(
  isNight: boolean,
  floors: number = 17,
  cols: number = 20,
  dayTint: string = "#9db3c6",
  dayHighlight: string = "#b8cada",
): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  // 日间内壁与侧立面玻璃采用明亮银蓝浅灰，贴合实景日照漫反射质感
  g.fillStyle = isNight ? "#121a29" : dayTint;
  g.fillRect(0, 0, w, h);

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
          g.fillRect(x + 2.2, y + 2.2, colW - 4.4, floorH - 4.4);
        } else {
          g.fillStyle = "#1e293b";
          g.fillRect(x + 2.2, y + 2.2, colW - 4.4, floorH - 4.4);
        }
      } else {
        g.fillStyle = (f + col) % 5 === 0 ? dayHighlight : dayTint;
        g.fillRect(x + 2.0, y + 2.0, colW - 4.0, floorH - 4.0);
        g.strokeStyle = "#cbd5e1";
        g.lineWidth = 1.2;
        g.strokeRect(x + 1.0, y + 1.0, colW - 2.0, floorH - 2.0);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

function makeCarraraMarbleTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = "#f7f8fa";
  g.fillRect(0, 0, w, h);

  g.strokeStyle = "rgba(203, 213, 225, 0.35)";
  g.lineWidth = 3.0;
  g.beginPath();
  g.moveTo(0, 180);
  g.bezierCurveTo(320, 240, 580, 110, 1024, 380);
  g.stroke();

  g.beginPath();
  g.moveTo(0, 680);
  g.bezierCurveTo(420, 520, 710, 890, 1024, 750);
  g.stroke();

  // 标志性卡拉拉白大理石方格预制板缝
  const panels = 16;
  const step = w / panels;
  g.strokeStyle = "rgba(148, 163, 184, 0.42)";
  g.lineWidth = 1.6;
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

// 45° 倒角巨门几何体（门框两侧斜坡直抵前庭地面 y = baseY，不再悬空支架）
function createChamferPortalGeometry(
  voidW: number = 70.0,
  innerTopY: number = 88.0,
  outerW: number = 105.0,
  outerTopY: number = 109.4,
  baseY: number = 2.0,
  bevelD: number = 15.0,
  isRear: boolean = false,
): THREE.BufferGeometry {
  const halfW = voidW / 2;
  const outerHalfW = outerW / 2;

  const zOuter = isRear ? -56.0 : 56.0;
  const zInner = isRear ? (-56.0 + bevelD) : (56.0 - bevelD);

  const vertices = [
    -outerHalfW, baseY, zOuter,     // 0: Left-bottom outer (grounded!)
    -halfW, baseY, zInner,          // 1: Left-bottom inner
    -outerHalfW, innerTopY, zOuter, // 2: Left-junction outer
    -halfW, innerTopY, zInner,      // 3: Left-junction inner
    -outerHalfW, outerTopY, zOuter, // 4: Left-top miter outer
    -halfW, outerTopY, zOuter,      // 5: Top-left outer
    +halfW, outerTopY, zOuter,      // 6: Top-right outer
    +outerHalfW, outerTopY, zOuter, // 7: Right-top miter outer
    +halfW, innerTopY, zInner,      // 8: Right-junction inner
    +outerHalfW, innerTopY, zOuter, // 9: Right-junction outer
    +halfW, baseY, zInner,          // 10: Right-bottom inner
    +outerHalfW, baseY, zOuter,     // 11: Right-bottom outer (grounded!)
  ];

  const indices = !isRear
    ? [
        0, 1, 3,  0, 3, 2,
        2, 3, 4,
        4, 3, 5,
        5, 3, 8,  5, 8, 6,
        6, 8, 7,
        7, 8, 9,
        8, 10, 11,  8, 11, 9,
      ]
    : [
        0, 3, 1,  0, 2, 3,
        2, 4, 3,
        4, 5, 3,
        5, 8, 3,  5, 6, 8,
        6, 7, 8,
        7, 9, 8,
        8, 11, 10,  8, 9, 11,
      ];

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

function makeCloudCanopyTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  // 特氟龙涂层玻璃纤维白膜底色
  g.fillStyle = "#f9fafb";
  g.fillRect(0, 0, w, h);

  const cols = 8;
  const rows = 4;
  const cw = w / cols;
  const ch = h / rows;

  // 实景标志性菱形交叉接缝与索网筋线
  g.strokeStyle = "rgba(100, 116, 139, 0.42)";
  g.lineWidth = 2.0;
  for (let i = 0; i <= cols; i++) {
    g.beginPath();
    g.moveTo(i * cw, 0);
    g.lineTo(i * cw, h);
    g.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    g.beginPath();
    g.moveTo(0, j * ch);
    g.lineTo(w, j * ch);
    g.stroke();
  }
  g.strokeStyle = "rgba(148, 163, 184, 0.35)";
  g.lineWidth = 1.4;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x0 = i * cw;
      const y0 = j * ch;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x0 + cw, y0 + ch);
      g.moveTo(x0 + cw, y0);
      g.lineTo(x0, y0 + ch);
      g.stroke();

      // 帆面圆孔透光环纹（对应内部俯视照片上的阵列圆环孔位）
      const cx = x0 + cw * 0.5;
      const cy = y0 + ch * 0.5;
      const r = Math.min(cw, ch) * 0.16;
      g.fillStyle = "rgba(203, 213, 225, 0.48)";
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(100, 116, 139, 0.5)";
      g.lineWidth = 1.6;
      g.stroke();
      g.strokeStyle = "rgba(148, 163, 184, 0.35)";
      g.lineWidth = 1.4;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * 构建实景双翼式「云朵」张拉膜单翼几何体 (Two-Sheet Sculpted Canopy Wing for Les Nuages)
 * 仅由前后（东西向）两大块双曲对称白膜组成：中央留出标志性叶形开缝俯瞰入口大厅，
 * 内沿高昂提拉至中央与侧翼索点，外沿以四连弧扇形向广场舒展垂落。
 */
function createWingCanopyGeometry(
  zSign: 1 | -1,
  halfSpanX: number = 30.5,
  subdivsX: number = 36,
  subdivsZ: number = 18,
): { geometry: THREE.BufferGeometry; peakLeft: THREE.Vector3; peakRight: THREE.Vector3; outerLeft: THREE.Vector3; outerRight: THREE.Vector3 } {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function evalWing(u: number, v: number): THREE.Vector3 {
    // u in [-1, 1] 沿南北宽度分布，v in [0, 1] 由中央开缝(v=0)向外缘(v=1)展开
    const absU = Math.abs(u);
    const x = u * halfSpanX * (0.94 + 0.06 * v);

    // 内侧边缘 zInner(u)：中心 u=0 处对称张开 ±9.5m 叶形天井，u≈±0.26 处收尖成双主峰，外翼微掠
    const diamondEye = 8.2 * Math.exp(-Math.pow(u / 0.24, 2));
    const flankSweep = 5.2 * Math.pow(absU, 2.0);
    const zInner = 1.4 + diamondEye + flankSweep;

    // 外侧边缘 zOuter(u)：沿横跨方向呈 4 连张拉扇贝凹弧
    const scallop = Math.abs(Math.sin(u * Math.PI * 2.0));
    const zOuter = 27.5 - 3.6 * scallop - 2.4 * absU * absU;

    const absZ = zInner + v * (zOuter - zInner);
    const z = zSign * absZ;

    // 紧绷斜拉折翼轮廓：由两侧外墙 (y≈18.5m) 以 ~25°–32° 利落倾角斜拉攀升至中央尖峰 (y≈31m)
    const centralPeakFocus = Math.exp(-Math.pow((absU - 0.18) / 0.36, 2));
    const linearSlope = (1 - 0.72 * absU) * 11.2 + centralPeakFocus * 2.4;
    const radialTaut = Math.pow(1 - v, 0.85);
    const edgeScallopDip = 1.6 * Math.sin(u * Math.PI * 2.0) * Math.sin(u * Math.PI * 2.0) * v;
    const cornerTieLift = 3.2 * Math.pow(absU, 2.8) * v;
    const y = 18.2 + linearSlope * radialTaut - edgeScallopDip + cornerTieLift;

    return new THREE.Vector3(x, y, z);
  }

  for (let iv = 0; iv <= subdivsZ; iv++) {
    const v = iv / subdivsZ;
    for (let iu = 0; iu <= subdivsX; iu++) {
      const u = (iu / subdivsX) * 2 - 1;
      const p = evalWing(u, v);
      positions.push(p.x, p.y, p.z);
      uvs.push(iu / subdivsX, v);
    }
  }

  const stride = subdivsX + 1;
  for (let iv = 0; iv < subdivsZ; iv++) {
    for (let iu = 0; iu < subdivsX; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      if (zSign > 0) {
        indices.push(a, c, b, b, c, d);
      } else {
        indices.push(a, b, c, b, d, c);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return {
    geometry,
    peakLeft: evalWing(-0.28, 0),
    peakRight: evalWing(0.28, 0),
    outerLeft: evalWing(-1, 1),
    outerRight: evalWing(1, 1),
  };
}

export function createGrandeArche(kit: SurfaceKit) {
  const root = new THREE.Group();
  root.name = "GrandeArche";

  const marbleTex = makeCarraraMarbleTexture();
  const marbleWhite = new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xfafbfc,
    roughness: 0.28,
    metalness: 0.04,
  });
  const marbleBevel = new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xf3f6fa,
    roughness: 0.30,
    metalness: 0.05,
  });
  // 内壁深凹格子构件与顶棚井字梁采用明亮浅灰白混凝土，不再暗沉发黑
  const cofferConcrete = new THREE.MeshStandardMaterial({
    color: 0xe2e7ee,
    roughness: 0.55,
    metalness: 0.06,
  });
  const roofStoneMat = new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xe6ebf2,
    roughness: 0.45,
    metalness: 0.04,
  });
  const bambooDeckMat = new THREE.MeshStandardMaterial({
    color: 0xc4ad8e,
    roughness: 0.72,
    metalness: 0.03,
  });

  const winDayTex = makeGrandeArcheWindowTexture(false);
  const winNightTex = makeGrandeArcheWindowTexture(true);

  const glassDay = new THREE.MeshStandardMaterial({
    map: winDayTex,
    color: 0xeef6fc,
    roughness: 0.22,
    metalness: 0.34,
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
    color: 0x64748b,
    roughness: 0.38,
    metalness: 0.85,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.92,
  });
  const roofGlassMat = new THREE.MeshStandardMaterial({
    color: 0x9ec5e6,
    roughness: 0.15,
    metalness: 0.45,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });
  const podGlassDay = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.15,
    opacity: 0.78,
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

  const cloudTex = makeCloudCanopyTexture();
  const cloudMatDay = new THREE.MeshStandardMaterial({
    map: cloudTex,
    color: 0xffffff,
    roughness: 0.34,
    metalness: 0.03,
    opacity: 0.96,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const cloudMatNight = new THREE.MeshStandardMaterial({
    map: cloudTex,
    color: 0xbae6fd,
    roughness: 0.30,
    metalness: 0.06,
    opacity: 0.96,
    transparent: true,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    side: THREE.DoubleSide,
  });

  const parvisPaving = mapped(kit.colosseum, { color: 0xcfd5dd, roughness: 0.85, metersPerTile: 10 });
  const stepsMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.44 });

  // 1. 底层广场平台 (Le Parvis de la Défense, y = 0 ~ 2m)
  const parvis = new THREE.Mesh(new THREE.BoxGeometry(220, 2.0, 250), parvisPaving);
  parvis.position.set(0, 1.0, 0);
  parvis.userData.skipLines = true;
  root.add(parvis);

  // 历史轴线中轴线淡白引导铺装 (Axe Historique Axis Runner)
  box(root, stepsMat, 16.0, 0.16, 250.0, 0, 2.0, 0);

  // 2. 核心超立方体巨构 (Arche Cube Superstructure，主体实体直落广场地面 y = 2.0m)
  const archCore = new THREE.Group();
  archCore.name = "ArcheCubeSuperstructure";
  root.add(archCore);

  // A. 南北两侧实体塔楼核心与四维超立方体实墙边翼 (y = 2.0 ~ 110.9m)
  // 侧面全跨采用极窄 2.8m 白石外框，内部留出 106.4m × 103.5m 全玻璃 5×5 巨构格网外立面
  for (const wallSide of [-1, 1]) {
    // 两侧外墙极窄白石边框（前缘/后缘竖柱 Z=±53.2..±56m + 顶部横梁 Y=108.1..110.9m + 底部台槛 Y=2.0..4.6m）
    for (const zSign of [-1, 1]) {
      const edgePier = box(archCore, marbleWhite, 1.5, 108.9, 2.8, wallSide * 53.25, 2.0, zSign * 54.6);
      edgePier.userData.keepUv = true;
    }
    const topFrame = box(archCore, marbleWhite, 1.5, 2.8, 106.4, wallSide * 53.25, 108.1, 0);
    topFrame.userData.keepUv = true;
    const botFrame = box(archCore, marbleWhite, 1.5, 2.6, 106.4, wallSide * 53.25, 2.0, 0);
    botFrame.userData.keepUv = true;

    // 紧贴玻璃幕墙后方的白石垫衬板 (X = ±52.5..±53.35m，严格位于 45° 斜切门框外侧，绝不穿透斜面)
    const sideBacking = box(archCore, marbleWhite, 0.85, 103.5, 106.4, wallSide * 52.925, 4.6, 0);
    sideBacking.userData.keepUv = true;
  }
  // 塔楼主办公内芯 (X = ±35..±52.5m, Z = -41..+41m)
  const southInner = box(archCore, marbleWhite, 17.5, 86.0, 82.0, -43.75, 2.0, 0);
  southInner.userData.keepUv = true;
  const northInner = box(archCore, marbleWhite, 17.5, 86.0, 82.0, +43.75, 2.0, 0);
  northInner.userData.keepUv = true;

  // B. 顶层天桥跨梁实体箱体 (y = 88m ~ 110.9m)
  const roofUpper = box(archCore, marbleWhite, 108.0, 1.6, 112.0, 0, 109.3, 0);
  roofUpper.userData.keepUv = true;
  const roofLower = box(archCore, marbleWhite, 70.0, 21.3, 82.0, 0, 88.0, 0);
  roofLower.userData.keepUv = true;
  const roofFlankL = box(archCore, marbleWhite, 17.5, 21.3, 82.0, -43.75, 88.0, 0);
  roofFlankL.userData.keepUv = true;
  const roofFlankR = box(archCore, marbleWhite, 17.5, 21.3, 82.0, +43.75, 88.0, 0);
  roofFlankR.userData.keepUv = true;

  // C. 45° 标志性直切巨门倒角 (两侧斜壁直抵地面 y = 2.0m，纯净纯白棱线，无黑色外边条)
  const frontChamfer = new THREE.Mesh(
    createChamferPortalGeometry(70.0, 88.0, 105.0, 109.4, 2.0, 15.0, false),
    marbleBevel,
  );
  frontChamfer.userData.keepUv = true;
  archCore.add(frontChamfer);

  const rearChamfer = new THREE.Mesh(
    createChamferPortalGeometry(70.0, 88.0, 105.0, 109.4, 2.0, 15.0, true),
    marbleBevel,
  );
  rearChamfer.userData.keepUv = true;
  archCore.add(rearChamfer);

  // D. 门洞内壁 3D 深凹方格孔洞幕墙（实景浅灰白预制格构肋 + 浅银蓝退台玻璃，全面提亮告别死黑！）
  const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 74.0, 82.0), glassDay);
  leftGlass.position.set(-34.85, 51.0, 0);
  leftGlass.userData.isOfficeGlass = true;
  leftGlass.userData.keepUv = true;
  archCore.add(leftGlass);

  const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 74.0, 82.0), glassDay);
  rightGlass.position.set(+34.85, 51.0, 0);
  rightGlass.userData.isOfficeGlass = true;
  rightGlass.userData.keepUv = true;
  archCore.add(rightGlass);

  // 构建真实进深 1.25m 的立体预制方格孔洞网格 (17 层 × 19 跨深凹方块格构)
  const cofferAcc = new BoxBatchAccumulator();
  const rowsY = 17;
  const colsZ = 20;
  const wallMinY = 14.0;
  const wallH = 74.0;
  const wallD = 82.0;
  const cofferDepth = 1.25;

  for (const wallSide of [-1, 1]) {
    const cx = wallSide * (35.0 - cofferDepth / 2);
    // 水平通长窗台梁（突入中庭形成深凹孔洞光影）
    for (let r = 0; r <= rowsY; r++) {
      const fy = wallMinY + (r / rowsY) * wallH;
      cofferAcc.addBox(cx, fy, 0, cofferDepth, 0.72, wallD);
    }
    // 竖向网格立柱（每隔 4.3m 分隔一个方形退台孔洞单元）
    for (let c = 0; c <= colsZ; c++) {
      const fz = -wallD / 2 + (c / colsZ) * wallD;
      cofferAcc.addBox(cx, wallMinY + wallH / 2, fz, cofferDepth, wallH, 0.72);
    }
  }

  // E. 拱洞顶棚明快浅灰白立体井字方格天花 (Light-Grey Coffered Ceiling at y = 87.2 ~ 88.0m)
  const ceilingPlate = box(archCore, cofferConcrete, 70.0, 0.45, 82.0, 0, 87.55, 0);
  ceilingPlate.userData.skipLines = true;
  for (let rx = -4; rx <= 4; rx++) {
    cofferAcc.addBox((rx / 4) * 34.5, 87.15, 0, 0.65, 0.85, 81.8);
  }
  for (let rz = -5; rz <= 5; rz++) {
    cofferAcc.addBox(0, 87.15, (rz / 5) * 40.5, 69.8, 0.85, 0.65);
  }

  const cofferGridMesh = cofferAcc.toMesh(cofferConcrete);
  archCore.add(cofferGridMesh);

  // F. 左右两侧全跨 5×5 白石巨构框格玻璃幕墙 (Full-Span 5×5 Lateral Curtain Wall matching real aerial view)
  // 实景南北侧立面几乎整面覆盖天空反光玻璃（106.4m × 103.5m），被粗壮白石 5×5 巨构方格均分，仅外周保留 ~2.8m 白石边框
  const extWinDayTex = makeGrandeArcheWindowTexture(false, 15, 15, "#879eb5", "#a8bdd1");
  const extWinNightTex = makeGrandeArcheWindowTexture(true, 15, 15);
  const exteriorWinDay = new THREE.MeshStandardMaterial({
    map: extWinDayTex,
    color: 0xdbeafe,
    roughness: 0.16,
    metalness: 0.45,
  });
  const exteriorWinNight = new THREE.MeshStandardMaterial({
    map: extWinNightTex,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.2,
    emissiveMap: extWinNightTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.90,
  });
  const exteriorWindows: THREE.Mesh[] = [];
  const megaGridAcc = new BoxBatchAccumulator();
  const fineMullionAcc = new BoxBatchAccumulator();

  const extMinY = 4.6;
  const extH = 103.5; // up to 108.1m
  const extSpanZ = 106.4; // -53.2 ~ +53.2m
  const megaCount = 5;
  const subPerMega = 3;

  for (const wallSide of [-1, 1]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.4, extH, extSpanZ), exteriorWinDay);
    sideGlass.position.set(wallSide * 53.55, extMinY + extH / 2, 0);
    sideGlass.userData.keepUv = true;
    archCore.add(sideGlass);
    exteriorWindows.push(sideGlass);

    // 5×5 粗壮纯白卡拉拉大理石主网格框 (内分隔 4 道竖肋 + 4 道横肋)
    for (let i = 1; i < megaCount; i++) {
      const fy = extMinY + (i / megaCount) * extH;
      const fz = -extSpanZ / 2 + (i / megaCount) * extSpanZ;
      megaGridAcc.addBox(wallSide * 53.88, fy, 0, 0.55, 1.35, extSpanZ);
      megaGridAcc.addBox(wallSide * 53.88, extMinY + extH / 2, fz, 0.55, extH, 1.35);
    }

    // 每个巨构方格内部细分 3×3 纤细铝框窗格 (skipLines 避免远景黑线糊成一团)
    const totalSub = megaCount * subPerMega;
    for (let j = 1; j < totalSub; j++) {
      if (j % subPerMega === 0) continue;
      const fy = extMinY + (j / totalSub) * extH;
      const fz = -extSpanZ / 2 + (j / totalSub) * extSpanZ;
      fineMullionAcc.addBox(wallSide * 53.76, fy, 0, 0.3, 0.34, extSpanZ);
      fineMullionAcc.addBox(wallSide * 53.76, extMinY + extH / 2, fz, 0.3, extH, 0.34);
    }
  }
  archCore.add(megaGridAcc.toMesh(marbleWhite));
  const fineMullionMesh = fineMullionAcc.toMesh(cofferConcrete);
  fineMullionMesh.userData.skipLines = true;
  archCore.add(fineMullionMesh);

  // 纯白大理石外角嵌线饰条
  for (const ex of [-54.0, +54.0]) {
    for (const ez of [-56.0, +56.0]) {
      box(archCore, marbleBevel, 0.45, 108.9, 0.45, ex, 2.0, ez);
    }
  }
  box(archCore, marbleBevel, 108.0, 0.5, 0.5, 0, 110.65, 56.0);
  box(archCore, marbleBevel, 108.0, 0.5, 0.5, 0, 110.65, -56.0);

  // 3. 悬挂式特氟龙「云朵」双翼对称张拉膜 (Les Nuages - Just Two Sculpted Wing Canopies)
  // 对照内部实景照片：仅两张大幅飞翼白膜，中央留出叶形采光缝隙，配合少量干净利落的主承力钢索
  const cloudGroup = new THREE.Group();
  cloudGroup.name = "LesNuagesCanopy";

  const cableAcc = new BoxBatchAccumulator();
  for (const zSign of [1, -1] as const) {
    const wing = createWingCanopyGeometry(zSign, 30.5, 36, 18);
    const sailMesh = new THREE.Mesh(wing.geometry, cloudMatDay);
    sailMesh.userData.isCloud = true;
    sailMesh.userData.keepUv = true;
    sailMesh.userData.skipLines = true;
    cloudGroup.add(sailMesh);

    // 仅保留简洁干净的高空斜拉主钢索（每张白膜 4 根主悬索 + 中央对拉索，彻底告别乱线）
    cableAcc.addStrut(wing.peakLeft, new THREE.Vector3(-34.2, 56.0, zSign * 14.0), 0.11);
    cableAcc.addStrut(wing.peakRight, new THREE.Vector3(+34.2, 56.0, zSign * 14.0), 0.11);
    cableAcc.addStrut(wing.outerLeft, new THREE.Vector3(-34.2, 34.0, zSign * 30.0), 0.11);
    cableAcc.addStrut(wing.outerRight, new THREE.Vector3(+34.2, 34.0, zSign * 30.0), 0.11);
  }
  const cableMesh = cableAcc.toMesh(steelMat);
  cableMesh.userData.skipLines = true;
  cloudGroup.add(cableMesh);
  archCore.add(cloudGroup);

  // 4. 偏置独立全景玻璃电梯井（位于 x = -17.0m, z = 0m，穿行于两张帆膜中央采光缝隙旁并锚固左侧内壁）
  const elevX = -17.0;
  const elevZ = 0.0;
  const elevatorGroup = new THREE.Group();
  elevatorGroup.position.set(elevX, 0, elevZ);

  const elevAcc = new BoxBatchAccumulator();
  for (const ex of [-1.45, 1.45]) {
    for (const ez of [-1.45, 1.45]) {
      elevAcc.addStrut(new THREE.Vector3(ex, 14.0, ez), new THREE.Vector3(ex, 88.2, ez), 0.18);
    }
  }
  for (let ey = 14.0; ey < 88.0; ey += 4.2) {
    const ey2 = Math.min(88.0, ey + 4.2);
    elevAcc.addBox(0, ey, -1.45, 2.95, 0.12, 0.12);
    elevAcc.addBox(0, ey, 1.45, 2.95, 0.12, 0.12);
    elevAcc.addBox(-1.45, ey, 0, 0.12, 0.12, 2.95);
    elevAcc.addBox(1.45, ey, 0, 0.12, 0.12, 2.95);

    elevAcc.addStrut(new THREE.Vector3(-1.45, ey, 1.45), new THREE.Vector3(1.45, ey2, 1.45), 0.08);
    elevAcc.addStrut(new THREE.Vector3(1.45, ey, 1.45), new THREE.Vector3(-1.45, ey2, 1.45), 0.08);
    elevAcc.addStrut(new THREE.Vector3(-1.45, ey, -1.45), new THREE.Vector3(1.45, ey2, -1.45), 0.08);
    elevAcc.addStrut(new THREE.Vector3(1.45, ey, -1.45), new THREE.Vector3(-1.45, ey2, -1.45), 0.08);
  }

  // 水平稳固三角钢臂：锚固左侧内壁 (x = -34.2m)
  const wallDeltaX = -34.2 - elevX; // -17.2m
  for (const braceY of [30.0, 48.0, 66.0]) {
    elevAcc.addStrut(new THREE.Vector3(-1.45, braceY, 1.2), new THREE.Vector3(wallDeltaX, braceY, 3.2), 0.12);
    elevAcc.addStrut(new THREE.Vector3(-1.45, braceY, -1.2), new THREE.Vector3(wallDeltaX, braceY, -3.2), 0.12);
  }
  const elevMesh = elevAcc.toMesh(steelMat);
  elevMesh.userData.skipLines = true;
  elevatorGroup.add(elevMesh);

  // 双透明全景圆柱观光轿厢
  const podMeshes: THREE.Mesh[] = [];
  const elevatorLights: THREE.PointLight[] = [];
  for (const py of [38.0, 68.0]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 4.4, 16), podGlassDay);
    pod.position.set(0, py + 2.2, 0);
    pod.userData.keepUv = true;
    elevatorGroup.add(pod);
    podMeshes.push(pod);

    cyl(elevatorGroup, chromeMat, 1.82, 1.82, 0.35, 0, py, 0, 16);
    cyl(elevatorGroup, chromeMat, 1.82, 1.82, 0.35, 0, py + 4.2, 0, 16);

    const pLight = new THREE.PointLight(0xfef08a, 0, 18, 1.6);
    pLight.position.set(0, py + 2.2, 0);
    elevatorGroup.add(pLight);
    elevatorLights.push(pLight);
  }

  // 底层候梯透明圆形玻璃门厅（贴合实景大台阶顶部玻璃圆亭，顶盖改为明亮玻璃天窗）
  const lobbyPavilion = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 4.0, 20), roofGlassMat);
  lobbyPavilion.position.set(0, 16.0, 0);
  elevatorGroup.add(lobbyPavilion);
  cyl(elevatorGroup, marbleBevel, 5.4, 5.4, 0.35, 0, 18.0, 0, 20);
  archCore.add(elevatorGroup);

  // 5. 百米大理石迎宾大台阶 (Grand Escalier：在进深 ±41..±56m 处随 45° 斜角门框自然外扩放宽，无任何侧缝)
  // 中央拱底大平台 (y = 2 ~ 14m, Z = -20..+20m)
  box(archCore, stepsMat, 70.0, 12.0, 40.0, 0, 2.0, 0);

  const stairSteps = 24;
  const stairRise = 12.0;
  const stairStartZ = 20.0;
  const stairEndZ = 56.0;
  const stairRun = stairEndZ - stairStartZ;

  // 前后双侧宽阔对称大台阶 (z: 20..56 与 -20..-56)
  for (const dirSign of [1, -1]) {
    for (let s = 0; s < stairSteps; s++) {
      const frac = s / stairSteps; // 0 = 底部 (z=56), 1 = 顶部 (z=20)
      const absZ = stairEndZ - frac * stairRun;
      const sz = dirSign * absZ;
      const stepH = (frac + 1 / stairSteps) * stairRise;
      // 当 absZ > 41m 时随 45° 倒角外张，确保台阶严丝合缝贴合斜向大理石内壁
      const extraFlare = absZ > 41.0 ? ((absZ - 41.0) / 15.0) * 17.5 : 0;
      const stepW = 70.0 + 2 * extraFlare;
      const stepDepth = stairRun / stairSteps + 0.35;
      box(archCore, stepsMat, stepW, stepH, stepDepth, 0, 2.0, sz);
    }
  }

  // 6. 顶层屋面与凌空长廊重塑 (Le Toit de la Grande Arche - Valode & Pistre 实景屋顶：竹木中轴长桥 + 阶梯观景看台 + 采光下沉天井 + 偏置电梯顶亭)
  const roofY = 110.9;
  // A) 外圈白色大理石挑檐女儿墙与通透防风玻璃护栏
  box(archCore, marbleWhite, 108.0, 1.3, 1.4, 0, roofY, 55.3);
  box(archCore, marbleWhite, 108.0, 1.3, 1.4, 0, roofY, -55.3);
  box(archCore, marbleWhite, 1.4, 1.3, 112.0, 53.3, roofY, 0);
  box(archCore, marbleWhite, 1.4, 1.3, 112.0, -53.3, roofY, 0);

  box(archCore, roofGlassMat, 101.0, 1.1, 0.2, 0, roofY + 1.3, 52.6);
  box(archCore, roofGlassMat, 101.0, 1.1, 0.2, 0, roofY + 1.3, -52.6);
  box(archCore, roofGlassMat, 0.2, 1.1, 105.0, 50.5, roofY + 1.3, 0);
  box(archCore, roofGlassMat, 0.2, 1.1, 105.0, -50.5, roofY + 1.3, 0);

  // B) 屋顶大面积浅灰石材铺装广场与南北两侧竹木栈道平台
  box(archCore, roofStoneMat, 105.2, 0.25, 109.2, 0, roofY, 0);
  box(archCore, bambooDeckMat, 26.0, 0.28, 76.0, -34.0, roofY + 0.05, 0);
  box(archCore, bambooDeckMat, 26.0, 0.28, 76.0, +34.0, roofY + 0.05, 0);

  // C) 标志性百米中央天桥长廊 (La Passerelle：横贯屋顶正中沿巴黎历史轴线贯穿南北至两端边缘)
  box(archCore, bambooDeckMat, 13.5, 0.55, 108.0, 0, roofY + 0.25, 0);
  box(archCore, marbleBevel, 14.5, 0.35, 108.0, 0, roofY, 0);
  // 长廊两侧高透玻璃挡风墙与不锈钢扶手
  box(archCore, roofGlassMat, 0.22, 1.8, 106.0, -6.6, roofY + 0.8, 0);
  box(archCore, roofGlassMat, 0.22, 1.8, 106.0, +6.6, roofY + 0.8, 0);
  box(archCore, chromeMat, 0.3, 0.18, 106.0, -6.6, roofY + 2.6, 0);
  box(archCore, chromeMat, 0.3, 0.18, 106.0, +6.6, roofY + 2.6, 0);

  // 东侧俯瞰历史轴线的屋顶双翼阶梯观景大看台（位于中央天桥两侧，严密避开中轴玻璃走廊！）
  for (const sideX of [-17.5, +17.5]) {
    for (let i = 0; i < 6; i++) {
      box(archCore, marbleBevel, 18.0, 0.55, 2.2, sideX, roofY + 0.3 + i * 0.55, 42.0 - i * 2.2);
    }
  }

  // D) 屋顶偏置观光电梯顶层抵达玻璃厅 (x = -15.5, z = +6.0，白色石材顶盖+玻璃筒体)
  const roofElevPav = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 3.6, 18), roofGlassMat);
  roofElevPav.position.set(elevX, roofY + 1.8, elevZ);
  archCore.add(roofElevPav);
  cyl(archCore, marbleBevel, 5.1, 5.1, 0.45, elevX, roofY + 3.6, elevZ, 18);
  // 衔接电梯厅与中央长桥的竹木连廊
  box(archCore, bambooDeckMat, 14.0, 0.35, 7.5, elevX / 2, roofY + 0.25, elevZ);

  // E) 屋顶下沉式方形采光天井与展厅平顶采光带 (Sunken Square Patios & Flat Linear Skylights — 取代不实金字塔与单一巨块)
  for (const sx of [-28.0, +28.0]) {
    for (const sz of [-24.0, +16.0]) {
      // 低剖面下沉天井外框与水平格构玻璃采光顶
      box(archCore, marbleBevel, 15.0, 0.65, 15.0, sx, roofY + 0.25, sz);
      box(archCore, roofGlassMat, 12.8, 0.55, 12.8, sx, roofY + 0.45, sz);
      box(archCore, chromeMat, 13.0, 0.18, 0.28, sx, roofY + 1.0, sz - 3.2);
      box(archCore, chromeMat, 13.0, 0.18, 0.28, sx, roofY + 1.0, sz + 3.2);
      box(archCore, chromeMat, 0.28, 0.18, 13.0, sx - 3.2, roofY + 1.0, sz);
      box(archCore, chromeMat, 0.28, 0.18, 13.0, sx + 3.2, roofY + 1.0, sz);
    }
  }
  // 东侧玻璃屋顶展厅长馆（贴合现代改造后屋面体量）
  const skyGallery = box(archCore, roofGlassMat, 18.0, 3.2, 30.0, 26.0, roofY + 0.25, -4.0);
  skyGallery.userData.keepUv = true;
  box(archCore, marbleBevel, 18.6, 0.5, 30.6, 26.0, roofY + 3.45, -4.0);

  // 7. 倒角门洞与「云朵」夜间建筑泛光照明
  const frontChamferSpot = new THREE.SpotLight(0xffeedd, 0, 120, 0.75, 0.45, 1.2);
  frontChamferSpot.position.set(0, 16.0, 48.0);
  frontChamferSpot.target.position.set(0, 65.0, 52.0);
  archCore.add(frontChamferSpot);
  archCore.add(frontChamferSpot.target);

  const cloudSpot = new THREE.SpotLight(0x38bdf8, 0, 110, 0.72, 0.45, 1.2);
  cloudSpot.position.set(0, 16.0, 0);
  cloudSpot.target.position.set(0, 42.0, 0);
  archCore.add(cloudSpot);
  archCore.add(cloudSpot.target);

  const voidSpot = new THREE.PointLight(0xf8fafc, 0, 100, 1.4);
  voidSpot.position.set(0, 22.0, 0);
  archCore.add(voidSpot);

  // 8. 昼夜模式切换 (Night Mode Switcher)
  root.userData.setNightMode = (night: boolean) => {
    leftGlass.material = night ? glassNight : glassDay;
    rightGlass.material = night ? glassNight : glassDay;
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
