import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";
import { stone, box } from "./_shared";

/**
 * 轻量级钢结构桁架几何合并累加器：
 * 将数百至数千根角柱、次弦杆、X 型腹杆与连系梁合并为少量 BufferGeometry，
 * 同时保留精确面法线、UV 与 Crisp Box Edge（配合 _lines.ts 生成锻铁轮廓线）。
 */
class IronTrussAccumulator {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];

  private static readonly BASE_BOX = new THREE.BoxGeometry(1, 1, 1);
  private static readonly V = new THREE.Vector3();
  private static readonly N = new THREE.Vector3();
  private static readonly UP = new THREE.Vector3(0, 1, 0);
  private static readonly M = new THREE.Matrix4();
  private static readonly Q = new THREE.Quaternion();
  private static readonly S = new THREE.Vector3();
  private static readonly DIR = new THREE.Vector3();
  private static readonly MID = new THREE.Vector3();
  private static readonly NM = new THREE.Matrix3();

  addBoxMatrix(matrix: THREE.Matrix4, sx: number, sy: number, sz: number) {
    const base = IronTrussAccumulator.BASE_BOX;
    const posAttr = base.getAttribute("position") as THREE.BufferAttribute;
    const normAttr = base.getAttribute("normal") as THREE.BufferAttribute;
    const uvAttr = base.getAttribute("uv") as THREE.BufferAttribute;
    const idxAttr = base.getIndex()!;

    const vertOffset = this.positions.length / 3;
    const v = IronTrussAccumulator.V;
    const n = IronTrussAccumulator.N;
    const nm = IronTrussAccumulator.NM.getNormalMatrix(matrix);

    for (let i = 0; i < posAttr.count; i++) {
      v.set(posAttr.getX(i) * sx, posAttr.getY(i) * sy, posAttr.getZ(i) * sz).applyMatrix4(matrix);
      this.positions.push(v.x, v.y, v.z);

      n.set(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i)).applyMatrix3(nm).normalize();
      this.normals.push(n.x, n.y, n.z);

      this.uvs.push(uvAttr.getX(i), uvAttr.getY(i));
    }

    for (let i = 0; i < idxAttr.count; i++) {
      this.indices.push(vertOffset + idxAttr.getX(i));
    }
  }

  addBox(
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const m = IronTrussAccumulator.M;
    const q = IronTrussAccumulator.Q.setFromEuler(new THREE.Euler(rx, ry, rz));
    m.compose(new THREE.Vector3(cx, cy, cz), q, IronTrussAccumulator.S.set(1, 1, 1));
    this.addBoxMatrix(m, sx, sy, sz);
  }

  addStrut(a: THREE.Vector3, b: THREE.Vector3, w: number, d = w) {
    const dir = IronTrussAccumulator.DIR.subVectors(b, a);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.multiplyScalar(1 / len);
    const mid = IronTrussAccumulator.MID.addVectors(a, b).multiplyScalar(0.5);
    const q = IronTrussAccumulator.Q.setFromUnitVectors(IronTrussAccumulator.UP, dir);
    const m = IronTrussAccumulator.M.compose(mid, q, IronTrussAccumulator.S.set(1, 1, 1));
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

/** 真实埃菲尔铁塔平滑指数收分腿心偏移 & 单腿半宽曲线 (y: 0 ~ 276m) */
function eiffelLegProfile(y: number): { center: number; halfW: number } {
  // 关键高程控制点：地面(0) -> 一层(57) -> 二层(115) -> 汇合区(192) -> 顶层(276)
  if (y <= 57) {
    const t = y / 57;
    // 微凹指数曲线：下宽上收
    const center = 48.0 * (1 - t) + 24.2 * t - 3.6 * Math.sin(t * Math.PI);
    const halfW = 11.2 * (1 - t) + 6.6 * t - 0.8 * Math.sin(t * Math.PI);
    return { center, halfW };
  }
  if (y <= 115) {
    const t = (y - 57) / 58;
    const center = 24.2 * (1 - t) + 13.4 * t - 1.8 * Math.sin(t * Math.PI);
    const halfW = 6.6 * (1 - t) + 4.4 * t - 0.35 * Math.sin(t * Math.PI);
    return { center, halfW };
  }
  const t = Math.min(1, (y - 115) / 77);
  const center = 13.4 * (1 - t) + 5.6 * t - 0.9 * Math.sin(t * Math.PI);
  const halfW = 4.4 * (1 - t) + 3.6 * t;
  return { center, halfW };
}

function upperShaftHalfW(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 192) / 84));
  return 9.2 * (1 - t) + 5.2 * t - 0.55 * Math.sin(t * Math.PI);
}

/** 获取单条腿截面上的 4 个角点 (index 0..3 CCW around leg center) */
function legCorners(y: number, sx: number, sz: number): THREE.Vector3[] {
  const { center, halfW } = eiffelLegProfile(y);
  const cx = sx * center;
  const cz = sz * center;
  return [
    new THREE.Vector3(cx - halfW, y, cz - halfW),
    new THREE.Vector3(cx + halfW, y, cz - halfW),
    new THREE.Vector3(cx + halfW, y, cz + halfW),
    new THREE.Vector3(cx - halfW, y, cz + halfW),
  ];
}

/** 在一对矩形截面的四面内添加双分格 X 型格构腹杆、次弦杆与环梁 */
function appendTaperedTrussStage(
  acc: IronTrussAccumulator,
  bCorners: THREE.Vector3[],
  tCorners: THREE.Vector3[],
  chordW: number,
  braceW: number,
  subdivideFace: boolean,
  withInternalDiaphragm: boolean,
) {
  // 4 根主斜角弦杆
  for (let c = 0; c < 4; c++) {
    acc.addStrut(bCorners[c], tCorners[c], chordW);
  }

  for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    const b0 = bCorners[side];
    const b1 = bCorners[next];
    const t0 = tCorners[side];
    const t1 = tCorners[next];

    // 底部及中部水平环箍梁
    acc.addStrut(b0, b1, braceW * 1.15);

    if (subdivideFace) {
      const bm = new THREE.Vector3().lerpVectors(b0, b1, 0.5);
      const tm = new THREE.Vector3().lerpVectors(t0, t1, 0.5);
      const m0 = new THREE.Vector3().lerpVectors(b0, t0, 0.5);
      const m1 = new THREE.Vector3().lerpVectors(b1, t1, 0.5);
      const mm = new THREE.Vector3().lerpVectors(bm, tm, 0.5);

      // 次级竖向中脊柱 + 半高水平横梁
      acc.addStrut(bm, tm, braceW * 0.92);
      acc.addStrut(m0, m1, braceW * 0.85);

      // 4 格密布 X 型交叉斜撑，极大增强锻铁密实血肉感
      acc.addStrut(b0, mm, braceW * 0.72);
      acc.addStrut(bm, m0, braceW * 0.72);
      acc.addStrut(bm, m1, braceW * 0.72);
      acc.addStrut(b1, mm, braceW * 0.72);

      acc.addStrut(m0, tm, braceW * 0.72);
      acc.addStrut(mm, t0, braceW * 0.72);
      acc.addStrut(mm, t1, braceW * 0.72);
      acc.addStrut(m1, tm, braceW * 0.72);
    } else {
      acc.addStrut(b0, t1, braceW * 0.82);
      acc.addStrut(b1, t0, braceW * 0.82);
    }
  }

  if (withInternalDiaphragm) {
    acc.addStrut(bCorners[0], bCorners[2], braceW * 0.78);
    acc.addStrut(bCorners[1], bCorners[3], braceW * 0.78);
  }
}

export function createEiffelTower(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "eiffel";

  // 熟铁骨架日间材质 (Wrought Iron Puddled Antique Bronze)
  const ironDay = new THREE.MeshStandardMaterial({
    color: 0x4a3c2c,
    roughness: 0.65,
    metalness: 0.75,
  });
  const ironNight = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.45,
    metalness: 0.6,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
  });
  const masonryMat = stone(0xbdb29a, 0.9, 0.05);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x3d352b,
    roughness: 0.75,
    metalness: 0.4,
  });
  const goldSpireMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    metalness: 0.85,
  });
  const glassDay = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.55,
  });
  const glassNight = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.85,
  });
  const liftCarMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.7,
  });

  const ironMeshes: THREE.Mesh[] = [];
  const glassMeshes: THREE.Mesh[] = [];

  const lowerAcc = new IronTrussAccumulator();
  const midAcc = new IronTrussAccumulator();
  const upperAcc = new IronTrussAccumulator();
  const detailAcc = new IronTrussAccumulator();

  // 1. 战神广场绿荫台基 (真实塔基占宽 ~125x125m)
  const parkBase = box(root, stone(0x27361b, 0.95, 0.0), 190, 1.2, 190, 0, 0, 0);
  parkBase.userData.skipLines = true;

  // 2. 四足大型花岗岩减震基墩 + 四条弯曲线格构空间桁架巨柱 (y = 3 ~ 55m)
  const signs: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  for (const [sx, sz] of signs) {
    const p0 = eiffelLegProfile(0);
    const px = sx * p0.center;
    const pz = sz * p0.center;

    // 阶梯式花岗岩基墩（贴合脚掌外廓）
    const ped1 = box(root, masonryMat, 27, 2.5, 27, px, 0.6, pz);
    ped1.userData.skipLines = true;
    const ped2 = box(root, masonryMat, 23.5, 2.2, 23.5, px, 3.1, pz);
    ped2.userData.skipLines = true;

    const lowerStages = 7;
    const yStart = 4.0;
    const yEnd = 55.5;
    for (let s = 0; s < lowerStages; s++) {
      const yB = yStart + (s / lowerStages) * (yEnd - yStart);
      const yT = yStart + ((s + 1) / lowerStages) * (yEnd - yStart);
      const bC = legCorners(yB, sx, sz);
      const tC = legCorners(yT, sx, sz);
      appendTaperedTrussStage(lowerAcc, bC, tC, 1.45 - s * 0.06, 0.62, true, s % 2 === 1);
    }

    // 腿芯内部斜向轨道电梯导轨双桁架 + 爬升中缆车厢体
    const bCenter = new THREE.Vector3(sx * eiffelLegProfile(5).center, 5, sz * eiffelLegProfile(5).center);
    const tCenter = new THREE.Vector3(sx * eiffelLegProfile(55).center, 55, sz * eiffelLegProfile(55).center);
    const tangentOffset = new THREE.Vector3(-sz * 1.4, 0, sx * 1.4);
    for (const sideSgn of [-1, 1]) {
      const rA = bCenter.clone().addScaledVector(tangentOffset, sideSgn);
      const rB = tCenter.clone().addScaledVector(tangentOffset, sideSgn);
      lowerAcc.addStrut(rA, rB, 0.72);
    }
    // 沿斜轨横梯桁架支撑
    for (let k = 1; k < 10; k++) {
      const ft = k / 10;
      const midPt = new THREE.Vector3().lerpVectors(bCenter, tCenter, ft);
      lowerAcc.addStrut(
        midPt.clone().addScaledVector(tangentOffset, -1),
        midPt.clone().addScaledVector(tangentOffset, 1),
        0.52,
      );
    }
    // 东西腿内可见爬升双层玻璃轿厢
    if (sx !== sz) {
      const liftFrac = sx > 0 ? 0.42 : 0.68;
      const liftPos = new THREE.Vector3().lerpVectors(bCenter, tCenter, liftFrac);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 3.6), liftCarMat);
      cabin.position.copy(liftPos);
      root.add(cabin);
    }
  }

  // 3. 贴合四腿倾斜面的四面镂空锻铁花丝大拱券 (True Fitted Open-Lattice Arches, y = 4 ~ 42m)
  const archFaces = [
    { axis: "x" as const, sign: -1 },
    { axis: "x" as const, sign: 1 },
    { axis: "z" as const, sign: -1 },
    { axis: "z" as const, sign: 1 },
  ];
  for (const af of archFaces) {
    const segs = 18;
    const archPeak = 39.5;
    const archDeckY = 54.0;
    const thicknessHalf = 3.2;

    const ptOnArch = (t: number, yVal: number, offsetOut: number) => {
      const prof = eiffelLegProfile(Math.min(54, yVal));
      const spanHalf = prof.center - prof.halfW * 0.45;
      const coordAlong = t * spanHalf;
      const coordPerp = af.sign * (prof.center + prof.halfW * 0.28 + offsetOut);
      return af.axis === "z"
        ? new THREE.Vector3(coordAlong, yVal, coordPerp)
        : new THREE.Vector3(coordPerp, yVal, coordAlong);
    };

    for (const off of [-thicknessHalf, thicknessHalf]) {
      for (let i = 0; i < segs; i++) {
        const t0 = (i / segs) * 2 - 1;
        const t1 = ((i + 1) / segs) * 2 - 1;
        const y0 = Math.max(4, archPeak * (1 - t0 * t0));
        const y1 = Math.max(4, archPeak * (1 - t1 * t1));

        // 拱腹下缘双肋弦杆
        const a0 = ptOnArch(t0, y0, off);
        const a1 = ptOnArch(t1, y1, off);
        lowerAcc.addStrut(a0, a1, 1.05);

        // 拱上缘承重挑梁 (位于 y = 48.5m 一层裙底以下)
        const topY0 = Math.min(archDeckY, y0 + 6.5 + 8.5 * t0 * t0);
        const topY1 = Math.min(archDeckY, y1 + 6.5 + 8.5 * t1 * t1);
        const b0 = ptOnArch(t0, topY0, off);
        const b1 = ptOnArch(t1, topY1, off);
        lowerAcc.addStrut(b0, b1, 0.85);

        // 辐射状腹杆与拱肩花饰 X 交叉网格
        lowerAcc.addStrut(a0, b0, 0.68);
        lowerAcc.addStrut(a0, b1, 0.48);
        lowerAcc.addStrut(a1, b0, 0.48);
      }
    }

    // 前后双片拱肋之间的横联撑杆
    for (let i = 1; i < segs; i++) {
      const t = (i / segs) * 2 - 1;
      const yA = Math.max(4, archPeak * (1 - t * t));
      lowerAcc.addStrut(
        ptOnArch(t, yA, -thicknessHalf),
        ptOnArch(t, yA, thicknessHalf),
        0.65,
      );
    }

    // 拱顶中央金色徽章环饰
    const topMid = ptOnArch(0, archPeak - 1.2, 0);
    const rosette = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, thicknessHalf * 2 + 1.2, 16),
      goldSpireMat,
    );
    rosette.position.copy(topMid);
    if (af.axis === "z") rosette.rotation.x = Math.PI / 2;
    else rosette.rotation.z = Math.PI / 2;
    root.add(rosette);
  }

  // 4. 一层宏伟镂空回廊大观景台 (Platform 1, y = 52 ~ 67m，中庭真实留空 + 四周悬挑托架裙廊)
  const p1OuterW = 72;
  const p1InnerW = 28;
  const ringBarW = (p1OuterW - p1InnerW) / 2; // 22m 宽环廊
  const ringMidOff = (p1OuterW + p1InnerW) / 4; // 25m

  // 四条环廊组成带真实中央采光天井的一层主甲板 (无一整块扁平实心饼!)
  const ringBars = [
    { w: p1OuterW, d: ringBarW, x: 0, z: -ringMidOff },
    { w: p1OuterW, d: ringBarW, x: 0, z: ringMidOff },
    { w: ringBarW, d: p1InnerW, x: -ringMidOff, z: 0 },
    { w: ringBarW, d: p1InnerW, x: ringMidOff, z: 0 },
  ];
  for (const rb of ringBars) {
    const slab = box(root, deckMat, rb.w, 2.8, rb.d, rb.x, 56.2, rb.z);
    slab.userData.skipLines = true;
  }
  // 中央玻璃漫步走廊十字钢梁
  detailAcc.addBox(0, 57.6, 0, p1InnerW, 0.9, 3.2);
  detailAcc.addBox(0, 57.6, 0, 3.2, 0.9, p1InnerW);

  // 一层外悬挑弧形牛腿斜撑 & 外立面拱廊柱列 (Cantilevered Under-Skirt Brackets)
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const fg = new THREE.Group();
    // 72 位法国科学家金色铭文装饰带 + 外圈重型锻铁围梁
    box(fg, goldSpireMat, 68, 1.9, 0.6, 0, 57.6, 36.2);
    box(fg, ironDay, 72.5, 1.2, 1.4, 0, 59.3, 35.8);
    // 天井内圈围栏
    box(fg, ironDay, p1InnerW + 1.2, 1.1, 0.7, 0, 59.0, p1InnerW / 2);

    // 每面 9 组镂空钢构弧廊立柱与斜撑托架
    for (let k = -4; k <= 4; k++) {
      const gx = k * 7.5;
      // 台基外挑底部斜向牛腿支架
      const b1 = new THREE.Vector3(gx, 52.0, 29.0);
      const t1 = new THREE.Vector3(gx, 56.2, 36.0);
      const b2 = new THREE.Vector3(gx, 56.2, 29.0);
      const v1 = b1.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      const v2 = t1.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      const v3 = b2.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      detailAcc.addStrut(v1, v2, 0.78);
      detailAcc.addStrut(v1, v3, 0.65);

      // 观景层护栏竖梃
      const rB = new THREE.Vector3(gx, 59.0, 35.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      const rT = new THREE.Vector3(gx, 62.0, 35.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      detailAcc.addStrut(rB, rT, 0.52);
    }
    fg.rotation.y = rotY;
    root.add(fg);
  }

  // 一层四角法式四坡屋顶全景玻璃展厅 (Corner Pavilions + Pitched Mansard Roofs)
  for (const sx of [-22, 22]) {
    for (const sz of [-22, 22]) {
      const pav = box(root, glassDay, 13.5, 5.2, 13.5, sx, 59.0, sz);
      pav.userData.keepUv = true;
      glassMeshes.push(pav);

      detailAcc.addBox(sx, 64.5, sz, 14.6, 0.85, 14.6);
      // 坡顶四隅加劲钢屋架
      const apex = new THREE.Vector3(sx, 68.4, sz);
      for (const [cx, cz] of [[-7, -7], [7, -7], [7, 7], [-7, 7]]) {
        detailAcc.addStrut(new THREE.Vector3(sx + cx, 64.8, sz + cz), apex, 0.58);
      }
    }
  }

  // 5. 一至二层弧线收敛段 (y = 58.5 ~ 114m，每腿 8 级双密 X 型格构 + 中央倾斜电梯塔与盘旋楼梯)
  for (const [sx, sz] of signs) {
    const midStages = 8;
    const yStart = 58.5;
    const yEnd = 114.2;
    for (let s = 0; s < midStages; s++) {
      const yB = yStart + (s / midStages) * (yEnd - yStart);
      const yT = yStart + ((s + 1) / midStages) * (yEnd - yStart);
      const bC = legCorners(yB, sx, sz);
      const tC = legCorners(yT, sx, sz);
      appendTaperedTrussStage(midAcc, bC, tC, 1.1 - s * 0.03, 0.52, true, s % 2 === 1);
    }
  }

  // 一至二层中央核心：双垂直/斜向快速电梯井道骨架 + 中央旋梯桁架 + 3 道内部水平风撑格构横桥
  const coreCols = [[-3.4, -3.4], [3.4, -3.4], [3.4, 3.4], [-3.4, 3.4]];
  for (const [cx, cz] of coreCols) {
    midAcc.addStrut(new THREE.Vector3(cx, 57, cz), new THREE.Vector3(cx * 0.82, 115, cz * 0.82), 0.72);
  }
  for (let k = 0; k < 10; k++) {
    const y1 = 58 + k * 5.6;
    const y2 = y1 + 5.6;
    const f1 = 1 - (k / 10) * 0.18;
    const f2 = 1 - ((k + 1) / 10) * 0.18;
    const bPts = coreCols.map(([x, z]) => new THREE.Vector3(x * f1, y1, z * f1));
    const tPts = coreCols.map(([x, z]) => new THREE.Vector3(x * f2, y2, z * f2));
    appendTaperedTrussStage(midAcc, bPts, tPts, 0.65, 0.42, false, k % 2 === 0);
  }

  // 3 道贯穿四腿的立体空间水平加劲联结格构桥 (y = 74m, 90m, 104m)
  for (const hy of [74, 90, 104]) {
    const prof = eiffelLegProfile(hy);
    const outerSpan = prof.center * 2;
    const off = prof.center;
    const deckDrop = 2.6;
    // 外圈双层平面桁架梁 + 斜向撑入中央电梯核心
    for (const yLev of [hy - deckDrop / 2, hy + deckDrop / 2]) {
      midAcc.addBox(0, yLev, -off, outerSpan, 0.85, 0.85);
      midAcc.addBox(0, yLev, off, outerSpan, 0.85, 0.85);
      midAcc.addBox(-off, yLev, 0, 0.85, 0.85, outerSpan);
      midAcc.addBox(off, yLev, 0, 0.85, 0.85, outerSpan);
    }
    // 纵深桁架腹杆与四向辐射拉杆
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const a0 = -off + (i / steps) * outerSpan;
      const a1 = -off + ((i + 1) / steps) * outerSpan;
      for (const sideOff of [-off, off]) {
        midAcc.addStrut(
          new THREE.Vector3(a0, hy - deckDrop / 2, sideOff),
          new THREE.Vector3(a1, hy + deckDrop / 2, sideOff),
          0.46,
        );
        midAcc.addStrut(
          new THREE.Vector3(a1, hy - deckDrop / 2, sideOff),
          new THREE.Vector3(a0, hy + deckDrop / 2, sideOff),
          0.46,
        );
        midAcc.addStrut(
          new THREE.Vector3(sideOff, hy - deckDrop / 2, a0),
          new THREE.Vector3(sideOff, hy + deckDrop / 2, a1),
          0.46,
        );
        midAcc.addStrut(
          new THREE.Vector3(sideOff, hy - deckDrop / 2, a1),
          new THREE.Vector3(sideOff, hy + deckDrop / 2, a0),
          0.46,
        );
      }
    }
    // 十字连向中央核心井道的刚性腹杆
    midAcc.addStrut(new THREE.Vector3(-off, hy, 0), new THREE.Vector3(off, hy, 0), 0.72);
    midAcc.addStrut(new THREE.Vector3(0, hy, -off), new THREE.Vector3(0, hy, off), 0.72);
  }

  // 6. 二层双层观景平台与儒勒·凡尔纳全景厅 (Platform 2, y = 113 ~ 125m)
  const p2Outer = box(root, deckMat, 44, 2.8, 44, 0, 114.2, 0);
  p2Outer.userData.skipLines = true;
  detailAcc.addBox(0, 117.2, 0, 45.4, 1.1, 45.4);

  // 二层四角与四边斜向外挑承托牛腿桁架群
  for (const [sx, sz] of signs) {
    midAcc.addStrut(
      new THREE.Vector3(sx * 14.5, 108.5, sz * 14.5),
      new THREE.Vector3(sx * 21.5, 114.4, sz * 21.5),
      0.95,
    );
  }
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (let k = -2; k <= 2; k++) {
      const gx = k * 7.2;
      const b1 = new THREE.Vector3(gx, 110.5, 16.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      const t1 = new THREE.Vector3(gx, 114.4, 22.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      detailAcc.addStrut(b1, t1, 0.65);
    }
  }

  // 凡尔纳餐厅全景玻璃核心 + 密排窗框立柱
  const p2Core = box(root, glassDay, 28, 5.2, 28, 0, 117.6, 0);
  p2Core.userData.keepUv = true;
  glassMeshes.push(p2Core);
  for (let i = -3; i <= 3; i++) {
    const off = i * 4.5;
    detailAcc.addBox(off, 120.2, 14.1, 0.45, 5.2, 0.45);
    detailAcc.addBox(off, 120.2, -14.1, 0.45, 5.2, 0.45);
    detailAcc.addBox(14.1, 120.2, off, 0.45, 5.2, 0.45);
    detailAcc.addBox(-14.1, 120.2, off, 0.45, 5.2, 0.45);
  }

  // 二层上层露天观景台与金色护栏
  const p2UpperDeck = box(root, deckMat, 33, 1.1, 33, 0, 122.8, 0);
  p2UpperDeck.userData.skipLines = true;
  box(root, goldSpireMat, 33.8, 0.9, 33.8, 0, 123.9, 0);

  // 7. 平滑自然汇合段 (y = 123 ~ 192m，10 级弧线斜柱优雅并拢 + 镂空拱券与双层空中走廊)
  for (const [sx, sz] of signs) {
    const convStages = 10;
    const yStart = 123.5;
    const yEnd = 192.0;
    for (let s = 0; s < convStages; s++) {
      const yB = yStart + (s / convStages) * (yEnd - yStart);
      const yT = yStart + ((s + 1) / convStages) * (yEnd - yStart);
      const bC = legCorners(yB, sx, sz);
      const tC = legCorners(yT, sx, sz);
      appendTaperedTrussStage(upperAcc, bC, tC, 0.88 - s * 0.015, 0.44, true, s % 2 === 1);
    }
  }

  // 二层上方四面镂空锻铁过渡拱券 (y = 124 ~ 146m)
  for (const af of archFaces) {
    const segs = 12;
    const baseA = 124;
    const peakA = 144;
    const topA = 148;
    for (let i = 0; i < segs; i++) {
      const t0 = (i / segs) * 2 - 1;
      const t1 = ((i + 1) / segs) * 2 - 1;
      const y0 = baseA + (peakA - baseA) * (1 - t0 * t0);
      const y1 = baseA + (peakA - baseA) * (1 - t1 * t1);
      const prof0 = eiffelLegProfile(y0);
      const prof1 = eiffelLegProfile(y1);

      const pA0 = af.axis === "z"
        ? new THREE.Vector3(t0 * prof0.center, y0, af.sign * (prof0.center + prof0.halfW * 0.15))
        : new THREE.Vector3(af.sign * (prof0.center + prof0.halfW * 0.15), y0, t0 * prof0.center);
      const pA1 = af.axis === "z"
        ? new THREE.Vector3(t1 * prof1.center, y1, af.sign * (prof1.center + prof1.halfW * 0.15))
        : new THREE.Vector3(af.sign * (prof1.center + prof1.halfW * 0.15), y1, t1 * prof1.center);

      const topY0 = Math.min(topA, y0 + 4.0 + 4.0 * t0 * t0);
      const topY1 = Math.min(topA, y1 + 4.0 + 4.0 * t1 * t1);
      const pB0 = af.axis === "z"
        ? new THREE.Vector3(t0 * prof0.center, topY0, af.sign * (prof0.center + prof0.halfW * 0.15))
        : new THREE.Vector3(af.sign * (prof0.center + prof0.halfW * 0.15), topY0, t0 * prof0.center);
      const pB1 = af.axis === "z"
        ? new THREE.Vector3(t1 * prof1.center, topY1, af.sign * (prof1.center + prof1.halfW * 0.15))
        : new THREE.Vector3(af.sign * (prof1.center + prof1.halfW * 0.15), topY1, t1 * prof1.center);

      upperAcc.addStrut(pA0, pA1, 0.78);
      upperAcc.addStrut(pB0, pB1, 0.62);
      upperAcc.addStrut(pA0, pB0, 0.48);
      upperAcc.addStrut(pA0, pB1, 0.36);
    }
  }

  // 汇合段内部双快速电梯井道 & 阶梯连系观景平台 (y = 152m, 174m, 192m)
  for (const [ex, ez] of [[-2.0, -2.0], [2.0, -2.0], [2.0, 2.0], [-2.0, 2.0]]) {
    upperAcc.addStrut(new THREE.Vector3(ex, 123, ez), new THREE.Vector3(ex * 0.85, 276, ez * 0.85), 0.56);
  }
  for (let yk = 126; yk < 274; yk += 8) {
    const f = yk < 192 ? 2.0 : 1.75;
    upperAcc.addStrut(new THREE.Vector3(-f, yk, -f), new THREE.Vector3(f, yk + 8, f), 0.38);
    upperAcc.addStrut(new THREE.Vector3(f, yk, -f), new THREE.Vector3(-f, yk + 8, f), 0.38);
  }
  for (const ringY of [152, 174, 192]) {
    const prof = eiffelLegProfile(ringY);
    const rw = (prof.center + prof.halfW) * 2 + 1.8;
    upperAcc.addBox(0, ringY, 0, rw, 1.3, rw);
  }

  // 8. 主塔身合拢上段 (y = 192 ~ 276m，14 级双密菱形格构壁面 + 多层悬挑检修环廊)
  const spireStages = 14;
  const spireBaseY = 192;
  const spireTopY = 276;
  for (let s = 0; s < spireStages; s++) {
    const yB = spireBaseY + (s / spireStages) * (spireTopY - spireBaseY);
    const yT = spireBaseY + ((s + 1) / spireStages) * (spireTopY - spireBaseY);
    const hwB = upperShaftHalfW(yB);
    const hwT = upperShaftHalfW(yT);
    const bCorners = [
      new THREE.Vector3(-hwB, yB, -hwB),
      new THREE.Vector3(hwB, yB, -hwB),
      new THREE.Vector3(hwB, yB, hwB),
      new THREE.Vector3(-hwB, yB, hwB),
    ];
    const tCorners = [
      new THREE.Vector3(-hwT, yT, -hwT),
      new THREE.Vector3(hwT, yT, -hwT),
      new THREE.Vector3(hwT, yT, hwT),
      new THREE.Vector3(-hwT, yT, hwT),
    ];
    appendTaperedTrussStage(upperAcc, bCorners, tCorners, 0.82 - s * 0.015, 0.42, true, s % 2 === 1);

    // 标志性外悬挑环廊与铁艺安全护栏 (y = 216, 240, 264m)
    if (s === 4 || s === 8 || s === 12) {
      const balW = hwB * 2 + 2.6;
      detailAcc.addBox(0, yB, 0, balW, 0.95, balW);
      detailAcc.addBox(0, yB + 1.1, balW / 2, balW, 0.35, 0.35);
      detailAcc.addBox(0, yB + 1.1, -balW / 2, balW, 0.35, 0.35);
      detailAcc.addBox(balW / 2, yB + 1.1, 0, 0.35, 0.35, balW);
      detailAcc.addBox(-balW / 2, yB + 1.1, 0, 0.35, 0.35, balW);
    }
  }

  // 9. 三层顶层观景台、埃菲尔私人密室与格构广播桅杆 (y = 276 ~ 330m，严密衔接且无多余光束！)
  // 底部外挑辐射铁艺牛腿篮筐
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    detailAcc.addStrut(
      new THREE.Vector3(Math.cos(a) * 5.0, 271.5, Math.sin(a) * 5.0),
      new THREE.Vector3(Math.cos(a) * 8.6, 276.2, Math.sin(a) * 8.6),
      0.52,
    );
  }

  const p3Lower = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 8.6, 6.8, 18),
    glassDay,
  );
  p3Lower.position.set(0, 276 + 6.8 / 2, 0);
  p3Lower.userData.keepUv = true;
  root.add(p3Lower);
  glassMeshes.push(p3Lower);

  // 顶层玻璃廊外圈细密铁艺窗框竖梃
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    detailAcc.addStrut(
      new THREE.Vector3(Math.cos(a) * 8.65, 276.0, Math.sin(a) * 8.65),
      new THREE.Vector3(Math.cos(a) * 8.25, 282.8, Math.sin(a) * 8.25),
      0.34,
    );
  }

  const p3Deck = new THREE.Mesh(
    new THREE.CylinderGeometry(9.3, 9.3, 1.3, 18),
    deckMat,
  );
  p3Deck.position.set(0, 283.5, 0);
  root.add(p3Deck);

  const p3Upper = new THREE.Mesh(
    new THREE.CylinderGeometry(6.3, 6.9, 8.0, 16),
    ironDay,
  );
  p3Upper.position.set(0, 287.8, 0);
  root.add(p3Upper);
  ironMeshes.push(p3Upper);

  const cupola = new THREE.Mesh(
    new THREE.SphereGeometry(4.8, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    goldSpireMat,
  );
  cupola.position.set(0, 291.8, 0);
  root.add(cupola);

  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.9,
  });
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.4, 5.5, 14),
    lanternGlassMat,
  );
  lantern.position.set(0, 298.2, 0);
  root.add(lantern);

  // 顶部镂空菱形桁架广播天线塔 (y = 301 ~ 330m)
  const mastStages = 6;
  const mastY0 = 301.0;
  const mastY1 = 326.0;
  for (let s = 0; s < mastStages; s++) {
    const yB = mastY0 + (s / mastStages) * (mastY1 - mastY0);
    const yT = mastY0 + ((s + 1) / mastStages) * (mastY1 - mastY0);
    const wB = 2.1 * (1 - s / mastStages) + 0.55;
    const wT = 2.1 * (1 - (s + 1) / mastStages) + 0.55;
    const bC = [
      new THREE.Vector3(-wB, yB, -wB),
      new THREE.Vector3(wB, yB, -wB),
      new THREE.Vector3(wB, yB, wB),
      new THREE.Vector3(-wB, yB, wB),
    ];
    const tC = [
      new THREE.Vector3(-wT, yT, -wT),
      new THREE.Vector3(wT, yT, -wT),
      new THREE.Vector3(wT, yT, wT),
      new THREE.Vector3(-wT, yT, wT),
    ];
    appendTaperedTrussStage(detailAcc, bC, tC, 0.34, 0.22, false, false);
  }
  // 细尖避雷针尖顶
  const mastTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.52, 4.5, 8),
    goldSpireMat,
  );
  mastTip.position.set(0, 328.0, 0);
  root.add(mastTip);

  // 环形微波广播发射皿框
  for (const dy of [306, 313, 320]) {
    const dishRing = new THREE.Mesh(
      new THREE.TorusGeometry(dy === 306 ? 2.6 : dy === 313 ? 2.1 : 1.6, 0.22, 6, 16),
      goldSpireMat,
    );
    dishRing.rotation.x = Math.PI / 2;
    dishRing.position.set(0, dy, 0);
    root.add(dishRing);
  }

  const redBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0044 }),
  );
  redBeacon.position.set(0, 330.2, 0);
  root.add(redBeacon);

  // 将所有合批完成的熟铁格构骨架加入场景与夜间灯光列表
  for (const acc of [lowerAcc, midAcc, upperAcc, detailAcc]) {
    const mesh = acc.toMesh(ironDay);
    root.add(mesh);
    ironMeshes.push(mesh);
  }

  // 10. 夜间建筑泛光照明（保留优雅暖金塔身照明，不含多余顶层探照光束）
  const flood1 = new THREE.PointLight(0xf59e0b, 0, 130, 1.6);
  flood1.position.set(0, 42, 0);
  root.add(flood1);

  const flood2 = new THREE.PointLight(0xfbbf24, 0, 110, 1.5);
  flood2.position.set(0, 118, 0);
  root.add(flood2);

  const flood3 = new THREE.PointLight(0xfef08a, 0, 90, 1.5);
  flood3.position.set(0, 278, 0);
  root.add(flood3);

  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    for (const mesh of ironMeshes) {
      mesh.material = night ? ironNight : ironDay;
    }
    for (const gm of glassMeshes) {
      gm.material = night ? glassNight : glassDay;
    }
    lanternGlassMat.emissiveIntensity = night ? 2.0 : 0.6;
    flood1.intensity = night ? 3.8 : 0;
    flood2.intensity = night ? 2.8 : 0;
    flood3.intensity = night ? 2.4 : 0;
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 希腊雅典帕特农神庙 (Parthenon, Acropolis of Athens)
// ─────────────────────────────────────────────────────────
