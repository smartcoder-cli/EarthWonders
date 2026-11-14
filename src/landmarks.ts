import * as THREE from "three";
import { finishSurfaces, mapped, type SurfaceKit } from "./surfaces";

type Mat = THREE.Material;

function stone(color: number, roughness = 0.9, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function gold() {
  return new THREE.MeshStandardMaterial({
    color: 0xc9a84c,
    roughness: 0.28,
    metalness: 0.86,
  });
}

function box(
  parent: THREE.Object3D,
  material: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  parent.add(mesh);
  return mesh;
}

function cyl(
  parent: THREE.Object3D,
  material: Mat,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  x: number,
  y: number,
  z: number,
  segments = 16,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.position.set(x, y + height / 2, z);
  parent.add(mesh);
  return mesh;
}

function pyramidGeo(base: number, height: number) {
  const geometry = new THREE.ConeGeometry(base / Math.SQRT2, height, 4, 1, false);
  geometry.rotateY(Math.PI / 4);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function frustumGeo(base: number, top: number, height: number) {
  const hb = base / 2;
  const ht = top / 2;
  const positions = new Float32Array([
    -hb, 0, -hb, hb, 0, -hb, hb, 0, hb, -hb, 0, hb,
    -ht, height, -ht, ht, height, -ht, ht, height, ht, -ht, height, ht,
  ]);
  // CCW when viewed from outside so side normals point outward.
  const idx = [
    0, 5, 1, 0, 4, 5,
    1, 6, 2, 1, 5, 6,
    2, 7, 3, 2, 6, 7,
    3, 4, 0, 3, 7, 4,
    4, 6, 5, 4, 7, 6,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return geometry;
}

function onionLathe(radius: number, height: number, segments = 24) {
  const pts = [
    [0.02, 0],
    [radius * 0.48, height * 0.07],
    [radius * 1.05, height * 0.36],
    [radius * 0.9, height * 0.6],
    [radius * 0.34, height * 0.88],
    [radius * 0.08, height * 1.02],
    [0.0, height * 1.08],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, segments);
}

function pointedArchShape(width: number, height: number) {
  const hw = width / 2;
  const spring = height * 0.55;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, spring);
  shape.quadraticCurveTo(-hw * 0.12, height * 0.92, 0, height);
  shape.quadraticCurveTo(hw * 0.12, height * 0.92, hw, spring);
  shape.lineTo(hw, 0);
  shape.closePath();
  return shape;
}

function roundArchShape(width: number, height: number) {
  const hw = width / 2;
  const r = hw;
  const spring = Math.max(height - r, 0.05);
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, spring);
  shape.absarc(0, spring, r, Math.PI, 0, true);
  shape.lineTo(hw, 0);
  shape.closePath();
  return shape;
}

function archSlab(
  width: number,
  height: number,
  depth: number,
  thickness: number,
  pointed = false,
) {
  const outer = new THREE.Shape();
  const ow = width / 2 + thickness;
  outer.moveTo(-ow, 0);
  outer.lineTo(-ow, height + thickness);
  outer.lineTo(ow, height + thickness);
  outer.lineTo(ow, 0);
  outer.closePath();
  outer.holes.push(pointed ? pointedArchShape(width, height) : roundArchShape(width, height));
  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function trapWallGeo(length: number, height: number, baseW: number, topW: number) {
  const shape = new THREE.Shape();
  const hb = baseW / 2;
  const ht = topW / 2;
  shape.moveTo(-hb, 0);
  shape.lineTo(hb, 0);
  shape.lineTo(ht, height);
  shape.lineTo(-ht, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geometry.translate(0, 0, -length / 2);
  return geometry;
}

function chamferPrism(width: number, height: number, chamfer: number) {
  const hw = width / 2;
  const c = chamfer;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hw);
  shape.lineTo(hw - c, -hw);
  shape.lineTo(hw, -hw + c);
  shape.lineTo(hw, hw - c);
  shape.lineTo(hw - c, hw);
  shape.lineTo(-hw + c, hw);
  shape.lineTo(-hw, hw - c);
  shape.lineTo(-hw, -hw + c);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function gableRoofGeo(w: number, d: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geometry.translate(0, 0, -d / 2);
  return geometry;
}

function ellipseShape(rx: number, rz: number, segments = 64) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * rz;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

function ring(outerX: number, outerZ: number, innerX: number, innerZ: number, segments = 56) {
  const shape = ellipseShape(outerX, outerZ, segments);
  shape.holes.push(ellipseShape(innerX, innerZ, Math.max(24, segments - 8)));
  return shape;
}

function partialRing(
  rxo: number,
  rzo: number,
  rxi: number,
  rzi: number,
  a0: number,
  a1: number,
  segs = 40,
) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const a = a0 + ((a1 - a0) * i) / segs;
    const x = Math.cos(a) * rxo;
    const y = Math.sin(a) * rzo;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segs; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / segs;
    shape.lineTo(Math.cos(a) * rxi, Math.sin(a) * rzi);
  }
  shape.closePath();
  return shape;
}

function extrudeY(shape: THREE.Shape, height: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function column(
  parent: THREE.Object3D,
  material: Mat,
  height: number,
  radius: number,
  x: number,
  y: number,
  z: number,
) {
  cyl(parent, material, radius * 1.38, radius * 1.45, height * 0.07, x, y, z, 12);
  cyl(parent, material, radius * 0.9, radius, height * 0.8, x, y + height * 0.07, z, 14);
  box(parent, material, radius * 3.2, height * 0.08, radius * 3.2, x, y + height * 0.87, z);
  cyl(parent, material, radius * 1.15, radius * 1.35, height * 0.05, x, y + height * 0.95, z, 10);
}

function squareBattlements(
  parent: THREE.Object3D,
  material: Mat,
  size: number,
  y: number,
  count = 5,
  merlon = 1.08,
  height = 1.55,
) {
  const half = size / 2 - merlon * 0.28;
  const span = size - merlon;
  for (let side = 0; side < 4; side++) {
    const yaw = (side * Math.PI) / 2;
    for (let i = 0; i < count; i++) {
      const along = (i / Math.max(count - 1, 1) - 0.5) * span;
      const x = Math.cos(yaw) * half - Math.sin(yaw) * along;
      const z = Math.sin(yaw) * half + Math.cos(yaw) * along;
      box(parent, material, merlon, height, merlon, x, y, z);
    }
  }
}

function squareParapet(
  parent: THREE.Object3D,
  material: Mat,
  size: number,
  y: number,
  thick = 0.72,
  wallH = 0.95,
  merlonH = 1.5,
) {
  const inner = size - thick;
  box(parent, material, size, wallH, thick, 0, y, -(size / 2) + thick / 2);
  box(parent, material, size, wallH, thick, 0, y, size / 2 - thick / 2);
  box(parent, material, thick, wallH, inner, -(size / 2) + thick / 2, y, 0);
  box(parent, material, thick, wallH, inner, size / 2 - thick / 2, y, 0);
  squareBattlements(parent, material, size, y + wallH, 5, 1.08, merlonH);
}

function hardGableHut(
  parent: THREE.Object3D,
  wall: Mat,
  dark: Mat,
  roof: Mat,
  w: number,
  d: number,
  y: number,
  h = 3.0,
) {
  box(parent, wall, w, h, d, 0, y, 0);
  box(parent, dark, w * 0.28, h * 0.48, 0.38, 0, y + h * 0.22, -d / 2 + 0.05);
  const mesh = new THREE.Mesh(gableRoofGeo(w + 0.9, d + 0.7, h * 0.62), roof);
  mesh.position.y = y + h;
  parent.add(mesh);
}

function trapDoorGeo(wBottom: number, wTop: number, h: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-wBottom / 2, 0);
  shape.lineTo(wBottom / 2, 0);
  shape.lineTo(wTop / 2, h);
  shape.lineTo(-wTop / 2, h);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function incaHouse(
  parent: THREE.Object3D,
  wall: Mat,
  roof: Mat,
  dark: Mat,
  w: number,
  d: number,
  h: number,
  x: number,
  z: number,
  rotY = 0,
) {
  const g = new THREE.Group();
  box(g, wall, w, h, d, 0, 0, 0);
  const door = new THREE.Mesh(trapDoorGeo(w * 0.28, w * 0.18, h * 0.62, 0.45), dark);
  door.position.set(0, 0.15, -d / 2 + 0.05);
  g.add(door);
  box(g, dark, w * 0.16, h * 0.22, 0.35, -w * 0.28, h * 0.55, -d / 2 + 0.05);
  box(g, dark, w * 0.16, h * 0.22, 0.35, w * 0.28, h * 0.55, -d / 2 + 0.05);
  const roofMesh = new THREE.Mesh(gableRoofGeo(w + 1.2, d + 0.8, h * 0.72), roof);
  roofMesh.position.y = h;
  g.add(roofMesh);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
}

function templeCourt(
  parent: THREE.Object3D,
  wall: Mat,
  floor: Mat,
  w: number,
  d: number,
  x: number,
  z: number,
) {
  box(parent, floor, w, 1.2, d, x, 0, z);
  box(parent, wall, w, 4.4, 1.5, x, 1.2, z - d / 2 + 0.75);
  box(parent, wall, w, 4.4, 1.5, x, 1.2, z + d / 2 - 0.75);
  box(parent, wall, 1.5, 4.4, d - 2, x - w / 2 + 0.75, 1.2, z);
  box(parent, wall, 1.5, 4.4, d - 2, x + w / 2 - 0.75, 1.2, z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(parent, wall, 0.7, 0.85, 5.2, x + sx * (w / 2 - 2.2), 1.2, z + sz * (d / 2 - 2.2), 8);
    }
  }
}

/**
 * 为金字塔四面交汇处构建高精度、极具3D立体感的交角大脊线与棱角过渡：
 * 1. 4 条从底座四角直至塔尖直通的骨架棱角线（LineSegments）；
 * 2. 4 条微倒角实体石棱柱（TubeGeometry），在阳光照射下产生自然明暗分界；
 * 3. 塔尖 Benben 小金字塔尖顶。
 */
function addPyramidArrisFeatures(
  group: THREE.Group,
  base: number,
  height: number,
  y0 = 0,
  lineColor = 0x362516,
  ribColor = 0x8a7050,
) {
  const hb = base / 2;
  const topY = y0 + height;
  const top = new THREE.Vector3(0, topY, 0);
  const corners = [
    new THREE.Vector3(-hb, y0, -hb),
    new THREE.Vector3(hb, y0, -hb),
    new THREE.Vector3(hb, y0, hb),
    new THREE.Vector3(-hb, y0, hb),
  ];

  // (A) 4 条贯穿至塔尖的骨架棱角线 + 底面周长线
  const linePositions = new Float32Array([
    // 4条对角大脊线
    corners[0].x, y0, corners[0].z,  0, topY, 0,
    corners[1].x, y0, corners[1].z,  0, topY, 0,
    corners[2].x, y0, corners[2].z,  0, topY, 0,
    corners[3].x, y0, corners[3].z,  0, topY, 0,
    // 底边闭合框
    corners[0].x, y0, corners[0].z,  corners[1].x, y0, corners[1].z,
    corners[1].x, y0, corners[1].z,  corners[2].x, y0, corners[2].z,
    corners[2].x, y0, corners[2].z,  corners[3].x, y0, corners[3].z,
    corners[3].x, y0, corners[3].z,  corners[0].x, y0, corners[0].z,
  ]);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: lineColor,
    transparent: true,
    opacity: 0.92,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const skeleton = new THREE.LineSegments(lineGeo, lineMat);
  skeleton.renderOrder = 2;
  group.add(skeleton);

  // (B) 四角立体微倒角石棱（实体几何）：
  // 在阳光漫反射下，形成向阳微亮、背光微暗的 45° 倒角棱带，
  // 彻底打破两个三角面贴图平铺交汇无分割的平面感。
  const ribRadius = Math.max(0.35, Math.min(1.2, base * 0.005));
  const ribMat = stone(ribColor, 0.92, 0.03);
  for (const c of corners) {
    const curve = new THREE.LineCurve3(c, top);
    const ribGeo = new THREE.TubeGeometry(curve, 1, ribRadius, 4);
    const ribMesh = new THREE.Mesh(ribGeo, ribMat);
    ribMesh.userData.skipLines = true;
    group.add(ribMesh);
  }

  // (C) 塔尖 Benben 顶石
  const capSize = Math.max(1.8, ribRadius * 3.6);
  const cap = new THREE.Mesh(pyramidGeo(capSize, capSize * 0.85), stone(ribColor, 0.88, 0.05));
  cap.position.set(0, topY - capSize * 0.25, 0);
  cap.userData.skipLines = true;
  group.add(cap);
}

function coursedPyramid(
  parent: THREE.Object3D,
  material: Mat,
  base: number,
  height: number,
  courses: number,
  x: number,
  z: number,
  y0 = 0,
) {
  const group = new THREE.Group();
  const slope = height / (base / 2);
  let y = y0;
  let size = base;
  const ch = height / courses;
  for (let i = 0; i < courses; i++) {
    const inset = ch / slope;
    const next = Math.max(size - 2 * inset, 0.9);
    const layer = new THREE.Mesh(frustumGeo(size, next + inset * 0.28, ch), material);
    layer.position.y = y;
    group.add(layer);
    y += ch;
    size = next;
  }

  // 强化四角大脊线与倒角立体棱柱
  addPyramidArrisFeatures(group, base, height, y0);

  group.position.set(x, 0, z);
  parent.add(group);
  return group;
}

function serpentHead(parent: THREE.Object3D, material: Mat, x: number, z: number) {
  const head = new THREE.Group();
  box(head, material, 2.5, 2.1, 5.6, 0, 0.15, 0);
  box(head, material, 2.1, 1.15, 3.6, 0, 2.15, 0.35);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.4, 6), material);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 1.1, 3.6);
  head.add(snout);
  box(head, material, 0.55, 0.7, 2.6, -1.35, 1.35, 1.8);
  box(head, material, 0.55, 0.7, 2.6, 1.35, 1.35, 1.8);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), stone(0x2b2118, 0.55));
  eyeL.position.set(-0.82, 2.55, 1.55);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.82;
  head.add(eyeL, eyeR);
  head.position.set(x, 0, z);
  parent.add(head);
}

/** 吉萨：分层砌石、哈夫拉顶层塔拉灰岩、狮身人面像与堤道。 */
export function createGiza(kit: SurfaceKit) {
  const root = new THREE.Group();
  const lime = mapped(kit.pyramid, { roughness: 0.88, metersPerTile: 8, bumpScale: 0.55 });
  const aged = mapped(kit.pyramid, { color: 0xe8c080, roughness: 0.9, metersPerTile: 7 });
  const pale = mapped(kit.tura, { roughness: 0.62, metersPerTile: 6, bumpScale: 0.12 });
  const sand = mapped(kit.desert, { roughness: 0.96, metersPerTile: 14, bumpScale: 0.22 });
  const sphinxMat = mapped(kit.pyramid, { color: 0xe2c070, roughness: 0.86, metersPerTile: 5 });
  const khafreMat = mapped(kit.pyramid, { color: 0xf0d090, roughness: 0.86, metersPerTile: 8 });
  const menkaureMat = mapped(kit.pyramid, { color: 0xe8c070, roughness: 0.88, metersPerTile: 6 });

  coursedPyramid(root, lime, 230.3, 138.8, 26, 0, 0);
  for (let i = 0; i < 3; i++) {
    const s = 230.3 - i * 6.4;
    const layer = new THREE.Mesh(frustumGeo(s, s - 5.2, 1.35), pale);
    layer.position.y = i * 1.38;
    root.add(layer);
  }
  box(root, stone(0x3a2a18, 0.95), 3.6, 5.4, 8.5, 0, 16, -112);
  templeCourt(root, aged, sand, 52, 40, 148, 0);
  box(root, aged, 8, 2.2, 118, 78, 0, 0);

  const khafreX = -325;
  const khafreZ = -344;
  const khafreBase = new THREE.Mesh(new THREE.BoxGeometry(215.3, 10, 215.3), aged);
  khafreBase.position.set(khafreX, 5, khafreZ);
  root.add(khafreBase);
  coursedPyramid(root, khafreMat, 215.3, 136.4, 24, khafreX, khafreZ, 10);
  const khafreCap = new THREE.Mesh(pyramidGeo(48, 28), pale);
  khafreCap.position.set(khafreX, 10 + 136.4 - 16, khafreZ);
  root.add(khafreCap);
  box(root, aged, 9, 3.2, 210, khafreX + 118, 10, khafreZ + 40);

  const menkaureX = -566;
  const menkaureZ = -746;
  coursedPyramid(root, menkaureMat, 102.2, 65, 16, menkaureX, menkaureZ);
  for (const [dx, s] of [
    [-32, 31.5],
    [2, 31.2],
    [36, 21.7],
  ] as const) {
    coursedPyramid(root, aged, s, s * 0.62, 8, menkaureX + dx, menkaureZ - 78);
  }

  for (const [x, s] of [
    [-18, 45.5],
    [29, 47.4],
    [76, 43.7],
  ] as const) {
    coursedPyramid(root, aged, s, s * 0.62, 8, x, -148);
  }

  for (const [dx, dz] of [
    [-40, 128],
    [40, 128],
    [-40, 148],
    [40, 148],
  ] as const) {
    box(root, stone(0x6a5438, 0.96), 48, 0.7, 6.4, dx, -0.15, dz);
  }

  // 狮身人面像（Great Sphinx of Giza）：按埃及吉萨实景重构法老尼姆斯头巾、巨爪、记梦碑与围岩地基
  const sphinx = new THREE.Group();

  // 采石围坑岩壁（Sphinx Enclosure Trench Walls）
  const trenchMat = mapped(kit.pyramid, { color: 0xc8a46e, roughness: 0.94, metersPerTile: 6 });
  box(sphinx, trenchMat, 38, 7.5, 3.5, 0, 0, -42); // 后岩壁
  box(sphinx, trenchMat, 3.5, 6.8, 92, -18, 0, 4); // 左侧岩壁
  box(sphinx, trenchMat, 3.5, 6.8, 92, 18, 0, 4);  // 右侧岩壁

  // 狮身后臀与躯干
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(12.5, 18, 14), sphinxMat);
  haunch.scale.set(1.25, 0.82, 1.45);
  haunch.position.set(0, 10.2, -18);
  sphinx.add(haunch);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(9.6, 32, 10, 16), sphinxMat);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1.15, 1.0, 0.88);
  body.position.set(0, 10.4, 3);
  sphinx.add(body);

  // 狮子后腿侧肌肉
  box(sphinx, sphinxMat, 8.5, 7.8, 12, -9.2, 0, -22);
  box(sphinx, sphinxMat, 8.5, 7.8, 12, 9.2, 0, -22);

  // 卷曲尾巴（盘在右侧臀旁）
  const tail = new THREE.Mesh(new THREE.TorusGeometry(8.8, 1.15, 8, 16, Math.PI * 0.75), sphinxMat);
  tail.rotation.set(Math.PI / 2, 0, Math.PI / 5);
  tail.position.set(8.8, 8.4, -28);
  sphinx.add(tail);

  // 狮子雄伟前胸
  box(sphinx, sphinxMat, 17.5, 16.5, 14, 0, 12.0, 28);

  // 伸展前爪（长达 18 米的巨型石砌双爪与爪趾）
  for (const side of [-1, 1]) {
    // 粗壮前臂
    box(sphinx, sphinxMat, 5.8, 5.2, 22, side * 7.5, 0, 31);
    // 爪端掌心
    box(sphinx, sphinxMat, 5.2, 4.4, 8, side * 7.5, 0, 46);
    // 三根分明的狮爪趾
    for (const claw of [-1.6, 0, 1.6]) {
      const digit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 4.8), sphinxMat);
      digit.position.set(side * 7.5 + claw, 1.4, 52.2);
      sphinx.add(digit);
    }
  }

  // 双爪间的法老记梦碑（Dream Stele of Thutmose IV）
  const steleMat = mapped(kit.pyramid, { color: 0x9b5d45, roughness: 0.82 }); // 红色花岗岩
  const stele = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6.5, 0.85), steleMat);
  stele.position.set(0, 3.25, 42.5);
  sphinx.add(stele);
  const steleTop = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.85, 16), steleMat);
  steleTop.rotation.x = Math.PI / 2;
  steleTop.position.set(0, 6.5, 42.5);
  sphinx.add(steleTop);

  // 法老头部与尼姆斯头巾（Nemes Headdress）
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.8, 6.2, 16), sphinxMat);
  neck.position.set(0, 20.5, 33);
  sphinx.add(neck);

  // 头颅主体
  const head = new THREE.Mesh(new THREE.SphereGeometry(6.2, 20, 16), pale);
  head.scale.set(0.9, 1.15, 0.88);
  head.position.set(0, 26.2, 34);
  sphinx.add(head);

  // 尼姆斯头巾顶部圆弧包覆与额头圣蛇
  const nemesTop = new THREE.Mesh(new THREE.SphereGeometry(6.6, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), sphinxMat);
  nemesTop.scale.set(0.96, 1.12, 0.94);
  nemesTop.position.set(0, 26.8, 33.6);
  sphinx.add(nemesTop);

  // 额头王权圣蛇（Uraeus）
  const uraeus = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 6), stone(0xc9a84c, 0.4));
  uraeus.rotation.x = Math.PI / 4;
  uraeus.position.set(0, 31.8, 39.5);
  sphinx.add(uraeus);

  // 尼姆斯头巾垂落双肩的两侧宽翼折巾（Lappets）
  for (const side of [-1, 1]) {
    const lappet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 14.5, 3.6), sphinxMat);
    lappet.rotation.z = side * -0.08;
    lappet.position.set(side * 6.5, 21.0, 36.2);
    sphinx.add(lappet);

    // 巾带条纹棱
    for (let h = 0; h < 5; h++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 3.8), stone(0x3a2e22, 0.85));
      stripe.position.set(side * 6.5, 15.5 + h * 2.4, 36.2);
      sphinx.add(stripe);
    }
  }

  // 庄严法老面容
  const pharaohNose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.4, 6), pale);
  pharaohNose.rotation.x = Math.PI / 2;
  pharaohNose.position.set(0, 26.2, 39.8);
  sphinx.add(pharaohNose);

  const pharaohEyes = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), stone(0x2a1c12, 0.6));
  pharaohEyes.scale.set(1.4, 0.7, 0.5);
  pharaohEyes.position.set(-2.2, 27.2, 39.2);
  const pharaohEyesR = pharaohEyes.clone();
  pharaohEyesR.position.x = 2.2;
  sphinx.add(pharaohEyes, pharaohEyesR);

  // 仪式假胡须残存底座
  box(sphinx, sphinxMat, 2.2, 3.4, 1.8, 0, 20.8, 38.6);

  // 狮身人面像神庙遗址门廊（Sphinx Temple Ruins in front of paws）
  const templeMat = mapped(kit.pyramid, { color: 0xd8b276, roughness: 0.92 });
  box(sphinx, templeMat, 32, 4.5, 18, 0, 0, 68);
  for (const px of [-12, -4, 4, 12]) {
    for (const pz of [62, 74]) {
      cyl(sphinx, templeMat, 1.2, 1.4, 6.2, px, 0, pz, 8);
    }
  }

  sphinx.position.set(345, 0, -436);
  sphinx.rotation.y = Math.PI / 2;
  root.add(sphinx);
  templeCourt(root, aged, sand, 36, 28, 410, -436);
  return root;
}

function addWatchTower(
  parent: THREE.Object3D,
  brick: Mat,
  brickDark: Mat,
  tile: Mat,
  withHut: boolean,
) {
  const tower = new THREE.Group();
  // 骑墙敌楼：横向突出墙外，两层砖砌，顶上垛口；多数无歇山顶。
  box(tower, brick, 13.4, 8.5, 10.4, 0, 0, 0);
  box(tower, brick, 12.8, 5.2, 10.0, 0, 8.5, 0);
  box(tower, brickDark, 13.0, 0.32, 10.2, 0, 8.5, 0);
  const walkDoorA = new THREE.Mesh(archSlab(2.5, 3.6, 1.15, 0.5), brickDark);
  walkDoorA.position.set(0, 8.55, -5.15);
  tower.add(walkDoorA);
  const walkDoorB = walkDoorA.clone();
  walkDoorB.position.z = 5.15;
  tower.add(walkDoorB);
  const sideDoorA = new THREE.Mesh(archSlab(2.3, 3.5, 1.15, 0.48), brickDark);
  sideDoorA.position.set(-6.7, 0.7, 0);
  sideDoorA.rotation.y = Math.PI / 2;
  tower.add(sideDoorA);
  const sideDoorB = sideDoorA.clone();
  sideDoorB.position.x = 6.7;
  tower.add(sideDoorB);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const face = new THREE.Group();
    const zFace = yaw % Math.PI === 0 ? -5.2 : -6.55;
    for (const x of [-2.7, 0, 2.7]) {
      box(face, brickDark, 0.62, 1.4, 0.42, x, 2.15, zFace);
      box(face, brickDark, 0.62, 1.3, 0.42, x, 10.05, zFace + 0.12);
    }
    face.rotation.y = yaw;
    tower.add(face);
  }
  box(tower, brick, 12.6, 0.4, 9.8, 0, 13.7, 0);
  squareParapet(tower, brickDark, 12.6, 14.1, 0.7, 0.9, 1.45);
  if (withHut) {
    hardGableHut(tower, brick, brickDark, tile, 5.6, 4.2, 14.1, 2.9);
  }
  parent.add(tower);
  return tower;
}

function addBeaconTower(parent: THREE.Object3D, brick: Mat, brickDark: Mat, earth: Mat) {
  const beacon = new THREE.Group();
  // 独立墩台/烽火台：收分实心台、羊马墙、垛口与烟笼，不是歇山敌楼。
  const mound = new THREE.Mesh(frustumGeo(28, 18.5, 4.2), earth);
  beacon.add(mound);
  const lower = new THREE.Mesh(frustumGeo(16.8, 12.2, 7.4), brick);
  lower.position.y = 4.2;
  beacon.add(lower);
  const upper = new THREE.Mesh(frustumGeo(12.0, 9.2, 6.2), brick);
  upper.position.y = 11.6;
  beacon.add(upper);
  for (const [cy, s] of [
    [6.4, 15.6],
    [9.6, 13.8],
    [13.4, 11.6],
    [16.6, 10.2],
  ] as const) {
    box(beacon, brickDark, s, 0.36, s, 0, cy, 0);
  }
  box(beacon, brick, 9.4, 0.42, 9.4, 0, 17.8, 0);
  squareParapet(beacon, brickDark, 9.4, 18.22, 0.68, 0.9, 1.42);
  box(beacon, brick, 3.8, 2.6, 3.4, 0, 18.22, 0.15);
  box(beacon, brickDark, 0.95, 1.25, 0.35, 0, 18.7, -1.5);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    cyl(beacon, brickDark, 0.16, 0.2, 1.45, sx * 2.95, 18.22, sz * 2.95, 8);
    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.38, 0.62, 8, 1, true),
      brickDark,
    );
    basket.position.set(sx * 2.95, 20.0, sz * 2.95);
    beacon.add(basket);
  }
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const face = new THREE.Group();
    box(face, brickDark, 0.5, 1.25, 0.38, -1.55, 8.6, -7.35);
    box(face, brickDark, 0.5, 1.25, 0.38, 1.55, 8.6, -7.35);
    box(face, brickDark, 0.48, 1.15, 0.38, 0, 14.2, -5.45);
    face.rotation.y = yaw;
    beacon.add(face);
  }
  const yard = 21.5;
  const yardH = 4.2;
  const yardT = 1.15;
  box(beacon, brick, yard, yardH, yardT, 0, 0.35, -(yard / 2) + yardT / 2);
  box(beacon, brick, yard, yardH, yardT, 0, 0.35, yard / 2 - yardT / 2);
  box(beacon, brick, yardT, yardH, yard - yardT * 2, -(yard / 2) + yardT / 2, 0.35, 0);
  box(beacon, brick, yardT, yardH, 6.6, yard / 2 - yardT / 2, 0.35, -5.8);
  box(beacon, brick, yardT, yardH, 6.6, yard / 2 - yardT / 2, 0.35, 5.8);
  const gate = new THREE.Mesh(archSlab(2.6, 3.3, 1.25, 0.42), brickDark);
  gate.position.set(yard / 2 - 0.2, 0.45, 0);
  gate.rotation.y = Math.PI / 2;
  beacon.add(gate);
  // A narrow coping course and regularly spaced drainage/scupper openings
  // break up the otherwise monolithic beacon walls at close viewing distances.
  box(beacon, brickDark, yard + 0.35, 0.34, yardT + 0.22, 0, 4.55, -yard / 2 + yardT / 2);
  box(beacon, brickDark, yard + 0.35, 0.34, yardT + 0.22, 0, 4.55, yard / 2 - yardT / 2);
  for (const x of [-7.2, -3.6, 3.6, 7.2]) {
    box(beacon, brickDark, 0.62, 0.32, 0.12, x, 2.4, -yard / 2 - 0.02);
    box(beacon, brickDark, 0.62, 0.32, 0.12, x, 2.4, yard / 2 + 0.02);
  }
  parent.add(beacon);
  return beacon;
}

/** 长城：梯形墙身、外垛口内宇墙、骑墙敌楼，峰顶另立收分烽火台。 */
export function createGreatWall(kit: SurfaceKit) {
  const root = new THREE.Group();
  const brick = mapped(kit.wall, {
    roughness: 0.94,
    metersPerTile: 2.6,
    invertBump: true,
    bumpScale: 0.45,
  });
  const brickDark = mapped(kit.wall, {
    color: 0xb08068,
    roughness: 0.95,
    metersPerTile: 2.4,
    invertBump: true,
  });
  const tile = mapped(kit.roofTile, { roughness: 0.78, metersPerTile: 2.2, bumpScale: 0.55 });
  const earth = mapped(kit.wall, {
    color: 0x8a7358,
    roughness: 0.97,
    metersPerTile: 4.5,
    invertBump: true,
    bumpScale: 0.3,
  });

  const length = 640;
  const segments = 36;
  const wallH = 8.6;
  const dummy = new THREE.Object3D();
  const merlonGeo = new THREE.BoxGeometry(1.05, 1.7, 1.35);
  const merlons = new THREE.InstancedMesh(merlonGeo, brickDark, segments * 6);
  let merlonIndex = 0;

  const path = (t: number) => {
    const z = -length / 2 + t * length;
    const x = Math.sin(t * Math.PI * 1.62) * 36 + Math.sin(t * Math.PI * 3.35) * 11;
    const y =
      Math.pow(Math.sin(t * Math.PI * 2.08), 2) * 21 +
      Math.pow(Math.sin(t * Math.PI * 3.55 + 0.55), 2) * 9;
    return { x, y, z };
  };

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const p0 = path(t0);
    const p1 = path(t1);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;
    const horiz = Math.hypot(dx, dz);
    const seg = Math.hypot(horiz, dy);
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, horiz);
    const mesh = new THREE.Mesh(trapWallGeo(seg + 0.55, wallH, 7.4, 5.2), brick);
    mesh.position.set((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
    mesh.rotation.set(pitch, yaw, 0, "YXZ");
    root.add(mesh);

    const walk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, seg), brickDark);
    walk.position.set((p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + wallH + 0.12, (p0.z + p1.z) / 2);
    walk.rotation.set(pitch, yaw, 0, "YXZ");
    root.add(walk);

    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.15, seg), brickDark);
    inner.position.set(
      (p0.x + p1.x) / 2 - Math.cos(yaw) * 2.15,
      (p0.y + p1.y) / 2 + wallH + 0.7,
      (p0.z + p1.z) / 2 + Math.sin(yaw) * 2.15,
    );
    inner.rotation.set(pitch, yaw, 0, "YXZ");
    root.add(inner);

    for (const side of [-2.55, 2.55]) {
      dummy.position.set(
        (p0.x + p1.x) / 2 + Math.cos(yaw) * side,
        (p0.y + p1.y) / 2 + wallH + 0.95,
        (p0.z + p1.z) / 2 - Math.sin(yaw) * side,
      );
      dummy.rotation.set(pitch, yaw, 0, "YXZ");
      dummy.updateMatrix();
      merlons.setMatrixAt(merlonIndex++, dummy.matrix);
    }

    if (i % 5 === 0) {
      const tower = addWatchTower(root, brick, brickDark, tile, i === 10 || i === 25);
      tower.position.set(p0.x, p0.y, p0.z);
      tower.rotation.y = yaw;
    }

    if (i === 4 || i === 13 || i === 22 || i === 31) {
      const beacon = addBeaconTower(root, brick, brickDark, earth);
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      const midZ = (p0.z + p1.z) / 2;
      const px = Math.cos(yaw);
      const pz = -Math.sin(yaw);
      const p2 = path(Math.min(t1 + 2 / segments, 1));
      const towardX = (p0.x + p1.x + p2.x) / 3 - midX;
      const towardZ = (p0.z + p1.z + p2.z) / 3 - midZ;
      const sign = px * towardX + pz * towardZ > 0 ? -1 : 1;
      const outward = 52;
      beacon.position.set(midX + px * outward * sign, midY + 2.6, midZ + pz * outward * sign);
      beacon.rotation.y = yaw;
    }
  }
  merlons.count = merlonIndex;
  merlons.instanceMatrix.needsUpdate = true;
  root.add(merlons);
  return root;
}

/** 佩特拉宝库：六柱下层、破山花、圆形神龛、两侧峡谷。 */
export function createPetra(kit: SurfaceKit) {
  const root = new THREE.Group();
  const cliff = mapped(kit.petra, { color: 0xc07060, roughness: 0.97, metersPerTile: 7, bumpScale: 0.7 });
  const sand = mapped(kit.petra, { roughness: 0.86, metersPerTile: 5.5, bumpScale: 0.45 });
  const sandLight = mapped(kit.petra, { color: 0xffc8b0, roughness: 0.82, metersPerTile: 4.5 });
  const dark = mapped(kit.petra, { color: 0x6a3028, roughness: 0.93, metersPerTile: 4 });
  const band = mapped(kit.petra, { color: 0xd08058, roughness: 0.95, metersPerTile: 8, bumpScale: 0.8 });

  box(root, cliff, 92, 96, 30, 0, 0, 22);
  box(root, cliff, 38, 110, 44, -62, 0, 14);
  box(root, cliff, 38, 104, 44, 62, 0, 16);
  for (const [x, h, z] of [
    [-46, 18, 18],
    [-22, 28, 20],
    [8, 16, 18],
    [32, 24, 20],
    [50, 14, 16],
  ] as const) {
    box(root, cliff, 16, h, 12, x, 88, z);
  }
  for (let i = 0; i < 8; i++) {
    box(root, band, 88, 1.1, 2.2, 0, 8 + i * 9.5, -1.6);
  }

  box(root, sand, 28, 24, 6.4, 0, 2.4, -4);
  for (let i = 0; i < 12; i++) {
    box(root, sandLight, 26 - i * 0.15, 0.22, 4.8, 0, i * 0.2, -7.4);
  }
  for (let i = 0; i < 6; i++) {
    const x = -12.5 + i * 5;
    column(root, sandLight, 18.5, 0.95, x, 4.6, -7.2);
    // Fine, shallow vertical grooves on the visible face suggest hand-carved fluting.
    for (let flute = -2; flute <= 2; flute++) {
      box(root, band, 0.055, 12.8, 0.045, x + flute * 0.24, 7.0, -8.13);
    }
  }
  // Repeated shallow relief blocks along the entablature add the rhythmic carved
  // ornament visible on Nabataean rock-cut façades without overwhelming the silhouette.
  for (let i = 0; i < 13; i++) {
    const x = -12.0 + i * 2.0;
    box(root, band, 0.72, 1.05, 0.38, x, 23.35, -7.72);
    box(root, sandLight, 0.9, 0.16, 0.48, x, 24.0, -7.76);
  }
  box(root, sand, 27.5, 1.8, 6, 0, 23.2, -4.6);
  box(root, sand, 27.5, 0.9, 5.8, 0, 25, -4.6);
  box(root, dark, 6.4, 11.5, 2.2, 0, 4.8, -7.6);
  const doorPed = new THREE.Mesh(pyramidGeo(8.4, 2.8), sand);
  doorPed.position.set(0, 16.6, -7.2);
  doorPed.scale.set(1, 1, 0.16);
  root.add(doorPed);
  box(root, dark, 3.8, 7.2, 1.5, -9.2, 5.2, -7.4);
  box(root, dark, 3.8, 7.2, 1.5, 9.2, 5.2, -7.4);

  const ped = new THREE.Mesh(pyramidGeo(16, 5.2), sand);
  ped.position.set(0, 26.2, -4.2);
  ped.scale.set(1, 1, 0.18);
  root.add(ped);

  box(root, sand, 11.5, 12, 5.4, -11.2, 27.2, -3.8);
  box(root, sand, 11.5, 12, 5.4, 11.2, 27.2, -3.8);
  const leftPed = new THREE.Mesh(pyramidGeo(12, 4.6), sand);
  leftPed.position.set(-11.2, 39.2, -3.8);
  leftPed.scale.set(1, 1, 0.18);
  root.add(leftPed);
  const rightPed = new THREE.Mesh(pyramidGeo(12, 4.6), sand);
  rightPed.position.set(11.2, 39.2, -3.8);
  rightPed.scale.set(1, 1, 0.18);
  root.add(rightPed);
  box(root, dark, 3.2, 6.4, 1.3, -11.2, 28.4, -6.4);
  box(root, dark, 3.2, 6.4, 1.3, 11.2, 28.4, -6.4);
  const aedL = new THREE.Mesh(pyramidGeo(4.4, 1.6), sand);
  aedL.position.set(-11.2, 35, -6.2);
  aedL.scale.set(1, 1, 0.2);
  root.add(aedL);
  const aedR = aedL.clone();
  aedR.position.x = 11.2;
  root.add(aedR);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    column(root, sandLight, 10.5, 0.55, Math.cos(a) * 4.4, 27.2, -5.6 + Math.sin(a) * 1.4);
  }
  cyl(root, sand, 4.4, 4.4, 10.5, 0, 27.2, -5.6, 18);
  const tholos = new THREE.Mesh(onionLathe(5.2, 8.2, 20), sandLight);
  tholos.position.set(0, 37.8, -5.6);
  root.add(tholos);
  cyl(root, sandLight, 0.55, 0.9, 2.8, 0, 45.8, -5.6, 8);
  const urn = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), sandLight);
  urn.position.set(0, 49.4, -5.6);
  root.add(urn);
  cyl(root, sandLight, 0.35, 0.55, 1.4, 0, 50.4, -5.6, 8);

  box(root, sand, 18, 1.2, 22, 0, 0, -18);
  return root;
}

function intactOuter(i: number, count: number) {
  const t = i / count;
  // 北侧完整的四层壮丽拱券弧面 (t 沿 0° ~ 180° 分布，对应 z <= 0 北半球)
  return t <= 0.52 || t >= 0.98;
}

/** 斗兽场：严格朝向北侧的完整四层叠柱式、残缺南看台、地宫角斗网格与瓦拉迪尔砖砌扶壁。 */
export function createColosseum(kit: SurfaceKit) {
  const root = new THREE.Group();
  const travertine = mapped(kit.colosseum, {
    color: 0xf4e6ce,
    roughness: 0.82,
    metersPerTile: 4.2,
    bumpScale: 0.55,
  });
  const trim = mapped(kit.colosseum, { color: 0xead5b4, roughness: 0.85, metersPerTile: 4 });
  const seatMat = mapped(kit.colosseum, { color: 0xdebfa0, roughness: 0.9, metersPerTile: 5 });
  const brickSpurMat = mapped(kit.wall, { color: 0xba7654, roughness: 0.92, metersPerTile: 3.5 });
  const voidMat = stone(0x2b1c14, 0.98);
  const sand = mapped(kit.arena, { color: 0xe5c898, roughness: 0.94, metersPerTile: 8, bumpScale: 0.2 });

  // 1. 北侧完整的 48.5 米高四层外圈立面 (a 从 -0.04PI 到 1.04PI，z <= 0 朝向北侧帝国大道)
  const a0 = -0.04 * Math.PI;
  const a1 = 1.04 * Math.PI;
  root.add(new THREE.Mesh(extrudeY(partialRing(96, 80, 88, 73, a0, a1, 56), 48.5), travertine));

  // 2. 南侧残缺外墙只升至两层高度 (~31米)，展露内圈看台
  root.add(new THREE.Mesh(extrudeY(ring(88, 73, 62, 50, 56), 31.5), travertine));

  // 3. 东西两侧著名的斯泰恩 (Stern) 与瓦拉迪尔 (Valadier) 19世纪砖砌大三角斜撑扶壁
  // 东侧断口扶壁 (x ~ +94m)
  const eastSpurGeo = new THREE.BufferGeometry();
  const eastSpurPts = new Float32Array([
    95, 0, -4,   95, 48.5, -4,   95, 0, 8,
    91, 0, -4,   91, 48.5, -4,   91, 0, 8,
    95, 0, -4,   91, 0, -4,      95, 48.5, -4,
    91, 0, -4,   91, 48.5, -4,   95, 48.5, -4,
    95, 48.5, -4, 91, 48.5, -4,  95, 0, 8,
    91, 48.5, -4, 91, 0, 8,      95, 0, 8,
  ]);
  eastSpurGeo.setAttribute("position", new THREE.BufferAttribute(eastSpurPts, 3));
  eastSpurGeo.computeVertexNormals();
  root.add(new THREE.Mesh(eastSpurGeo, brickSpurMat));

  // 西侧断口扶壁 (x ~ -94m)
  const westSpurGeo = new THREE.BufferGeometry();
  const westSpurPts = new Float32Array([
    -95, 0, -4,   -95, 0, 8,   -95, 48.5, -4,
    -91, 0, -4,   -91, 0, 8,   -91, 48.5, -4,
    -95, 0, -4,   -95, 48.5, -4, -91, 0, -4,
    -91, 0, -4,   -95, 48.5, -4, -91, 48.5, -4,
    -95, 48.5, -4, -95, 0, 8,   -91, 48.5, -4,
    -91, 48.5, -4, -95, 0, 8,   -91, 0, 8,
  ]);
  westSpurGeo.setAttribute("position", new THREE.BufferAttribute(westSpurPts, 3));
  westSpurGeo.computeVertexNormals();
  root.add(new THREE.Mesh(westSpurGeo, brickSpurMat));

  // 4. 内圈三层走廊拱券网格
  const dummy = new THREE.Object3D();
  const midArchGeo = archSlab(3.8, 7.6, 2.5, 0.95);
  const innerLevels = [
    { y: 2.2, count: 64, rx: 87.2, rz: 72.2 },
    { y: 15.6, count: 64, rx: 87.2, rz: 72.2 },
    { y: 28.6, count: 60, rx: 87.0, rz: 72.0 },
  ];
  let innerTotal = 0;
  for (const level of innerLevels) innerTotal += level.count;
  const innerFacade = new THREE.InstancedMesh(midArchGeo, voidMat, innerTotal);
  let k = 0;
  for (const level of innerLevels) {
    for (let i = 0; i < level.count; i++) {
      const a = (i / level.count) * Math.PI * 2;
      const x = Math.cos(a) * level.rx;
      const z = -Math.sin(a) * level.rz;
      dummy.position.set(x, level.y, z);
      dummy.lookAt(0, level.y, 0);
      dummy.updateMatrix();
      innerFacade.setMatrixAt(k++, dummy.matrix);
    }
  }
  root.add(innerFacade);

  // 5. 北侧第四层阁楼实墙与檐口 (Attic story & cornices)
  const attic = new THREE.Mesh(extrudeY(partialRing(96.8, 80.8, 90, 74.5, a0, a1, 44), 8.2), trim);
  attic.position.y = 48.5;
  root.add(attic);

  for (const y of [13.2, 25.2, 37.2]) {
    const cornice = new THREE.Mesh(extrudeY(partialRing(97.2, 81.2, 95, 79, a0, a1, 44), 0.7), trim);
    cornice.position.y = y;
    root.add(cornice);
  }

  // 6. 梯级椭圆看台 (Cavea Seating Tiers, 阶梯层层向内向下收紧)
  const podium = new THREE.Mesh(extrudeY(ring(36, 28, 32.2, 25, 48), 4.8), trim);
  podium.position.y = 1.5;
  root.add(podium);

  const cavea = [
    { ox: 62, oz: 50, ix: 54, iz: 43.6, y: 2.0, h: 2.5 },
    { ox: 54, oz: 43.6, ix: 47, iz: 38, y: 4.5, h: 2.6 },
    { ox: 47, oz: 38, ix: 41, iz: 33.2, y: 7.1, h: 2.7 },
    { ox: 41, oz: 33.2, ix: 36, iz: 28.4, y: 9.8, h: 2.8 },
    { ox: 62, oz: 50, ix: 56, iz: 45.2, y: 12.8, h: 3.2 },
    { ox: 72, oz: 58.5, ix: 62, iz: 50, y: 16.2, h: 3.4 },
    { ox: 82, oz: 66.5, ix: 72, iz: 58.5, y: 19.8, h: 3.6 },
    { ox: 90, oz: 74, ix: 82, iz: 66.5, y: 23.6, h: 3.8 },
  ];
  for (const step of cavea) {
    const mesh = new THREE.Mesh(extrudeY(ring(step.ox, step.oz, step.ix, step.iz, 52), step.h), seatMat);
    mesh.position.y = step.y;
    root.add(mesh);
  }

  // 7. 地宫角斗士通道与猛兽升降井 (Hypogeum Subterranean Labyrinth)
  for (let ix = -4; ix <= 4; ix++) {
    box(root, voidMat, 0.7, 3.6, 46, ix * 6.4, 0, 0);
  }
  for (let iz = -3; iz <= 3; iz++) {
    box(root, voidMat, 58, 3.6, 0.7, 0, 0, iz * 6.2);
  }

  // 角斗场地面：东侧重建木结构沙土地面 (Arena Sand Floor, x > 0)，西侧露出地宫石墙迷宫 (x < 0)
  const floorShape = new THREE.Shape();
  floorShape.moveTo(0, -22);
  floorShape.absellipse(0, 0, 36, 22, -Math.PI / 2, Math.PI / 2, false, 0);
  floorShape.lineTo(0, -22);
  const floorGeo = new THREE.ShapeGeometry(floorShape, 32);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, sand);
  floor.position.y = 1.4;
  root.add(floor);

  // 8. 放射状出入通道 (Vomitoria & radial aisles)
  for (let i = 0; i < 8; i++) {
    const aisle = new THREE.Group();
    box(aisle, voidMat, 3.4, 3.2, 24, 0, 2.0, -48);
    box(aisle, trim, 0.65, 3.6, 24, -2.0, 2.0, -48);
    box(aisle, trim, 0.65, 3.6, 24, 2.0, 2.0, -48);
    aisle.rotation.y = (i * Math.PI) / 4;
    root.add(aisle);
  }

  // 9. 北侧完整的 1~3 层叠柱式拱门与立柱 (Doric, Ionic, Corinthian tiers on North facade)
  const archGeo = archSlab(4.2, 8.6, 3.2, 1.0);
  const levels = [
    { y: 2.1, count: 80, rx: 95.5, rz: 79.5, rCol: 0.55 },
    { y: 15.6, count: 80, rx: 95.5, rz: 79.5, rCol: 0.5 },
    { y: 28.4, count: 76, rx: 95.3, rz: 79.3, rCol: 0.48 },
  ];
  let total = 0;
  for (const level of levels) {
    for (let i = 0; i < level.count; i++) if (intactOuter(i, level.count)) total += 1;
  }
  const arches = new THREE.InstancedMesh(archGeo, voidMat, total);
  const frames = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.48, 0.55, 11.5, 8), trim, total);
  let n = 0;
  for (const level of levels) {
    for (let i = 0; i < level.count; i++) {
      if (!intactOuter(i, level.count)) continue;
      const a = (i / level.count) * Math.PI * 2;
      const x = Math.cos(a) * level.rx;
      const z = -Math.sin(a) * level.rz;
      dummy.position.set(x, level.y, z);
      dummy.lookAt(0, level.y, 0);
      dummy.updateMatrix();
      arches.setMatrixAt(n, dummy.matrix);
      dummy.position.set(x * 0.993, level.y + 5.6, z * 0.993);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      frames.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
  }
  root.add(arches);
  root.add(frames);

  // 10. 第四层遮阳帆布（Velarium）木桅杆石制插座与窗孔
  for (let i = 0; i < 40; i++) {
    if (!intactOuter(i, 40)) continue;
    const a = (i / 40) * Math.PI * 2;
    const x = Math.cos(a) * 93.6;
    const z = -Math.sin(a) * 77.6;
    if (i % 2 === 0) {
      box(root, voidMat, 2.4, 3.4, 1.2, x, 50.2, z);
    } else {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.35, 16), trim);
      disc.rotation.z = Math.PI / 2;
      disc.position.set(Math.cos(a) * 96.2, 52.6, -Math.sin(a) * 80.2);
      disc.lookAt(0, 52.6, 0);
      root.add(disc);
    }
  }

  // 皇帝包厢 (Pulvinar) 位于南看台中轴
  const boxSeat = new THREE.Group();
  box(boxSeat, trim, 16, 7.2, 9, 0, 11.5, 48);
  box(boxSeat, voidMat, 8, 4.4, 1.4, 0, 13.2, 44);
  box(boxSeat, trim, 17.2, 1.1, 10.2, 0, 18.7, 48);
  root.add(boxSeat);

  // 桅杆支座柱
  for (let i = 0; i < 24; i++) {
    if (!intactOuter(i, 24)) continue;
    const a = (i / 24) * Math.PI * 2;
    cyl(root, trim, 0.32, 0.38, 8.5, Math.cos(a) * 94, 56.6, -Math.sin(a) * 78, 8);
  }
  return root;
}

/** 奇琴伊察：九层塔、北向羽蛇、顶庙与大球场。 */
export function createChichenItza(kit: SurfaceKit) {
  const root = new THREE.Group();
  const lime = mapped(kit.chichen, { roughness: 0.9, metersPerTile: 3.6, bumpScale: 0.42 });
  const dark = mapped(kit.chichen, { color: 0xb08050, roughness: 0.9, metersPerTile: 3.2 });
  const accent = mapped(kit.chichen, { color: 0xe8c890, roughness: 0.86, metersPerTile: 3.4 });
  const comb = mapped(kit.chichen, { color: 0xd4a060, roughness: 0.88, metersPerTile: 3 });
  const plaza = mapped(kit.chichen, { color: 0xdcc8a0, roughness: 0.94, metersPerTile: 8 });

  box(root, plaza, 92, 0.55, 92, 0, -0.5, 0);

  let y = 0;
  let size = 55.3;
  for (let i = 0; i < 9; i++) {
    const next = size - 4.35;
    const layer = new THREE.Mesh(frustumGeo(size, next + 0.45, 2.65), i % 2 ? accent : lime);
    layer.position.y = y;
    root.add(layer);
    const inset = size * 0.72;
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const panel = new THREE.Group();
      box(panel, dark, inset * 0.22, 1.55, 0.35, -inset * 0.28, y + 0.45, -size / 2 + 0.15);
      box(panel, dark, inset * 0.22, 1.55, 0.35, inset * 0.28, y + 0.45, -size / 2 + 0.15);
      panel.rotation.y = yaw;
      root.add(panel);
    }
    y += 2.65;
    size = next;
  }

  // 为玛雅库库尔坎金字塔主塔增加四角通天大脊线与棱角过渡
  addPyramidArrisFeatures(root, 55.3, y, 0, 0x2c271e, 0x9a8462);

  box(root, lime, 13.6, 6.4, 13.6, 0, y, 0);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const door = new THREE.Group();
    box(door, dark, 3.4, 4.6, 1.2, 0, y + 0.4, -6.6);
    door.rotation.y = yaw;
    root.add(door);
  }
  cyl(root, dark, 0.45, 0.55, 5.2, -1.6, y + 0.3, -6.4, 8);
  cyl(root, dark, 0.45, 0.55, 5.2, 1.6, y + 0.3, -6.4, 8);
  box(root, comb, 15.8, 4.2, 2.0, 0, y + 6.4, 0);
  for (let i = 0; i < 7; i++) {
    box(root, comb, 1.15, 3.2, 1.4, -6 + i * 2, y + 10.4, 0);
  }

  for (const dir of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const stair = new THREE.Group();
    for (let i = 0; i < 32; i++) {
      box(stair, dark, 8.2, 0.55, 1.15, 0, i * 0.75, -28.8 + i * 0.88);
    }
    box(stair, accent, 1.15, 24, 1.15, -4.7, 0, -15);
    box(stair, accent, 1.15, 24, 1.15, 4.7, 0, -15);
    serpentHead(stair, dark, -4.6, -30.2);
    serpentHead(stair, dark, 4.6, -30.2);
    stair.rotation.y = dir;
    root.add(stair);
  }

  const court = new THREE.Group();
  box(court, lime, 12, 8.2, 96, -22, 0, 0);
  box(court, lime, 12, 8.2, 96, 22, 0, 0);
  box(court, accent, 36, 1.1, 8, 0, 0, -50);
  box(court, accent, 36, 1.1, 8, 0, 0, 50);
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.28, 8, 16), accent);
  ringL.position.set(-16.2, 6.4, 0);
  ringL.rotation.y = Math.PI / 2;
  const ringR = ringL.clone();
  ringR.position.x = 16.2;
  court.add(ringL, ringR);
  court.position.set(-118, 0, 8);
  root.add(court);

  const caracol = new THREE.Group();
  box(caracol, lime, 28, 3.2, 28, 0, 0, 0);
  cyl(caracol, accent, 9.2, 10, 14, 0, 3.2, 0, 22);
  cyl(caracol, lime, 7.0, 7.4, 8, 0, 17.2, 0, 18);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(7.4, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    lime,
  );
  dome.position.set(0, 25.4, 0);
  caracol.add(dome);
  box(caracol, dark, 3.2, 4.4, 1.2, 0, 5.5, -10);
  box(caracol, dark, 2.2, 2.6, 1.1, 3.4, 19, -6.6);
  caracol.position.set(-72, 0, 58);
  root.add(caracol);
  return root;
}

function terraceBand(
  parent: THREE.Object3D,
  material: Mat,
  width: number,
  depth: number,
  y: number,
  z: number,
  bulge = 0,
) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  shape.moveTo(-hw, -hd);
  shape.quadraticCurveTo(0, -hd - bulge, hw, -hd);
  shape.lineTo(hw, hd);
  shape.quadraticCurveTo(0, hd + bulge * 0.4, -hw, hd);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, y, z);
  parent.add(mesh);
}

/** 马丘比丘：梯田、梯形门窗、茅草双坡、太阳神庙与因蒂瓦塔纳。 */
export function createMachuPicchu(kit: SurfaceKit) {
  const root = new THREE.Group();
  const grass = mapped(kit.grass, { roughness: 0.98, metersPerTile: 9, bumpScale: 0.2 });
  const grass2 = mapped(kit.grass, { color: 0xc8e0a0, roughness: 0.97, metersPerTile: 8 });
  const rock = mapped(kit.machu, { roughness: 0.92, metersPerTile: 4.2, bumpScale: 0.55 });
  const roof = mapped(kit.thatch, { roughness: 0.9, metersPerTile: 2.4, bumpScale: 0.5 });
  const dark = mapped(kit.machu, { color: 0x505040, roughness: 0.96, metersPerTile: 3 });
  const peak = mapped(kit.machu, { color: 0x90a080, roughness: 0.96, metersPerTile: 10 });

  for (let i = 0; i < 8; i++) {
    terraceBand(root, i % 2 === 0 ? grass : grass2, 112 - i * 7, 16, i * 2.7, 40 - i * 4.8, 8 - i);
    box(root, rock, 112 - i * 7, 1.6, 0.7, 0, i * 2.7, 40 - i * 4.8 + 8);
  }
  box(root, grass, 46, 1.0, 30, 2, 19.2, 2);

  incaHouse(root, rock, roof, dark, 14, 10, 6.8, -26, 12, 0.1);
  incaHouse(root, rock, roof, dark, 11, 9, 6.2, -10, 18, -0.16);
  incaHouse(root, rock, roof, dark, 16, 11, 7.4, 14, 12, 0.2);
  incaHouse(root, rock, roof, dark, 10, 8, 5.8, 30, 18, -0.26);
  incaHouse(root, rock, roof, dark, 12, 9, 6.4, 6, -4, 0.08);
  incaHouse(root, rock, roof, dark, 9, 7.5, 5.4, -34, 24, 0.38);
  incaHouse(root, rock, roof, dark, 13, 10, 6.6, -18, -10, -0.12);
  incaHouse(root, rock, roof, dark, 8.5, 7.5, 5.2, 26, -8, 0.28);
  incaHouse(root, rock, roof, dark, 11, 8.5, 6, -4, 22, 0.05);
  incaHouse(root, rock, roof, dark, 12, 9, 6.2, 18, 4, -0.1);
  incaHouse(root, rock, roof, dark, 10, 8, 5.8, -14, 6, 0.16);
  incaHouse(root, rock, roof, dark, 9, 8, 5.4, 4, 8, -0.2);

  const sun = new THREE.Group();
  const curve = new THREE.Mesh(
    new THREE.CylinderGeometry(6.4, 6.8, 7.2, 22, 1, false, 0, Math.PI * 1.2),
    rock,
  );
  curve.position.set(0, 3.6, 0);
  sun.add(curve);
  const win = new THREE.Mesh(trapDoorGeo(1.8, 1.2, 2.4, 0.5), dark);
  win.position.set(0, 3.2, -6.4);
  sun.add(win);
  box(sun, rock, 8, 2.2, 8, 0, 0, 1.5);
  sun.position.set(-8, 19.4, -22);
  root.add(sun);

  const three = new THREE.Group();
  box(three, rock, 16, 7.2, 1.8, 0, 0, 0);
  for (const x of [-5.2, 0, 5.2]) {
    const w = new THREE.Mesh(trapDoorGeo(2.6, 1.8, 3.6, 0.5), dark);
    w.position.set(x, 1.6, -0.7);
    three.add(w);
  }
  const threeRoof = new THREE.Mesh(gableRoofGeo(17, 8, 5.2), roof);
  threeRoof.position.set(0, 7.2, 2.4);
  three.add(threeRoof);
  three.position.set(10, 19.4, -20);
  root.add(three);

  const inti = new THREE.Group();
  box(inti, rock, 14, 2.2, 14, 0, 0, 0);
  box(inti, rock, 10, 2.0, 10, 0, 2.2, 0);
  box(inti, rock, 6.5, 1.6, 6.5, 0, 4.2, 0);
  box(inti, rock, 2.4, 1.8, 2.4, 0, 5.8, 0);
  box(inti, rock, 0.9, 1.4, 0.9, 0, 7.6, 0);
  inti.position.set(8, 19.4, -6);
  root.add(inti);

  const huayna = new THREE.Group();
  huayna.add(new THREE.Mesh(new THREE.ConeGeometry(34, 92, 8), peak));
  const shoulder = new THREE.Mesh(new THREE.ConeGeometry(20, 46, 6), peak);
  shoulder.position.set(-16, -6, 10);
  huayna.add(shoulder);
  const knoll = new THREE.Mesh(new THREE.SphereGeometry(15, 10, 8), peak);
  knoll.scale.set(1.35, 0.52, 1);
  knoll.position.set(12, -26, 8);
  huayna.add(knoll);
  huayna.position.set(10, 56, -94);
  root.add(huayna);
  return root;
}

function iwan(parent: THREE.Object3D, marble: Mat, dark: Mat, yaw: number) {
  const g = new THREE.Group();
  const frame = archSlab(15, 24, 5.2, 2.6, true);
  const mesh = new THREE.Mesh(frame, marble);
  mesh.position.set(0, 6.2, -27.4);
  g.add(mesh);
  const inner = new THREE.Mesh(archSlab(11.5, 19, 1.4, 0.25, true), dark);
  inner.position.set(0, 6.8, -29.6);
  g.add(inner);
  const upper = new THREE.Mesh(archSlab(6.4, 8.5, 1.6, 0.7, true), marble);
  upper.position.set(0, 26, -27.6);
  g.add(upper);
  for (const x of [-11.5, 11.5]) {
    const side = new THREE.Mesh(archSlab(5.2, 8.2, 1.8, 0.7, true), marble);
    side.position.set(x, 7.2, -27.2);
    g.add(side);
    const side2 = side.clone();
    side2.position.y = 17.4;
    g.add(side2);
  }
  g.rotation.y = yaw;
  parent.add(g);
}

function minaret(parent: THREE.Object3D, marble: Mat, inlay: Mat, x: number, z: number) {
  const g = new THREE.Group();
  cyl(g, marble, 2.05, 2.5, 16, 0, 0, 0, 16);
  box(g, inlay, 6.0, 1.0, 6.0, 0, 16, 0);
  cyl(g, marble, 1.7, 2.05, 12, 0, 17, 0, 16);
  box(g, inlay, 5.2, 0.9, 5.2, 0, 29, 0);
  cyl(g, marble, 1.25, 1.7, 10, 0, 29.9, 0, 16);
  box(g, inlay, 4.4, 0.8, 4.4, 0, 39.9, 0);
  const cap = new THREE.Mesh(onionLathe(3.2, 5.0, 14), marble);
  cap.position.set(0, 40.8, 0);
  g.add(cap);
  cyl(g, gold(), 0.12, 0.2, 2.4, 0, 45.6, 0, 6);
  const lean = 0.028;
  g.position.set(x, 5, z);
  g.rotation.z = x > 0 ? lean : -lean;
  g.rotation.x = z > 0 ? -lean : lean;
  parent.add(g);
}

/** 泰姬陵：切角立方、四向伊旺、红砂岩清真寺与向外倾斜宣礼塔。 */
export function createTajMahal(kit: SurfaceKit) {
  const root = new THREE.Group();
  const marble = mapped(kit.marble, {
    // Finer marble veining and a restrained relief keep the surface readable
    // at close range without making the white stone look coarse.
    roughness: 0.4,
    metalness: 0.025,
    metersPerTile: 3.8,
    bumpScale: 0.16,
    clearcoat: 0.18,
  });
  const inlay = mapped(kit.marble, {
    // Slightly warmer, finer-grained stone separates the carved borders
    // from the main marble instead of reading as one flat white material.
    color: 0xe7d7bf,
    roughness: 0.48,
    metalness: 0.015,
    metersPerTile: 3.2,
    bumpScale: 0.1,
    clearcoat: 0.12,
  });
  const dark = mapped(kit.marble, { color: 0x6a5a50, roughness: 0.88, metersPerTile: 4 });
  const red = mapped(kit.redSandstone, { roughness: 0.86, metersPerTile: 5, bumpScale: 0.28 });
  const water = new THREE.MeshPhysicalMaterial({
    color: 0x5ea8c8,
    roughness: 0.08,
    metalness: 0.22,
    clearcoat: 0.4,
  });
  const lawn = mapped(kit.grass, { roughness: 0.98, metersPerTile: 8 });

  // 莫卧儿查尔巴赫对称大理石倒影水道（Charbagh Reflecting Pool Canal）
  const poolWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d465c,
    roughness: 0.04,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  // 主大理石基台上的几何十字水渠
  box(root, marble, 108, 5.4, 108, 0, 0, 0);
  box(root, lawn, 36, 0.45, 36, -32, 5.4, -32);
  box(root, lawn, 36, 0.45, 36, 32, 5.4, -32);
  box(root, lawn, 36, 0.45, 36, -32, 5.4, 32);
  box(root, lawn, 36, 0.45, 36, 32, 5.4, 32);
  box(root, water, 7.2, 0.4, 108, 0, 5.45, 0);
  box(root, water, 108, 0.4, 7.2, 0, 5.45, 0);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 16), water);
  pool.position.set(0, 5.7, 0);
  root.add(pool);

  // 南向大花园倒影水道（长 140m，宽 10m，自台基南缘延伸）
  box(root, marble, 12.4, 0.6, 142, 0, 0, 124); // 大理石池底与基槽
  box(root, poolWaterMat, 9.6, 0.5, 140, 0, 0.15, 124); // 高反光水面
  // 水渠两侧大理石包边矮护栏
  box(root, marble, 0.7, 0.85, 142, -5.5, 0, 124);
  box(root, marble, 0.7, 0.85, 142, 5.5, 0, 124);

  // 东西向横向交叉水道（构成经典的查尔巴赫十字水系）
  box(root, marble, 142, 0.6, 12.4, 0, 0, 124);
  box(root, poolWaterMat, 140, 0.5, 9.6, 0, 0.15, 124);
  box(root, marble, 142, 0.85, 0.7, 0, 0, 124 - 5.5);
  box(root, marble, 142, 0.85, 0.7, 0, 0, 124 + 5.5);

  // 十字水渠中央：八角形霍德·考瑟尔水上大理石水榭（Al-Hawd al-Kawthar / Diana's Seat）
  const centerPlinth = new THREE.Mesh(chamferPrism(24, 1.2, 4.5), marble);
  centerPlinth.position.set(0, 0.3, 124);
  root.add(centerPlinth);
  const centerTank = new THREE.Mesh(chamferPrism(17.5, 0.8, 3.5), poolWaterMat);
  centerTank.position.set(0, 0.7, 124);
  root.add(centerTank);
  // 戴安娜大理石纪念长椅
  box(root, marble, 2.5, 0.65, 0.8, 0, 1.5, 124);

  // 水道两列等距莲花喷泉嘴（Lotus Fountain Jets）
  for (const z of [68, 86, 104, 144, 162, 180]) {
    cyl(root, gold(), 0.3, 0.45, 0.8, 0, 0.1, z, 8);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.4, 6), poolWaterMat);
    jet.position.set(0, 1.8, z);
    root.add(jet);
  }

  // 倒影水渠两侧名闻天下的常青丝柏树林（Cypress Tree Avenue）
  const cypressMat = mapped(kit.grass, { color: 0x1b3b24, roughness: 0.92 });
  const trunkMat = stone(0x3a2818, 0.95);
  for (const z of [66, 80, 94, 108, 140, 154, 168, 182]) {
    for (const x of [-9.8, 9.8]) {
      // 树干
      cyl(root, trunkMat, 0.35, 0.45, 2.5, x, 0, z, 6);
      // 纤细高挺的锥形丝柏树冠
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.65, 11.5, 8), cypressMat);
      canopy.position.set(x, 7.5, z);
      root.add(canopy);
      // 树下圆形大理石树池
      cyl(root, marble, 2.2, 2.4, 0.3, x, 0, z, 10);
    }
  }

  const tomb = new THREE.Mesh(chamferPrism(56, 33, 11), marble);
  tomb.position.y = 5.4;
  root.add(tomb);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    iwan(root, marble, dark, yaw);
  }
  for (const [x, z] of [
    [-22, -22],
    [22, -22],
    [-22, 22],
    [22, 22],
  ] as const) {
    box(root, marble, 9.2, 7.4, 9.2, x, 38.4, z);
    const chhatri = new THREE.Mesh(onionLathe(4.8, 6.8, 16), marble);
    chhatri.position.set(x, 45.8, z);
    root.add(chhatri);
    cyl(root, gold(), 0.12, 0.18, 2.6, x, 52.4, z, 6);
  }

  cyl(root, inlay, 15.2, 16.2, 11.5, 0, 38.4, 0, 28);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), marble);
    petal.scale.set(0.38, 0.22, 0.72);
    petal.position.set(Math.cos(a) * 15.4, 49.4, Math.sin(a) * 15.4);
    petal.lookAt(0, 52, 0);
    root.add(petal);
  }
  const dome = new THREE.Mesh(onionLathe(18.2, 26, 28), marble);
  dome.position.set(0, 49.6, 0);
  root.add(dome);
  cyl(root, marble, 0.5, 0.75, 7.5, 0, 75.2, 0, 8);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), gold());
  ball.position.set(0, 83.4, 0);
  root.add(ball);
  box(root, gold(), 0.12, 2.4, 0.12, 0, 84, 0);

  minaret(root, marble, inlay, -46, -46);
  minaret(root, marble, inlay, 46, -46);
  minaret(root, marble, inlay, -46, 46);
  minaret(root, marble, inlay, 46, 46);

  const mosque = (x: number) => {
    const g = new THREE.Group();
    box(g, red, 26, 5.4, 34, 0, 0, 0);
    box(g, red, 38, 14, 16, 0, 5.4, 0);
    for (const dx of [-12, 0, 12]) {
      cyl(g, red, 5.2, 5.6, 4.5, dx, 19.4, 0, 16);
      const cap = new THREE.Mesh(onionLathe(5.6, 7.2, 14), marble);
      cap.position.set(dx, 23.8, 0);
      g.add(cap);
    }
    const arch = new THREE.Mesh(archSlab(8, 10, 2.2, 1.2, true), dark);
    arch.position.set(0, 7.2, x > 0 ? -8.2 : 8.2);
    g.add(arch);
    g.position.x = x;
    root.add(g);
  };
  mosque(-62);
  mosque(62);
  return root;
}

/** 基督像：按 1931 年里约科尔科瓦多山实景比例重构：
 * 1. 宽达 5.4m 的雄伟 Art Deco 躯干柱体与肩部，彻底告别单薄的锥管躯干；
 * 2. 标志性的经典垂悬长袍广袖（袖口垂直高 3.6m，下沿优雅悬垂回拢至躯干侧肋），配 Art Deco 竖向棱面褶皱与袖口滚边；
 * 3. 臂展精确控制在 30.0 米，双手自广袖深处舒展而出，拥有宽阔圣掌与分明庄严的降福五指；
 * 4. 庄严肃穆的 Art Deco 头部、垂肩发缕、方颌短须与胸前斜披垂褶。
 */
export function createChrist(kit: SurfaceKit) {
  const root = new THREE.Group();
  const soap = mapped(kit.soapstone, {
    roughness: 0.58,
    metalness: 0.04,
    metersPerTile: 2.4,
    bumpScale: 0.32,
  });
  const soapDark = mapped(kit.soapstone, {
    color: 0xd8d2c4,
    roughness: 0.64,
    metersPerTile: 2.2,
    bumpScale: 0.28,
  });
  const shadow = stone(0xaaa396, 0.86);
  const rock = mapped(kit.machu, { color: 0xa09888, roughness: 0.92, metersPerTile: 5 });
  const dark = stone(0x3a342c, 0.9);

  // 1. Art Deco 礼拜堂基座与八角阶梯台基 (y = 0 ~ 14.5m)
  box(root, rock, 30, 1.2, 24, 0, 0, 0);
  box(root, rock, 28, 2.2, 22, 0, 1.2, 0);
  box(root, soapDark, 19, 1.0, 17, 0, 3.4, 0);
  box(root, soapDark, 15, 0.55, 15, 0, 4.4, 0);
  box(root, soapDark, 12.5, 7.4, 12.5, 0, 4.95, 0);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const arch = new THREE.Group();
    const opening = new THREE.Mesh(archSlab(3.6, 5.2, 1.4, 0.55), dark);
    opening.position.set(0, 5.65, -6.3);
    arch.add(opening);
    arch.rotation.y = yaw;
    root.add(arch);
  }
  for (const x of [-7.4, 7.4]) {
    box(root, soapDark, 0.85, 10.4, 0.85, x, 1.2, -7.8);
    box(root, soapDark, 0.85, 10.4, 0.85, x, 1.2, 7.8);
  }
  box(root, soapDark, 19, 0.65, 15, 0, 12.35, 0);
  box(root, soap, 17.5, 0.45, 13.8, 0, 13.0, 0);

  // 雕像脚下阶梯石阶台座
  box(root, soapDark, 11.2, 0.6, 9.6, 0, 13.45, 0);
  box(root, soapDark, 9.2, 0.5, 8.0, 0, 14.05, 0);

  // 2. 雄浑雕塑感长袍躯干 (y = 14.55 ~ 33.6m)
  // 按照人体与袍服黄金比例放宽胸膛与胯部，形成挺拔稳固的巨型石像体量
  const robePoints = [
    new THREE.Vector2(3.6, 0),     // 裙摆 y = 14.55, 宽达 8.5m
    new THREE.Vector2(3.45, 1.5),  // y = 16.05
    new THREE.Vector2(3.2, 4.8),   // y = 19.35
    new THREE.Vector2(2.95, 8.5),  // y = 23.05
    new THREE.Vector2(2.72, 12.2), // y = 26.75 (腰围)
    new THREE.Vector2(2.55, 15.6), // y = 30.15 (胸围)
    new THREE.Vector2(2.38, 18.2), // y = 32.75 (肩胛)
    new THREE.Vector2(1.85, 19.1), // y = 33.65 (颈根)
  ];
  const robe = new THREE.LatheGeometry(robePoints, 32);
  const body = new THREE.Mesh(robe, soap);
  body.scale.set(1.18, 1.0, 0.88);
  body.position.y = 14.55;
  root.add(body);

  // 袍身立体垂直褶皱（正面 6 道深影褶线，背面 5 道褶线）
  const frontFolds = [
    [[-2.4, 15.2, 2.7], [-1.9, 21.0, 2.8], [-1.3, 27.0, 2.5], [-0.85, 32.5, 2.0]],
    [[-1.5, 15.0, 3.2], [-1.2, 21.0, 3.1], [-0.7, 27.0, 2.7], [-0.35, 32.8, 2.1]],
    [[-0.5, 14.9, 3.3], [-0.35, 21.2, 3.2], [-0.15, 27.2, 2.75], [0.0, 33.0, 2.15]],
    [[0.5, 14.9, 3.3], [0.35, 21.2, 3.2], [0.15, 27.2, 2.75], [0.0, 33.0, 2.15]],
    [[1.5, 15.0, 3.2], [1.2, 21.0, 3.1], [0.7, 27.0, 2.7], [0.35, 32.8, 2.1]],
    [[2.4, 15.2, 2.7], [1.9, 21.0, 2.8], [1.3, 27.0, 2.5], [0.85, 32.5, 2.0]],
  ];
  for (const points of frontFolds) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.15, 6, false), shadow));
  }
  const backFolds = [
    [[-2.2, 15.2, -2.7], [-1.7, 21.0, -2.8], [-1.1, 27.0, -2.5], [-0.7, 32.5, -2.0]],
    [[-1.2, 15.0, -3.1], [-0.9, 21.0, -3.0], [-0.5, 27.0, -2.65], [-0.25, 32.8, -2.1]],
    [[0.0, 14.9, -3.2], [0.0, 21.2, -3.1], [0.0, 27.2, -2.7], [0.0, 33.0, -2.15]],
    [[1.2, 15.0, -3.1], [0.9, 21.0, -3.0], [0.5, 27.0, -2.65], [0.25, 32.8, -2.1]],
    [[2.2, 15.2, -2.7], [1.7, 21.0, -2.8], [1.1, 27.0, -2.5], [0.7, 32.5, -2.0]],
  ];
  for (const points of backFolds) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.13, 6, false), shadow));
  }

  // 胸前斜披斗篷折痕（经典圣像对角披帛线条）
  const mantleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.2, 33.2, 1.4),
    new THREE.Vector3(-1.2, 31.2, 2.0),
    new THREE.Vector3(0.0, 29.2, 2.35),
    new THREE.Vector3(1.2, 27.2, 2.45),
    new THREE.Vector3(2.3, 25.5, 2.3),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(mantleCurve, 20, 0.22, 8, false), soapDark));
  const mantleUpper = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.0, 33.5, 1.25),
    new THREE.Vector3(-1.0, 31.7, 1.85),
    new THREE.Vector3(0.1, 29.8, 2.2),
    new THREE.Vector3(1.4, 27.9, 2.3),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(mantleUpper, 16, 0.12, 6, false), shadow));

  // 3. 肩部与颈部（宽厚雄壮，与水平张开的双臂平顺过渡）
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.05, 3.6, 16), soap);
  neck.position.set(0, 34.6, 0.1);
  root.add(neck);

  for (const x of [-2.4, 2.4]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(1.85, 16, 12), soap);
    shoulder.scale.set(1.25, 0.85, 0.95);
    shoulder.position.set(x, 33.2, 0);
    root.add(shoulder);
  }

  // 4. 垂悬长袍广袖（重点优化：Art Deco 巨型垂袖几何体）
  // 右袖 (X > 0)
  const rightSleeveShape = new THREE.Shape();
  rightSleeveShape.moveTo(2.2, 33.5);
  rightSleeveShape.lineTo(12.2, 33.15); // 上沿平直微倾
  rightSleeveShape.lineTo(12.2, 29.6);  // 袖口垂落高度达 3.55m
  rightSleeveShape.bezierCurveTo(9.6, 27.2, 5.8, 25.8, 2.2, 25.2); // 优雅悬垂底缘回拢到躯干
  rightSleeveShape.lineTo(2.2, 33.5);

  // 左袖 (X < 0) 保证逆时针顶点序法线朝外
  const leftSleeveShape = new THREE.Shape();
  leftSleeveShape.moveTo(-2.2, 25.2);
  leftSleeveShape.bezierCurveTo(-5.8, 25.8, -9.6, 27.2, -12.2, 29.6);
  leftSleeveShape.lineTo(-12.2, 33.15);
  leftSleeveShape.lineTo(-2.2, 33.5);
  leftSleeveShape.lineTo(-2.2, 25.2);

  const sleeveExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 1.35,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.15,
    bevelSegments: 3,
  };

  const rightSleeveGeo = new THREE.ExtrudeGeometry(rightSleeveShape, sleeveExtrudeSettings);
  const rightSleeve = new THREE.Mesh(rightSleeveGeo, soap);
  rightSleeve.position.z = -0.675;
  root.add(rightSleeve);

  const leftSleeveGeo = new THREE.ExtrudeGeometry(leftSleeveShape, sleeveExtrudeSettings);
  const leftSleeve = new THREE.Mesh(leftSleeveGeo, soap);
  leftSleeve.position.z = -0.675;
  root.add(leftSleeve);

  // 上臂圆浑体量支撑（藏于长袍广袖顶部，赋予手臂饱满骨架感）
  for (const side of [-1, 1]) {
    const armCore = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 10.0, 16), soap);
    armCore.rotation.z = Math.PI / 2;
    armCore.position.set(side * 7.2, 33.1, 0);
    root.add(armCore);

    // 长袍广袖上的 Art Deco 垂直棱形风琴褶褶（正反两面共 16 条立体褶楞）
    const pleats = [
      { x: 4.4, yTop: 33.4, yBot: 26.0 },
      { x: 6.4, yTop: 33.3, yBot: 26.8 },
      { x: 8.4, yTop: 33.2, yBot: 27.8 },
      { x: 10.4, yTop: 33.15, yBot: 28.9 },
    ];
    for (const p of pleats) {
      const h = p.yTop - p.yBot;
      const cy = (p.yTop + p.yBot) / 2;
      // 正面棱纹
      const frontRib = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 4), soapDark);
      frontRib.rotation.y = Math.PI / 4;
      frontRib.position.set(side * p.x, cy, 0.76);
      root.add(frontRib);
      // 背面棱纹
      const backRib = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 4), soapDark);
      backRib.rotation.y = Math.PI / 4;
      backRib.position.set(side * p.x, cy, -0.76);
      root.add(backRib);
    }

    // 袖口镶边滚边与袖内深影
    box(root, soapDark, 0.48, 3.8, 1.85, side * 12.18, 29.5, 0);
    box(root, dark, 0.35, 3.2, 1.45, side * 12.35, 29.8, 0);

    // 5. 前臂与手腕（自宽广袖口自然伸出）
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 1.4, 16), soap);
    forearm.rotation.z = side * (Math.PI / 2);
    forearm.position.set(side * 12.8, 32.7, 0.02);
    root.add(forearm);

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.35, 14), soap);
    wrist.rotation.z = Math.PI / 2;
    wrist.position.set(side * 13.45, 32.7, 0.02);
    root.add(wrist);

    // 6. 庄严雕琢降福圣手（翼展精确达 30.0m，掌心向前倾微向上，五指分明有力）
    const palmGroup = new THREE.Group();
    palmGroup.position.set(side * 13.88, 32.65, 0.06);
    palmGroup.rotation.x = -0.14;        // 微向上仰面向世人降福
    palmGroup.rotation.y = side * 0.10;  // 掌心微朝内收
    palmGroup.rotation.z = side * -0.04;

    const palmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.38), soap);
    palmMesh.position.set(side * 0.12, 0, 0);
    palmGroup.add(palmMesh);

    // 大鱼际肌/掌丘饱满厚度
    const palmPad = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), soap);
    palmPad.scale.set(0.9, 1.3, 0.5);
    palmPad.position.set(side * 0.05, -0.15, 0.14);
    palmGroup.add(palmPad);

    // 四指（食、中、无名、小指）
    const fingerConfigs = [
      { y: 0.44, len: 1.25, thick: 0.16 }, // 食指
      { y: 0.15, len: 1.42, thick: 0.17 }, // 中指（最长，伸展至 15.0m 巅峰翼展）
      { y: -0.14, len: 1.28, thick: 0.16 }, // 无名指
      { y: -0.42, len: 1.08, thick: 0.15 }, // 小指
    ];
    for (const fc of fingerConfigs) {
      const fGroup = new THREE.Group();
      fGroup.position.set(side * 0.55, fc.y, 0.02);
      // 第一指节
      const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(fc.thick, fc.len * 0.55, 6, 8), soap);
      seg1.rotation.z = side * (Math.PI / 2);
      seg1.position.x = side * (fc.len * 0.28);
      fGroup.add(seg1);
      // 第二指节（微向前微曲，呈现雕塑自然弧度）
      const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(fc.thick * 0.88, fc.len * 0.45, 6, 8), soap);
      seg2.rotation.z = side * (Math.PI / 2);
      seg2.rotation.y = side * -0.08;
      seg2.position.set(side * (fc.len * 0.72), 0, 0.04);
      fGroup.add(seg2);
      palmGroup.add(fGroup);
    }

    // 拇指（向上、向前张开，大度端庄）
    const thumbGroup = new THREE.Group();
    thumbGroup.position.set(side * -0.20, 0.38, 0.12);
    thumbGroup.rotation.z = side * 0.65;
    thumbGroup.rotation.y = side * -0.28;
    const thumbSeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.75, 6, 8), soap);
    thumbSeg.rotation.z = side * (Math.PI / 2);
    thumbSeg.position.x = side * 0.38;
    thumbGroup.add(thumbSeg);
    palmGroup.add(thumbGroup);

    root.add(palmGroup);
  }

  // 7. 头部雕塑与庄严面庞 (y = 35.0 ~ 39.0m)
  // 依据真实救世基督像：去除突兀的头盔式发帽与浮空光环，采用纯粹一体的 Art Deco 中分雕塑长发与端庄五官
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.95, 24, 20), soap);
  head.scale.set(0.85, 1.15, 0.90);
  head.position.set(0, 36.8, 0.25);
  root.add(head);

  // 头部后脑与发冠雕塑体量（与面部同色材质，自然紧贴颅骨，绝非宽大头盔）
  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(1.92, 22, 16), soap);
  hairCrown.scale.set(0.86, 1.05, 0.92);
  hairCrown.position.set(0, 37.15, 0.12);
  root.add(hairCrown);

  // 经典 Art Deco 中分发线（自前额中央直通后脑勺的雅致微凹刻线）
  const partCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 38.15, 1.35),
    new THREE.Vector3(0, 38.95, 0.45),
    new THREE.Vector3(0, 38.65, -0.65),
    new THREE.Vector3(0, 37.2, -1.25),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(partCurve, 16, 0.08, 6, false), shadow));

  // 后颈波浪发体（向后下顺滑收束于颈背）
  const napeHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.8, 8, 10), soap);
  napeHair.rotation.x = 0.2;
  napeHair.position.set(0, 35.6, -0.75);
  root.add(napeHair);

  for (const side of [-1, 1]) {
    // 太阳穴侧发波浪（自然服帖于颅侧，修饰面颊轮廓）
    const templeWave = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.5, 6, 10), soap);
    templeWave.rotation.set(-0.2, 0, side * -0.15);
    templeWave.position.set(side * 1.35, 37.4, 0.55);
    root.add(templeWave);

    // 垂向两侧肩头的波浪长发绺（前绺与后绺自然垂落于锁骨与肩部）
    const frontLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 2.6, 6, 10), soap);
    frontLock.rotation.z = side * -0.05;
    frontLock.position.set(side * 1.48, 35.3, 0.52);
    root.add(frontLock);

    const backLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 2.8, 6, 10), soap);
    backLock.rotation.z = side * -0.04;
    backLock.position.set(side * 1.42, 35.4, -0.05);
    root.add(backLock);

    // 发绺间的阴影折线
    const lockGroove = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 1.42, 37.2, 0.4),
      new THREE.Vector3(side * 1.52, 35.5, 0.35),
      new THREE.Vector3(side * 1.58, 34.2, 0.3),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(lockGroove, 10, 0.06, 5, false), shadow));

    // 耳廓（半隐于侧发间）
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), soap);
    ear.scale.set(0.55, 1.0, 0.45);
    ear.position.set(side * 1.55, 36.8, 0.25);
    root.add(ear);

    // 深邃目光与眉弓
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), dark);
    eye.scale.set(1.25, 0.58, 0.4);
    eye.position.set(side * 0.55, 37.05, 1.76);
    root.add(eye);

    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.95, 37.35, 1.55),
      new THREE.Vector3(side * 0.55, 37.42, 1.72),
      new THREE.Vector3(side * 0.22, 37.38, 1.78),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(browCurve, 8, 0.08, 6, false), soapDark));
  }

  // Art Deco 挺拔山根鼻梁
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.05, 7), soap);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 36.65, 1.95);
  root.add(nose);

  // 庄重修整胡须与方正方颌胡子
  const moustache = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), soapDark);
  moustache.scale.set(1.25, 0.32, 0.32);
  moustache.position.set(0, 36.2, 1.82);
  root.add(moustache);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.1, 8), soapDark);
  beard.rotation.z = Math.PI;
  beard.scale.set(0.9, 1.0, 0.6);
  beard.position.set(0, 35.15, 1.25);
  root.add(beard);

  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.35, 36.0, 1.78),
    new THREE.Vector3(0, 35.95, 1.86),
    new THREE.Vector3(0.35, 36.0, 1.78),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 8, 0.05, 5, false), shadow));

  return root;
}

interface LandmarkLinePalette {
  color: number;
  opacity: number;
  thresholdAngle: number;
  minDiagonal?: number;
}

const LANDMARK_LINE_PALETTES: Record<string, LandmarkLinePalette> = {
  giza: {
    color: 0x3d2b1a, // 埃及暖赭石深影缝隙色
    opacity: 0.88,
    thresholdAngle: 24,
    minDiagonal: 0.8,
  },
  wall: {
    color: 0x221e1a, // 明长城灰砖青苔勾缝深色
    opacity: 0.84,
    thresholdAngle: 22,
    minDiagonal: 0.7,
  },
  petra: {
    color: 0x381812, // 佩特拉纳巴泰红砂岩深渊裂谷暗红深色
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.6,
  },
  colosseum: {
    color: 0x34291c, // 罗马白灰华石千年风化阴影线
    opacity: 0.82,
    thresholdAngle: 24,
    minDiagonal: 0.8,
  },
  chichen: {
    color: 0x2c271e, // 玛雅雨林石灰岩苍老刻线
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.7,
  },
  machu: {
    color: 0x222629, // 安第斯山脉花岗岩玄武岩冷深刻线
    opacity: 0.84,
    thresholdAngle: 22,
    minDiagonal: 0.6,
  },
  taj: {
    color: 0x3e4950, // 莫卧儿白色大理石雕凿清冷灰蓝阴影线
    opacity: 0.72,
    thresholdAngle: 24,
    minDiagonal: 0.8,
  },
  christ: {
    color: 0x30383d, // 里约基督像滑石马赛克折纸风立体衣褶线
    opacity: 0.78,
    thresholdAngle: 24,
    minDiagonal: 0.6,
  },
  pentagon: {
    color: 0x243248, // 五角大楼混凝土分格线
    opacity: 0.8,
    thresholdAngle: 25,
    minDiagonal: 1.0,
  },
  fast: {
    color: 0x1f3c55, // 中国天眼钢结构圈梁与桁架线
    opacity: 0.75,
    thresholdAngle: 20,
    minDiagonal: 1.0,
  },
  burj: {
    color: 0x334155, // 哈利法塔竖向幕墙棱线
    opacity: 0.8,
    thresholdAngle: 22,
    minDiagonal: 1.5,
  },
  apple: {
    color: 0x1e293b, // 苹果总部极简主义深色幕墙与纯白悬挑水平线
    opacity: 0.75,
    thresholdAngle: 24,
    minDiagonal: 1.0,
  },
  sydney: {
    color: 0x334155, // 悉尼歌剧院建筑素描深板岩素雅轮廓线
    opacity: 0.72,
    thresholdAngle: 25,
    minDiagonal: 0.8,
  },
  globalcenter: {
    color: 0x0369a1, // 成都环球中心海鸥波浪挑檐与幕墙分格锐利深蓝轮廓线
    opacity: 0.85,
    thresholdAngle: 22,
    minDiagonal: 1.0,
  },
  hzmb: {
    color: 0x1e293b, // 港珠澳大桥斜拉索塔与人工岛外围护岸轮廓线
    opacity: 0.85,
    thresholdAngle: 20,
    minDiagonal: 1.0,
  },
  goldengate: {
    color: 0x7c2d12, // 金门大桥国际橘钢桁架与主缆深影轮廓线
    opacity: 0.88,
    thresholdAngle: 22,
    minDiagonal: 1.0,
  },
  svalbard: {
    color: 0x0f172a, // 斯瓦尔巴末日种子库混凝土入口巨石楔形棱角与极地岩层锐利刻线
    opacity: 0.92,
    thresholdAngle: 18,
    minDiagonal: 0.4,
  },
  liberty: {
    color: 0x164e3f, // 自由女神像氧化铜绿折线与古典星形要塞深影轮廓线
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.5,
  },
  defense: {
    color: 0x1e293b, // 拉德芳斯新凯旋门超立方体白色大理石边线与幕墙分格锐线
    opacity: 0.88,
    thresholdAngle: 20,
    minDiagonal: 0.8,
  },
  eiffel: {
    color: 0x5c4218, // 埃菲尔铁塔熟铁格构与三层观景台深影轮廓线
    opacity: 0.88,
    thresholdAngle: 20,
    minDiagonal: 0.6,
  },
  parthenon: {
    color: 0x573b18, // 雅典帕特农神庙多立克柱凹槽与三角楣大理石轮廓线
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.5,
  },
  futuremuseum: {
    color: 0x0f172a, // 迪拜未来博物馆不锈钢曲面分格与斜撑桁架锐线
    opacity: 0.90,
    thresholdAngle: 18,
    minDiagonal: 0.6,
  },
  sagrada: {
    color: 0x452306, // 圣家堂蜂巢钟楼、自然主义立面与树状柱分枝深影线条
    opacity: 0.88,
    thresholdAngle: 20,
    minDiagonal: 0.5,
  },
};

// ─────────────────────────────────────────────────────────
// 现代工程与天际线程序化构建器
// ─────────────────────────────────────────────────────────

function makePentagonWindowTexture(isNight: boolean): THREE.CanvasTexture {
  const floors = 5;
  const cols = 36;
  const cellW = 16;
  const cellH = 28;
  const w = cols * cellW;
  const h = floors * cellH;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = isNight ? "#2c3344" : "#c5bfb0";
  g.fillRect(0, 0, w, h);

  for (let f = 0; f < floors; f++) {
    const y0 = f * cellH;
    g.fillStyle = isNight ? "#1a2030" : "#a59e8e";
    g.fillRect(0, y0 + cellH - 4, w, 4);

    g.fillStyle = isNight ? "#3a4255" : "#b0a898";
    g.fillRect(0, y0 + 2, w, 2);

    for (let i = 0; i < cols; i++) {
      const x0 = i * cellW;
      const padX = 3;
      const padY = 6;
      const wx = x0 + padX;
      const wy = y0 + padY;
      const ww = cellW - padX * 2;
      const wh = cellH - padY - 8;

      g.fillStyle = isNight ? "#151a24" : "#6a6560";
      g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);

      if (isNight) {
        const lit = (i * 7 + f * 13) % 10 > 3;
        if (lit) {
          const warm = (i + f) % 3 !== 0;
          g.fillStyle = warm ? "#ffd478" : "#d0e4ff";
        } else {
          g.fillStyle = "#0d121c";
        }
      } else {
        const shade = 140 + ((i * 11 + f * 17) % 40);
        g.fillStyle = `rgb(${shade - 30},${shade},${shade + 25})`;
      }
      g.fillRect(wx, wy, ww, wh);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createPentagon(kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "Pentagon";

  const SIN36 = Math.sin(Math.PI / 5);
  const OUTER_SIDE = 281;
  const COURT_SIDE = 110;
  const OUTER_R = OUTER_SIDE / (2 * SIN36); // ~238.9m
  const COURT_R = COURT_SIDE / (2 * SIN36); // ~93.5m
  const BUILDING_H = 23.5;
  const BASE_H = 1.5;
  const RING_COUNT = 5;
  const LIGHT_COURT = 6.5;
  const usable = OUTER_R - COURT_R - LIGHT_COURT * (RING_COUNT - 1);
  const RING_W = usable / RING_COUNT;

  const dayWinTex = makePentagonWindowTexture(false);
  const nightWinTex = makePentagonWindowTexture(true);

  const wallMatDay = new THREE.MeshStandardMaterial({
    map: dayWinTex,
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const wallMatNight = new THREE.MeshStandardMaterial({
    map: nightWinTex,
    emissive: new THREE.Color(0xffd285),
    emissiveMap: nightWinTex,
    emissiveIntensity: 0.95,
    roughness: 0.65,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x6e756c,
    roughness: 0.92,
    metalness: 0.04,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xbfb9ac,
    roughness: 0.88,
  });
  const lawnMat = mapped(kit.grass, { color: 0x3d6635, roughness: 0.95, metersPerTile: 12 });
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x484d54,
    roughness: 0.92,
  });

  const ROT0 = -Math.PI / 2;
  function pXZ(radius: number, rotation = ROT0) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
      const a = rotation + (i * 2 * Math.PI) / 5;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }

  // Outer lawn and road base
  const outerRoad = new THREE.Mesh(new THREE.CircleGeometry(OUTER_R + 55, 5), roadMat);
  outerRoad.rotation.x = -Math.PI / 2;
  outerRoad.rotation.z = Math.PI / 10;
  outerRoad.position.y = 0.1;
  group.add(outerRoad);

  const lawnBase = new THREE.Mesh(new THREE.CircleGeometry(OUTER_R + 42, 5), lawnMat);
  lawnBase.rotation.x = -Math.PI / 2;
  lawnBase.rotation.z = Math.PI / 10;
  lawnBase.position.y = 0.2;
  group.add(lawnBase);

  // Pentagon base slab
  function addTrapezoidSlab(
    o0: THREE.Vector3,
    o1: THREE.Vector3,
    i1: THREE.Vector3,
    i0: THREE.Vector3,
    yBottom: number,
    thickness: number,
    material: THREE.Material,
  ) {
    const y0 = yBottom;
    const y1 = yBottom + thickness;
    const verts = new Float32Array([
      o0.x, y0, o0.z, o1.x, y0, o1.z, i1.x, y0, i1.z, i0.x, y0, i0.z,
      o0.x, y1, o0.z, o1.x, y1, o1.z, i1.x, y1, i1.z, i0.x, y1, i0.z,
    ]);
    const idx = [
      0, 2, 1, 0, 3, 2, // bottom
      4, 6, 5, 4, 7, 6, // top
      0, 1, 5, 0, 5, 4, // outer
      3, 7, 6, 3, 6, 2, // inner
      0, 4, 7, 0, 7, 3, // side
      1, 2, 6, 1, 6, 5, // side
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function addPentagonRingSlabs(
    outerR: number,
    innerR: number,
    yBottom: number,
    thickness: number,
    material: THREE.Material,
  ) {
    const outerPts = pXZ(outerR);
    const innerPts = pXZ(innerR);
    for (let s = 0; s < 5; s++) {
      const n = (s + 1) % 5;
      addTrapezoidSlab(outerPts[s], outerPts[n], innerPts[n], innerPts[s], yBottom, thickness, material);
    }
  }

  // Base platform
  addPentagonRingSlabs(OUTER_R + 6, COURT_R - 6, 0.2, BASE_H, concreteMat);

  // Courtyard lawn
  const courtLawn = new THREE.Mesh(new THREE.CircleGeometry(COURT_R - 8, 5), lawnMat);
  courtLawn.rotation.x = -Math.PI / 2;
  courtLawn.rotation.z = Math.PI / 10;
  courtLawn.position.y = BASE_H + 0.3;
  group.add(courtLawn);

  // Central pavilion in courtyard
  const centerPavilion = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 6, 5), concreteMat);
  centerPavilion.position.set(0, BASE_H + 3, 0);
  group.add(centerPavilion);

  function addFacadeWall(
    a: THREE.Vector3,
    b: THREE.Vector3,
    y0: number,
    height: number,
    outward: number,
    uRepeat: number,
  ) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const edge = new THREE.Vector3().subVectors(b, a);
    const len = edge.length();
    const dir = edge.clone().normalize();
    let normal = new THREE.Vector3(-dir.z, 0, dir.x);
    const radial = new THREE.Vector3(mid.x, 0, mid.z).normalize();
    if (normal.dot(radial) < 0) normal.negate();
    if (outward < 0) normal.negate();

    mid.addScaledVector(normal, 0.12);

    const geo = new THREE.PlaneGeometry(len, height, 1, 1);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uv.getX(i) * uRepeat);
    }
    uv.needsUpdate = true;

    const mesh = new THREE.Mesh(geo, wallMatDay);
    mesh.userData.isWall = true;
    mesh.userData.wallMatDay = wallMatDay;
    mesh.userData.wallMatNight = wallMatNight;
    mesh.position.set(mid.x, y0 + height / 2, mid.z);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // 5 Rings
  for (let r = 0; r < RING_COUNT; r++) {
    const outer = OUTER_R - r * (RING_W + LIGHT_COURT);
    const inner = outer - RING_W;

    // Roof & Floor slabs
    addPentagonRingSlabs(outer - 0.1, inner + 0.1, BASE_H + BUILDING_H, 0.6, roofMat);
    addPentagonRingSlabs(outer, inner, BASE_H, 0.4, concreteMat);

    const outPts = pXZ(outer);
    const inPts = pXZ(inner);
    const uOut = (outer * 2 * Math.sin(Math.PI / 5)) / 22;
    const uIn = (inner * 2 * Math.sin(Math.PI / 5)) / 22;

    for (let s = 0; s < 5; s++) {
      const n = (s + 1) % 5;
      // Outer facade
      addFacadeWall(outPts[s], outPts[n], BASE_H, BUILDING_H, 1, uOut);
      // Inner facade
      addFacadeWall(inPts[n], inPts[s], BASE_H, BUILDING_H, -1, uIn);
    }
  }

  // 10 Radial Corridors linking rings
  const corridorMat = concreteMat;
  for (let s = 0; s < 5; s++) {
    // 5 corner corridors
    const a = ROT0 + (s * 2 * Math.PI) / 5;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const span = OUTER_R - COURT_R;
    const midDist = (OUTER_R + COURT_R) / 2;
    const pos = dir.clone().multiplyScalar(midDist);

    const corr = new THREE.Mesh(new THREE.BoxGeometry(7, BUILDING_H * 0.9, span), corridorMat);
    corr.position.set(pos.x, BASE_H + (BUILDING_H * 0.9) / 2, pos.z);
    corr.lookAt(0, corr.position.y, 0);
    group.add(corr);

    // 5 edge midpoint corridors
    const midA = a + Math.PI / 5;
    const midDir = new THREE.Vector3(Math.cos(midA), 0, Math.sin(midA));
    const mDist = midDist * Math.cos(Math.PI / 5);
    const mPos = midDir.clone().multiplyScalar(mDist);
    const mSpan = (OUTER_R - COURT_R) * Math.cos(Math.PI / 5);
    const corrMid = new THREE.Mesh(new THREE.BoxGeometry(6, BUILDING_H * 0.9, mSpan), corridorMat);
    corrMid.position.set(mPos.x, BASE_H + (BUILDING_H * 0.9) / 2, mPos.z);
    corrMid.lookAt(0, corrMid.position.y, 0);
    group.add(corrMid);
  }

  group.userData.hasInspection = true;
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      if ((c as THREE.Mesh).userData?.isWall) {
        (c as THREE.Mesh).material = night ? wallMatNight : wallMatDay;
      }
    });
  };

  return group;
}

function createFastTelescope(kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "FAST";

  const dishRadius = 250;
  const rimHeight = 90;
  const dishBottom = 20; // 凹面反射面最低中心点 (高程20m，边缘圈梁高程90m，净下凹深度70m)

  // 1. Karst Sinkhole Rim & Surrounding Slopes
  const craterGeo = new THREE.CylinderGeometry(dishRadius + 140, dishRadius + 4, 110, 48, 4, true);
  const craterMat = mapped(kit.grass, { color: 0x3d5c36, roughness: 0.92, metersPerTile: 20 });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.position.set(0, 55, 0);
  crater.receiveShadow = true;
  group.add(crater);

  // 坑底基座
  const basinFloor = new THREE.Mesh(
    new THREE.CircleGeometry(dishRadius + 8, 36),
    mapped(kit.machu, { color: 0x334433, roughness: 0.95, metersPerTile: 12 }),
  );
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.position.set(0, 5, 0);
  basinFloor.receiveShadow = true;
  group.add(basinFloor);

  // Outer karst peaks
  for (let i = 0; i < 14; i++) {
    const angle = (i * 2 * Math.PI) / 14 + (i % 3) * 0.1;
    const dist = dishRadius + 150 + ((i * 37) % 70);
    const peakH = 80 + ((i * 47) % 80);
    const peakW = 120 + ((i * 29) % 60);
    const peak = new THREE.Mesh(
      pyramidGeo(peakW, peakH),
      mapped(kit.machu, { color: 0x485844, roughness: 0.95, metersPerTile: 16 }),
    );
    peak.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    group.add(peak);
  }

  // 2. 500m 口径主反射面（严格凹面朝天：中心低、边缘高）
  const dishPts: THREE.Vector2[] = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const r = t * dishRadius;
    const y = dishBottom + (rimHeight - dishBottom) * (t * t);
    dishPts.push(new THREE.Vector2(r, y));
  }
  const dishGeo = new THREE.LatheGeometry(dishPts, 64);
  dishGeo.computeVertexNormals();

  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf3f6fa,
    metalness: 0.24,
    roughness: 0.32,
    side: THREE.DoubleSide,
  });
  const dishMesh = new THREE.Mesh(dishGeo, dishMat);
  dishMesh.receiveShadow = true;
  dishMesh.castShadow = true;
  group.add(dishMesh);

  // 同心环索（沿凹面贴合分布）
  const ringMat = new THREE.LineBasicMaterial({ color: 0x4f718f, opacity: 0.65, transparent: true });
  for (let r = 35; r <= dishRadius - 8; r += 32) {
    const ringGeo = new THREE.BufferGeometry();
    const pts: number[] = [];
    const t = r / dishRadius;
    const h = dishBottom + (rimHeight - dishBottom) * (t * t) + 0.35;
    for (let j = 0; j <= 64; j++) {
      const a = (j * 2 * Math.PI) / 64;
      pts.push(Math.cos(a) * r, h, Math.sin(a) * r);
    }
    ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.Line(ringGeo, ringMat));
  }

  // 径向主索网格线（自中心向圈梁放射）
  const radialMat = new THREE.LineBasicMaterial({ color: 0x4f718f, opacity: 0.5, transparent: true });
  for (let i = 0; i < 24; i++) {
    const a = (i * 2 * Math.PI) / 24;
    const radPts: THREE.Vector3[] = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      const r = t * (dishRadius - 2);
      const h = dishBottom + (rimHeight - dishBottom) * (t * t) + 0.35;
      radPts.push(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r));
    }
    const radGeo = new THREE.BufferGeometry().setFromPoints(radPts);
    group.add(new THREE.Line(radGeo, radialMat));
  }

  // 3. Circular Ring Beam (圈梁)
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0xaec0ce,
    metalness: 0.28,
    roughness: 0.35,
  });
  const ringBeam = new THREE.Mesh(new THREE.TorusGeometry(dishRadius, 3.2, 8, 72), beamMat);
  ringBeam.rotation.x = Math.PI / 2;
  ringBeam.position.set(0, rimHeight, 0);
  ringBeam.castShadow = true;
  group.add(ringBeam);

  // Support Piers under Ring Beam
  const pierMat = new THREE.MeshStandardMaterial({ color: 0xb5bec6, roughness: 0.8 });
  const pierCount = 36;
  for (let i = 0; i < pierCount; i++) {
    const a = (i * 2 * Math.PI) / pierCount;
    const px = Math.cos(a) * dishRadius;
    const pz = Math.sin(a) * dishRadius;
    const pierH = 35 + (i % 4) * 8;
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, pierH, 8), pierMat);
    pier.position.set(px, rimHeight - pierH / 2, pz);
    pier.castShadow = true;
    group.add(pier);
  }

  // 4. Six Feed-Cabin Support Towers (6 馈源支撑塔)
  const towerCount = 6;
  const towerRadius = dishRadius + 22;
  const towerH = 115;
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xaec0cf,
    metalness: 0.78,
    roughness: 0.3,
  });

  const towerTops: THREE.Vector3[] = [];

  for (let i = 0; i < towerCount; i++) {
    const a = (i * 2 * Math.PI) / towerCount;
    const tx = Math.cos(a) * towerRadius;
    const tz = Math.sin(a) * towerRadius;
    const ty = rimHeight;

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 9.5, towerH, 4), towerMat);
    tower.rotation.y = a;
    tower.position.set(tx, ty + towerH / 2, tz);
    tower.castShadow = true;
    group.add(tower);

    // Cross brace bands
    for (let b = 1; b <= 4; b++) {
      const bh = ty + (b * towerH) / 5;
      const bRing = new THREE.Mesh(new THREE.BoxGeometry(9 - b, 2.2, 9 - b), beamMat);
      bRing.position.set(tx, bh, tz);
      bRing.rotation.y = a;
      group.add(bRing);
    }

    towerTops.push(new THREE.Vector3(tx, ty + towerH, tz));
  }

  // 5. Center Suspended Feed Cabin (馈源舱)
  const cabinPos = new THREE.Vector3(0, rimHeight + 52, 0);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.85,
    roughness: 0.2,
  });
  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 9, 6.5, 16), cabinMat);
  cabin.position.copy(cabinPos);
  cabin.castShadow = true;
  group.add(cabin);

  // Secondary reflector dome under cabin
  const secRefl = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dishMat);
  secRefl.rotation.x = Math.PI;
  secRefl.position.set(0, cabinPos.y - 3.2, 0);
  group.add(secRefl);

  // 6. Six Steel Suspension Cables
  const cableMat = new THREE.LineBasicMaterial({ color: 0x829bb0 });
  for (const tTop of towerTops) {
    const cableGeo = new THREE.BufferGeometry().setFromPoints([
      tTop,
      new THREE.Vector3(cabinPos.x, cabinPos.y + 2, cabinPos.z),
    ]);
    group.add(new THREE.Line(cableGeo, cableMat));
  }

  return group;
}

function makeBurjWindowTexture(isNight: boolean): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = isNight ? "#0d1525" : "#7b9ebc";
  g.fillRect(0, 0, w, h);

  const floorCount = 64;
  const floorH = h / floorCount;
  for (let f = 0; f < floorCount; f++) {
    const y = f * floorH;
    g.fillStyle = isNight ? "#050914" : "#c2d3e2";
    g.fillRect(0, y, w, 1.5);

    for (let col = 0; col < 16; col++) {
      const x = col * (w / 16);
      if (isNight) {
        const lit = (col * 17 + f * 31) % 10 > 3;
        if (lit) {
          g.fillStyle = (col + f) % 2 === 0 ? "#ffe29a" : "#cce4ff";
          g.fillRect(x + 2, y + 2, w / 16 - 4, floorH - 3);
        }
      } else {
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(x + 2, y + 2, w / 16 - 4, floorH - 3);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createBurjKhalifa(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "BurjKhalifa";

  const dayTex = makeBurjWindowTexture(false);
  const nightTex = makeBurjWindowTexture(true);

  // 阳光下通体银蓝透亮的高级反光玻璃幕墙 (low metalness for bright diffuse reflection under sunlight)
  const glassMatDay = new THREE.MeshStandardMaterial({
    map: dayTex,
    color: 0xcfe6fc,
    metalness: 0.18,
    roughness: 0.26,
  });

  const glassMatNight = new THREE.MeshStandardMaterial({
    map: nightTex,
    color: 0x182a3d,
    emissive: new THREE.Color(0x38bdf8),
    emissiveMap: nightTex,
    emissiveIntensity: 1.25,
    metalness: 0.25,
    roughness: 0.3,
  });

  const capMatDay = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.15,
  });

  const capMatNight = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 1.1,
    roughness: 0.3,
    metalness: 0.2,
  });

  const spireMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.32,
    roughness: 0.22,
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0e3b5e,
    roughness: 0.1,
    metalness: 0.35,
  });

  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0xb5aba0,
    roughness: 0.85,
  });

  // 1. Lake & Plaza Podium
  const lake = new THREE.Mesh(new THREE.CircleGeometry(220, 48), waterMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.y = 0.2;
  lake.receiveShadow = true;
  group.add(lake);

  const podium = new THREE.Mesh(new THREE.CylinderGeometry(140, 150, 8, 32), plazaMat);
  podium.position.y = 4;
  podium.receiveShadow = true;
  group.add(podium);

  // 2. Y-Shaped Tower Tier Layout with 26 Clockwise Helical Setbacks
  const wingAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  const tierCount = 18;
  const tierH = 32;

  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(14, 28, 585, 6), glassMatDay);
  coreMesh.position.y = 585 / 2 + 8;
  coreMesh.userData.isWall = true;
  coreMesh.userData.wallMatDay = glassMatDay;
  coreMesh.userData.wallMatNight = glassMatNight;
  coreMesh.castShadow = true;
  group.add(coreMesh);

  for (let t = 0; t < tierCount; t++) {
    const yBottom = 8 + t * tierH;
    for (let w = 0; w < 3; w++) {
      const angle = wingAngles[w];
      // 严密契合沙漠之花灵感的 26 级顺时针螺旋退台收分
      const setbackStep = Math.floor((t * 3 + w) / 2);
      const wingLen = Math.max(76 - setbackStep * 5.2, 16);
      const wingWidth = Math.max(26 - t * 0.95, 9.5);
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);

      const wingBody = new THREE.Mesh(new THREE.BoxGeometry(wingLen * 0.75, tierH, wingWidth), glassMatDay);
      const centerDist = 12 + (wingLen * 0.75) / 2;
      wingBody.position.set(dirX * centerDist, yBottom + tierH / 2, dirZ * centerDist);
      wingBody.rotation.y = -angle;
      wingBody.userData.isWall = true;
      wingBody.userData.wallMatDay = glassMatDay;
      wingBody.userData.wallMatNight = glassMatNight;
      wingBody.castShadow = true;
      wingBody.receiveShadow = true;
      group.add(wingBody);

      const lobeRadius = wingWidth / 2;
      const lobe = new THREE.Mesh(new THREE.CylinderGeometry(lobeRadius, lobeRadius, tierH, 12), glassMatDay);
      const lobeDist = 12 + wingLen * 0.75;
      lobe.position.set(dirX * lobeDist, yBottom + tierH / 2, dirZ * lobeDist);
      lobe.userData.isWall = true;
      lobe.userData.wallMatDay = glassMatDay;
      lobe.userData.wallMatNight = glassMatNight;
      lobe.castShadow = true;
      group.add(lobe);

      // 每级退台顶部的纯白铝合金防水挑檐与夜间 LED 呼吸光带
      const cap = new THREE.Mesh(new THREE.BoxGeometry(wingLen * 0.76, 0.9, wingWidth + 0.8), capMatDay);
      cap.position.set(dirX * centerDist, yBottom + tierH + 0.45, dirZ * centerDist);
      cap.rotation.y = -angle;
      cap.userData.isCap = true;
      group.add(cap);
    }
  }

  // 3. Spire & Pinnacle (585m to 828m)
  const spireLower = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 13.5, 115, 6), spireMat);
  spireLower.position.y = 585 + 115 / 2 + 8;
  spireLower.castShadow = true;
  group.add(spireLower);

  const pinnacle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 5.5, 128, 8), spireMat);
  pinnacle.position.y = 700 + 128 / 2 + 8;
  pinnacle.castShadow = true;
  group.add(pinnacle);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
  beacon.position.set(0, 828, 0);
  group.add(beacon);

  group.userData.hasInspection = true;
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      if ((c as THREE.Mesh).userData?.isWall) {
        (c as THREE.Mesh).material = night ? glassMatNight : glassMatDay;
      }
      if ((c as THREE.Mesh).userData?.isCap) {
        (c as THREE.Mesh).material = night ? capMatNight : capMatDay;
      }
    });
  };

  return group;
}

const _lineMaterialCache = new Map<string, THREE.LineBasicMaterial>();

function getLineMaterial(color: number, opacity: number): THREE.LineBasicMaterial {
  const key = `${color}_${opacity}`;
  let mat = _lineMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.LineBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
    });
    _lineMaterialCache.set(key, mat);
  }
  return mat;
}

const _calcBox = new THREE.Box3();
const _calcSize = new THREE.Vector3();

export function attachLandmarkLines(root: THREE.Group, wonderId: string) {
  const palette = LANDMARK_LINE_PALETTES[wonderId];
  if (!palette) return root;

  const lineMat = getLineMaterial(palette.color, palette.opacity);
  const minDiag = palette.minDiagonal ?? 0.6;
  const threshold = palette.thresholdAngle;

  const candidates: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return;
    if (mesh.userData?.skipLines) return;
    candidates.push(mesh);
  });

  for (const mesh of candidates) {
    const geo = mesh.geometry;
    if (!geo || !geo.getAttribute("position")) continue;

    _calcBox.setFromBufferAttribute(geo.getAttribute("position") as THREE.BufferAttribute);
    _calcBox.getSize(_calcSize);
    if (_calcSize.length() < minDiag) continue;

    if (!geo.userData) geo.userData = {};
    let edgesGeo = geo.userData._edgesGeo as THREE.EdgesGeometry | undefined;
    if (!edgesGeo) {
      edgesGeo = new THREE.EdgesGeometry(geo, threshold);
      geo.userData._edgesGeo = edgesGeo;
    }

    if (edgesGeo.getAttribute("position") && edgesGeo.getAttribute("position").count > 0) {
      const line = new THREE.LineSegments(edgesGeo, lineMat);
      line.renderOrder = 1;
      mesh.add(line);
    }
  }

  return root;
}

function makeAppleParkWindowTexture(isNight: boolean): THREE.CanvasTexture {
  const floors = 4;
  const cols = 64;
  const cellW = 16;
  const cellH = 32;
  const w = cols * cellW; // 1024
  const h = floors * cellH; // 128
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = isNight ? "#090d16" : "#1a2234";
  g.fillRect(0, 0, w, h);

  for (let f = 0; f < floors; f++) {
    const y0 = f * cellH;

    // Spandrel / floor slab (protruding louver line)
    g.fillStyle = isNight ? "#1e293b" : "#f1f5f9";
    g.fillRect(0, y0 + cellH - 4, w, 4);

    for (let i = 0; i < cols; i++) {
      const x0 = i * cellW;
      const wx = x0 + 1;
      const wy = y0 + 2;
      const ww = cellW - 2;
      const wh = cellH - 6;

      if (isNight) {
        const lit = ((f * 13 + i * 7) % 10) > 2;
        if (lit) {
          const warm = (f * 5 + i * 3) % 2 === 0;
          g.fillStyle = warm ? "#ffe8b3" : "#fef3c7";
          g.fillRect(wx, wy, ww, wh);
          // Interior blind / column silhouette
          g.fillStyle = "rgba(15, 23, 42, 0.4)";
          g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        } else {
          g.fillStyle = "#111827";
          g.fillRect(wx, wy, ww, wh);
        }
      } else {
        const grad = g.createLinearGradient(0, wy, 0, wy + wh);
        grad.addColorStop(0, "#93c5fd");
        grad.addColorStop(0.3, "#3b82f6");
        grad.addColorStop(1, "#1d4ed8");
        g.fillStyle = grad;
        g.fillRect(wx, wy, ww, wh);

        // Vertical mullion line
        g.fillStyle = "rgba(241, 245, 249, 0.6)";
        g.fillRect(wx, wy, 1, wh);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(12, 1);
  return tex;
}

function makeAppleParkSolarTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = "#060911";
  g.fillRect(0, 0, w, h);

  const cells = 16;
  const sz = w / cells;
  for (let r = 0; r < cells; r++) {
    for (let col = 0; col < cells; col++) {
      const x = col * sz + 1;
      const y = r * sz + 1;
      const s = sz - 2;

      g.fillStyle = "#0f172a";
      g.fillRect(x, y, s, s);

      // Fine cyan busbars
      g.strokeStyle = "rgba(56, 189, 248, 0.28)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x + s * 0.33, y);
      g.lineTo(x + s * 0.33, y + s);
      g.moveTo(x + s * 0.66, y);
      g.lineTo(x + s * 0.66, y + s);
      g.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 4);
  return tex;
}

function createApplePark(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "ApplePark";

  const OUTER_R = 230.5; // ~461m outer diameter
  const INNER_R = 177.0; // ~354m inner diameter
  const BUILDING_H = 22.0; // 4 stories
  const FLOORS = 4;
  const FLOOR_H = BUILDING_H / FLOORS; // 5.5m per floor

  const dayTex = makeAppleParkWindowTexture(false);
  const nightTex = makeAppleParkWindowTexture(true);
  const solarTex = makeAppleParkSolarTexture();

  const wallMatDay = new THREE.MeshStandardMaterial({
    map: dayTex,
    color: 0xeef7ff,
    roughness: 0.28,
    metalness: 0.16,
    side: THREE.DoubleSide,
  });

  const wallMatNight = new THREE.MeshStandardMaterial({
    map: nightTex,
    emissive: new THREE.Color(0xffe6a3),
    emissiveMap: nightTex,
    emissiveIntensity: 1.15,
    roughness: 0.35,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const louverMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const solarRoofMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.32,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  // 1. 主环形飞船外圈与内圈玻璃立面
  const outerCylGeo = new THREE.CylinderGeometry(OUTER_R, OUTER_R, BUILDING_H, 128, 1, true);
  const outerWall = new THREE.Mesh(outerCylGeo, wallMatDay);
  outerWall.position.y = BUILDING_H / 2;
  outerWall.userData.isWall = true;
  group.add(outerWall);

  const innerCylGeo = new THREE.CylinderGeometry(INNER_R, INNER_R, BUILDING_H, 128, 1, true);
  const innerWall = new THREE.Mesh(innerCylGeo, wallMatDay);
  innerWall.position.y = BUILDING_H / 2;
  innerWall.userData.isWall = true;
  group.add(innerWall);

  // 2. 每层的纯白悬挑遮阳板与檐口 (Louvers & Canopies)
  for (let f = 0; f <= FLOORS; f++) {
    const y = f * FLOOR_H;
    const outLouverGeo = new THREE.RingGeometry(OUTER_R - 0.4, OUTER_R + 2.5, 128);
    outLouverGeo.rotateX(-Math.PI / 2);
    const outLouver = new THREE.Mesh(outLouverGeo, louverMat);
    outLouver.position.y = y;
    group.add(outLouver);

    const inLouverGeo = new THREE.RingGeometry(INNER_R - 2.5, INNER_R + 0.4, 128);
    inLouverGeo.rotateX(-Math.PI / 2);
    const inLouver = new THREE.Mesh(inLouverGeo, louverMat);
    inLouver.position.y = y;
    group.add(inLouver);
  }

  // 3. 环形屋顶太阳能光伏阵列 (17MW Rooftop Solar Array)
  const roofGeo = new THREE.RingGeometry(INNER_R, OUTER_R, 128);
  roofGeo.rotateX(-Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, solarRoofMat);
  roof.position.y = BUILDING_H + 0.05;
  group.add(roof);

  // 4. 建筑环形混凝土地基座
  const baseGeo = new THREE.RingGeometry(INNER_R - 1.5, OUTER_R + 1.5, 128);
  baseGeo.rotateX(-Math.PI / 2);
  const base = new THREE.Mesh(baseGeo, concreteMat);
  base.position.y = 0.05;
  group.add(base);

  // 5. 中央生态公园庭院 (Courtyard Park)
  const lawnGeo = new THREE.CircleGeometry(INNER_R - 0.5, 96);
  lawnGeo.rotateX(-Math.PI / 2);
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b35,
    roughness: 0.92,
    metalness: 0.02,
  });
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.position.y = 0.1;
  group.add(lawn);

  // 庭院环形散步步道 (Park Loop Pathways)
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0xd8d0c0,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const pathOuterGeo = new THREE.RingGeometry(116, 120, 64);
  pathOuterGeo.rotateX(-Math.PI / 2);
  const pathOuter = new THREE.Mesh(pathOuterGeo, pathMat);
  pathOuter.position.y = 0.15;
  group.add(pathOuter);

  const pathInnerGeo = new THREE.RingGeometry(56, 59, 48);
  pathInnerGeo.rotateX(-Math.PI / 2);
  const pathInner = new THREE.Mesh(pathInnerGeo, pathMat);
  pathInner.position.y = 0.15;
  group.add(pathInner);

  // 中央椭圆反光池 (Reflecting Pond)
  const pondGeo = new THREE.CircleGeometry(26, 36);
  pondGeo.rotateX(-Math.PI / 2);
  pondGeo.scale(1.4, 1.0, 0.9);
  const pondMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.12,
    metalness: 0.45,
  });
  const pond = new THREE.Mesh(pondGeo, pondMat);
  pond.position.set(-36, 0.2, -42);
  pond.rotation.y = 0.4;
  group.add(pond);

  // 标志性彩虹拱门舞台 (The Rainbow Stage / Arches by Jony Ive)
  const rainbowColors = [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x3b82f6, 0xa855f7];
  const rainbowGroup = new THREE.Group();
  rainbowGroup.position.set(25, 0, 15);
  rainbowGroup.rotation.y = -0.5;

  rainbowColors.forEach((color, idx) => {
    const r = 9 + idx * 1.5;
    const archGeo = new THREE.TorusGeometry(r, 0.45, 12, 32, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.1,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, 0, (idx - 2.5) * 1.0);
    rainbowGroup.add(arch);
  });
  group.add(rainbowGroup);

  // 庭院加州原生果树群落 (Tree Clusters)
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const treeColors = [0x2e6128, 0x3f7236, 0x4d7d42, 0x35632d];
  const treeMats = treeColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));

  const treeTrunkGeo = new THREE.CylinderGeometry(0.45, 0.7, 4.5, 6);
  treeTrunkGeo.translate(0, 2.25, 0);
  const treeFoliageGeo = new THREE.DodecahedronGeometry(3.6, 1);
  treeFoliageGeo.translate(0, 5.8, 0);

  let seed = 42;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < 55; i++) {
    const dist = 30 + rnd() * (INNER_R - 40);
    const ang = rnd() * Math.PI * 2;
    const tx = Math.cos(ang) * dist;
    const tz = Math.sin(ang) * dist;

    const dx = tx - -36;
    const dz = tz - -42;
    if (Math.hypot(dx, dz) < 32) continue;

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    const fMat = treeMats[Math.floor(rnd() * treeMats.length)];
    const foliage = new THREE.Mesh(treeFoliageGeo, fMat);
    const s = 0.75 + rnd() * 0.45;
    foliage.scale.set(s, s * 1.1, s);

    tree.add(trunk, foliage);
    tree.position.set(tx, 0.1, tz);
    group.add(tree);
  }

  // 6. 史蒂夫·乔布斯剧院 (Steve Jobs Theater)
  const theaterGroup = new THREE.Group();
  theaterGroup.position.set(225, 0, 175);

  const moundGeo = new THREE.CylinderGeometry(38, 48, 3.8, 36);
  const mound = new THREE.Mesh(moundGeo, lawnMat);
  mound.position.y = 1.9;
  theaterGroup.add(mound);

  const THEATER_R = 23.5;
  const THEATER_H = 6.4;
  const glassPavilionGeo = new THREE.CylinderGeometry(THEATER_R, THEATER_R, THEATER_H, 48, 1, true);
  const theaterGlassMatDay = new THREE.MeshStandardMaterial({
    color: 0xebf6ff,
    opacity: 0.55,
    transparent: true,
    roughness: 0.12,
    metalness: 0.14,
    side: THREE.DoubleSide,
  });
  const theaterGlassMatNight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffe2a0),
    emissiveIntensity: 0.95,
    opacity: 0.85,
    transparent: true,
    roughness: 0.2,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const glassPavilion = new THREE.Mesh(glassPavilionGeo, theaterGlassMatDay);
  glassPavilion.position.y = 3.8 + THEATER_H / 2;
  glassPavilion.userData.isTheaterGlass = true;
  theaterGroup.add(glassPavilion);

  const roofDiscGeo = new THREE.CylinderGeometry(THEATER_R + 1.6, THEATER_R + 1.6, 1.2, 48);
  const carbonRoofMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    metalness: 0.32,
    roughness: 0.28,
  });
  const roofDisc = new THREE.Mesh(roofDiscGeo, carbonRoofMat);
  roofDisc.position.y = 3.8 + THEATER_H + 0.6;
  theaterGroup.add(roofDisc);

  const coreGeo = new THREE.CylinderGeometry(6, 6, THEATER_H, 24);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.15,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 3.8 + THEATER_H / 2;
  core.userData.isTheaterCore = true;
  theaterGroup.add(core);

  group.add(theaterGroup);

  // 7. 夜景模式切换逻辑
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      if ((c as THREE.Mesh).userData?.isWall) {
        (c as THREE.Mesh).material = night ? wallMatNight : wallMatDay;
      }
      if ((c as THREE.Mesh).userData?.isTheaterGlass) {
        (c as THREE.Mesh).material = night ? theaterGlassMatNight : theaterGlassMatDay;
      }
    });
  };

  return group;
}

// --- 13. 悉尼歌剧院 (Sydney Opera House) 考证级球面几何与双大厅建筑重构 ---
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

function createSydneyOperaHouse(_kit: SurfaceKit): THREE.Group {
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

function createChengduGlobalCenter(_kit: SurfaceKit): THREE.Group {
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

// --- 15. 港珠澳大桥 · 东人工岛与桥塔 (HZMB) 精细化重构 ---
function createHZMB(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "HZMB";

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0f4064,
    roughness: 0.22,
    metalness: 0.25,
  });
  const islandConcreteMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.65,
    metalness: 0.1,
  });
  const revetmentMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.88,
    metalness: 0.08,
  });
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.22,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.12,
    metalness: 0.85,
  });
  const knotMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // 经典中华朱红
    roughness: 0.28,
    metalness: 0.25,
  });
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.9,
    metalness: 0.02,
  });
  const roadSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
    metalness: 0.08,
  });
  const redRoadMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.82,
    metalness: 0.05,
  });

  // 1. 伶仃洋海平面基座 (Lingdingyang Sea Disc)
  const sea = new THREE.Mesh(new THREE.CylinderGeometry(1400, 1400, 0.4, 64), waterMat);
  sea.position.y = -0.2;
  sea.userData.skipLines = true;
  group.add(sea);

  // 2. 蚝贝造型东人工岛 (Aerodynamic Teardrop Reclaimed Island)
  // 岛屿中心设在 z = 40m，全长 620m（z: -240m ~ +220m），宽 190m（x: -95m ~ +95m）
  const rimGeo = new THREE.CylinderGeometry(88, 108, 6.8, 60);
  rimGeo.scale(1.08, 1.0, 2.65);
  const rim = new THREE.Mesh(rimGeo, revetmentMat);
  rim.position.set(0, 3.4, 0);
  rim.userData.skipLines = true;
  group.add(rim);

  const deckGeo = new THREE.CylinderGeometry(84, 84, 7.5, 60);
  deckGeo.scale(1.02, 1.0, 2.58);
  const deck = new THREE.Mesh(deckGeo, islandConcreteMat);
  deck.position.set(0, 4.2, 0);
  deck.userData.skipLines = true;
  group.add(deck);

  // 岛面沥青外环通道与安全护栏
  const perimeterRoadGeo = new THREE.RingGeometry(80, 84, 60);
  perimeterRoadGeo.scale(1.0, 2.52, 1.0);
  perimeterRoadGeo.rotateX(-Math.PI / 2);
  const perimeterRoad = new THREE.Mesh(perimeterRoadGeo, roadSurfaceMat);
  perimeterRoad.position.set(0, 8.0, 0);
  perimeterRoad.userData.skipLines = true;
  group.add(perimeterRoad);

  // 岛心绿化景观草坪
  const islandLawnGeo = new THREE.CylinderGeometry(64, 64, 0.4, 48);
  islandLawnGeo.scale(0.88, 1.0, 2.1);
  const islandLawn = new THREE.Mesh(islandLawnGeo, lawnMat);
  islandLawn.position.set(0, 8.1, 0);
  islandLawn.userData.skipLines = true;
  group.add(islandLawn);

  // 3. 岛上流线游轮展翼型综合服务楼 (Streamlined Cruise-Ship Shell Terminal Complex)
  // 真实复现三层流线型圆弧退台、深蓝建筑采光玻璃带与顶部白色飞翼遮阳檐
  const bldgBaseZ = 95;
  for (let tier = 0; tier < 3; tier++) {
    const tw = 48 - tier * 4.5;
    const tl = 88 - tier * 9;
    const ty = 8.5 + tier * 5.2;

    // 白色楼板与露台
    const floorGeo = new THREE.CylinderGeometry(tw / 2, (tw + 2) / 2, 1.2, 36);
    floorGeo.scale(1.0, 1.0, tl / tw);
    const floorMesh = new THREE.Mesh(floorGeo, bridgeMat);
    floorMesh.position.set(0, ty + 0.6, bldgBaseZ);
    group.add(floorMesh);

    // 环形深蓝采光玻璃幕墙
    const glassGeo = new THREE.CylinderGeometry((tw - 2.5) / 2, (tw - 2.5) / 2, 4.0, 36);
    glassGeo.scale(1.0, 1.0, (tl - 4) / tw);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, ty + 3.2, bldgBaseZ);
    group.add(glassMesh);
  }

  // 服务楼顶部大跨度流线飞翼遮阳天幕 (Curved White Aerodynamic Roof Canopy)
  const canopyGeo = new THREE.CylinderGeometry(18, 22, 1.8, 36);
  canopyGeo.scale(1.0, 1.0, 2.4);
  const canopy = new THREE.Mesh(canopyGeo, bridgeMat);
  canopy.position.set(0, 25.2, bldgBaseZ);
  group.add(canopy);

  // 标志性白色海事指挥控制塔锥体与天线通信桅杆 (Marine Control Observation Spire)
  const spireCone = new THREE.Mesh(new THREE.ConeGeometry(5.2, 11, 24), bridgeMat);
  spireCone.position.set(0, 31.5, bldgBaseZ + 8);
  const spireMast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 16, 12), bridgeMat);
  spireMast.position.set(0, 42.0, bldgBaseZ + 8);
  group.add(spireCone, spireMast);

  // 南侧专用海事工程维护码头 (Maintenance Service Wharf)
  const wharfMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const wharf = new THREE.Mesh(new THREE.BoxGeometry(45, 4.2, 28), wharfMat);
  wharf.position.set(-88, 3.8, 10);
  wharf.userData.skipLines = true;
  group.add(wharf);

  // 4. 沉管隧道入口敞开段与减光罩拱棚群 (Subsea Tunnel Portal & White Louver Pergolas)
  // 道路由地面 +8m 顺坡向下倾斜入海至 -12m，上方覆盖 14 组白色连续减光门架
  const tunnelRampGeo = new THREE.BoxGeometry(34, 8, 140);
  tunnelRampGeo.rotateX(-0.11);
  const tunnelRamp = new THREE.Mesh(tunnelRampGeo, revetmentMat);
  tunnelRamp.position.set(0, 2.0, -85);
  tunnelRamp.userData.skipLines = true;
  group.add(tunnelRamp);

  // 隧道斜坡上的双向沥青路面与中央红色减速警示带
  const rampRoad = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 140), roadSurfaceMat);
  rampRoad.rotateX(-0.11);
  rampRoad.position.set(0, 6.2, -85);
  rampRoad.userData.skipLines = true;
  const redDecelStrip = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.45, 138), redRoadMat);
  redDecelStrip.rotateX(-0.11);
  redDecelStrip.position.set(0, 6.25, -85);
  redDecelStrip.userData.skipLines = true;
  group.add(rampRoad, redDecelStrip);

  // 标志性白色连续减光遮阳拱棚 (White Sunshade Louver Pergolas) - 14道平行门架
  const louverMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.15,
  });
  for (let lz = -35; lz >= -135; lz -= 7.5) {
    const louverProgress = (-35 - lz) / 100;
    const louverY = 12.5 - louverProgress * 11.0;
    // 门式拱棚横梁与立柱
    const beam = new THREE.Mesh(new THREE.BoxGeometry(31, 1.4, 1.8), louverMat);
    beam.position.set(0, louverY, lz);
    const colLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.5, 1.8), louverMat);
    colLeft.position.set(-14.8, louverY - 2.2, lz);
    const colRight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.5, 1.8), louverMat);
    colRight.position.set(14.8, louverY - 2.2, lz);
    group.add(beam, colLeft, colRight);
  }

  // 沉管隧道主洞门暗埋段 (Tunnel Portal Structure)
  const tunnelPortal = new THREE.Mesh(new THREE.BoxGeometry(38, 14, 18), bridgeMat);
  tunnelPortal.position.set(0, 3.5, -155);
  const tunnelVoid = new THREE.Mesh(new THREE.BoxGeometry(28, 9, 20), new THREE.MeshBasicMaterial({ color: 0x050b14 }));
  tunnelVoid.position.set(0, 3.0, -155);
  group.add(tunnelPortal, tunnelVoid);

  // 5. 跨海引桥与青州航道桥主桥面 (Bridge Deck to Hong Kong)
  const BRIDGE_START_Z = 160;
  const BRIDGE_LEN = 800;
  const bridgeDeckBox = new THREE.Mesh(new THREE.BoxGeometry(33, 4.5, BRIDGE_LEN), bridgeMat);
  bridgeDeckBox.position.set(0, 24, BRIDGE_START_Z + BRIDGE_LEN / 2);
  group.add(bridgeDeckBox);

  // 沥青行车道与中央隔离护栏
  const bridgeRoad = new THREE.Mesh(new THREE.BoxGeometry(31, 0.8, BRIDGE_LEN), roadSurfaceMat);
  bridgeRoad.position.set(0, 26.5, BRIDGE_START_Z + BRIDGE_LEN / 2);
  bridgeRoad.userData.skipLines = true;
  group.add(bridgeRoad);

  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65 });
  const medianBarrier = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, BRIDGE_LEN), barrierMat);
  medianBarrier.position.set(0, 27.5, BRIDGE_START_Z + BRIDGE_LEN / 2);
  medianBarrier.userData.skipLines = true;
  group.add(medianBarrier);

  // 桥墩立柱 (Piers)
  for (let pz = BRIDGE_START_Z + 40; pz <= BRIDGE_START_Z + BRIDGE_LEN - 30; pz += 85) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6, 24, 16), islandConcreteMat);
    pier.position.set(0, 12, pz);
    group.add(pier);
  }

  // 6. 青州航道桥双塔与「中国结」空间造型 (Twin Cable-stayed Towers with Chinese Knot)
  const towerZs = [BRIDGE_START_Z + 320, BRIDGE_START_Z + 540];
  const cableLines: number[] = [];

  towerZs.forEach((tz) => {
    // 门形双肢塔柱 (Left & right tower shafts along X, 160m tall)
    const legGeo = new THREE.BoxGeometry(7.5, 145, 6.5);
    const leftLeg = new THREE.Mesh(legGeo, bridgeMat);
    leftLeg.position.set(-18, 72, tz);
    leftLeg.rotation.z = 0.045;
    const rightLeg = new THREE.Mesh(legGeo, bridgeMat);
    rightLeg.position.set(18, 72, tz);
    rightLeg.rotation.z = -0.045;
    group.add(leftLeg, rightLeg);

    // 塔顶横梁 (Top cross strut)
    const topStrut = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 8), bridgeMat);
    topStrut.position.set(0, 142, tz);
    group.add(topStrut);

    // 精致传统「中国结」空间钢架剪刀撑 (Central Diamond + 4 Circular Ear Loops)
    const knotGroup = new THREE.Group();
    knotGroup.position.set(0, 114, tz);

    const diamondRing = new THREE.Mesh(new THREE.TorusGeometry(8, 1.35, 16, 4), knotMat);
    diamondRing.rotation.z = Math.PI / 4;
    knotGroup.add(diamondRing);

    const leftEar = new THREE.Mesh(new THREE.TorusGeometry(4.8, 1.1, 16, 24), knotMat);
    leftEar.position.set(-9.5, 0, 0);
    const rightEar = new THREE.Mesh(new THREE.TorusGeometry(4.8, 1.1, 16, 24), knotMat);
    rightEar.position.set(9.5, 0, 0);
    const topLoop = new THREE.Mesh(new THREE.TorusGeometry(4.8, 1.1, 16, 24), knotMat);
    topLoop.position.set(0, 9.5, 0);
    const btmLoop = new THREE.Mesh(new THREE.TorusGeometry(4.8, 1.1, 16, 24), knotMat);
    btmLoop.position.set(0, -9.5, 0);
    knotGroup.add(leftEar, rightEar, topLoop, btmLoop);

    group.add(knotGroup);

    // 空间双索面斜拉索群 (Fan-shaped Stay-cables spreading along Z)
    for (let c = 1; c <= 8; c++) {
      const spread = c * 22;
      const anchorY = 78 + c * 7.5;
      cableLines.push(-14, anchorY, tz, -14, 26, tz - spread);
      cableLines.push(-14, anchorY, tz, -14, 26, tz + spread);
      cableLines.push(14, anchorY, tz, 14, 26, tz - spread);
      cableLines.push(14, anchorY, tz, 14, 26, tz + spread);
    }
  });

  const cableGeo = new THREE.BufferGeometry();
  cableGeo.setAttribute("position", new THREE.Float32BufferAttribute(cableLines, 3));
  const cableLineMesh = new THREE.LineSegments(
    cableGeo,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
  );
  group.add(cableLineMesh);

  return group;
}

// --- 16. 旧金山金门大桥 (Golden Gate Bridge) 精细化与精准南北朝向重构 ---
function createGoldenGateBridge(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "GoldenGateBridge";

  const ORANGE = 0xc0362c; // International Orange
  const towerMat = new THREE.MeshStandardMaterial({
    color: ORANGE,
    roughness: 0.42,
    metalness: 0.38,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: ORANGE,
    roughness: 0.48,
    metalness: 0.28,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x183755,
    roughness: 0.15,
    metalness: 0.45,
  });
  const roadSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.1,
  });

  // 1. 金门海峡水面基座（沿南北长轴 Z 分布）
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 1600), waterMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  group.add(sea);

  // 2. 桥梁加劲钢桁架路面板 (Bridge Deck, length 1300m along Z, width 26m, height 35m)
  const DECK_Y = 35;
  const DECK_LEN = 1300;
  const DECK_W = 26;

  // 沥青行车道路面
  const roadDeck = new THREE.Mesh(new THREE.BoxGeometry(DECK_W - 2, 1.2, DECK_LEN), roadSurfaceMat);
  roadDeck.position.set(0, DECK_Y + 3.2, 0);
  group.add(roadDeck);

  // 桥身左右加劲钢桁架梁 (Warren Truss Side Girders)
  for (let side = -1; side <= 1; side += 2) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, DECK_LEN), deckMat);
    truss.position.set(side * (DECK_W / 2 - 0.7), DECK_Y, 0);
    group.add(truss);
  }

  // 3. 装饰艺术（Art Deco）双塔（南塔 z = -320m 面向旧金山，北塔 z = +320m 面向马林郡，塔高 134m）
  const towerZs = [-320, 320];
  const TOWER_TOP_Y = 134;

  towerZs.forEach((tz) => {
    // 混凝土抗剪切桥墩基座 (Concrete Pier Foundation with Cutwaters)
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(38, 14, 28),
      new THREE.MeshStandardMaterial({ color: 0x827b70, roughness: 0.92 })
    );
    pier.position.set(0, 7, tz);
    group.add(pier);

    // 左右塔肢（X 间距 23m，在 x = -11.5 与 x = +11.5）
    for (let side = -1; side <= 1; side += 2) {
      const tx = side * 11.5;
      // 4 级垂直阶梯内收 (4 Art Deco Stepped Tiers)
      const tiers = [
        { w: 9.5, d: 8.5, h: 32, y: 14 + 16 },
        { w: 8.5, d: 7.8, h: 30, y: 46 + 15 },
        { w: 7.5, d: 7.0, h: 28, y: 76 + 14 },
        { w: 6.5, d: 6.2, h: 30, y: 104 + 15 },
      ];
      tiers.forEach((tier) => {
        const tMesh = new THREE.Mesh(new THREE.BoxGeometry(tier.w, tier.h, tier.d), towerMat);
        tMesh.position.set(tx, tier.y, tz);
        group.add(tMesh);
      });
    }

    // 塔顶 Art Deco 阶梯状冠顶饰件 (Tower Top Stepped Crest Finial)
    for (let side = -1; side <= 1; side += 2) {
      const finial = new THREE.Mesh(new THREE.BoxGeometry(5.2, 5.5, 5.2), towerMat);
      finial.position.set(side * 11.5, TOWER_TOP_Y + 2.75, tz);
      group.add(finial);
    }

    // 真实 Art Deco 4 级门架横梁与敞开镂空拱门 (4 Open Portal Windows Between Tower Legs)
    const portalStrutsY = [42, 74, 102, 126];
    portalStrutsY.forEach((sy) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 6.5), towerMat);
      strut.position.set(0, sy, tz);
      group.add(strut);
    });
  });

  // 4. 真实粗管径 3D 悬索主缆 (Thick 3D Main Cable Tubes, radius 0.85m)
  for (let side = -1; side <= 1; side += 2) {
    const cx = side * 11.5;
    const cablePts = [
      new THREE.Vector3(cx, 14, -640),
      new THREE.Vector3(cx, 80, -480),
      new THREE.Vector3(cx, TOWER_TOP_Y, -320),
      new THREE.Vector3(cx, 65, -160),
      new THREE.Vector3(cx, DECK_Y + 3.2, 0),
      new THREE.Vector3(cx, 65, 160),
      new THREE.Vector3(cx, TOWER_TOP_Y, 320),
      new THREE.Vector3(cx, 80, 480),
      new THREE.Vector3(cx, 14, 640),
    ];
    const curve = new THREE.CatmullRomCurve3(cablePts);
    const cableGeo = new THREE.TubeGeometry(curve, 72, 0.85, 8, false);
    const cableMesh = new THREE.Mesh(cableGeo, deckMat);
    group.add(cableMesh);
  }

  // 垂直吊索阵列 (Vertical Suspender Ropes)
  const suspLines: number[] = [];
  for (let z = -580; z <= 580; z += 18) {
    if (Math.abs(z - -320) < 18 || Math.abs(z - 320) < 18) continue;
    // 根据主缆抛物线高度计算吊索顶端 Y
    let cy = DECK_Y + 3.2;
    if (Math.abs(z) <= 320) {
      const u = z / 320;
      cy = DECK_Y + 3.2 + u * u * (TOWER_TOP_Y - (DECK_Y + 3.2));
    } else {
      const u = (Math.abs(z) - 320) / 320;
      cy = TOWER_TOP_Y - u * (TOWER_TOP_Y - 14);
    }

    for (let side = -1; side <= 1; side += 2) {
      const cx = side * 11.5;
      suspLines.push(cx, cy, z, cx, DECK_Y + 3.2, z);
    }
  }

  const suspGeo = new THREE.BufferGeometry();
  suspGeo.setAttribute("position", new THREE.Float32BufferAttribute(suspLines, 3));
  const suspMesh = new THREE.LineSegments(
    suspGeo,
    new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.75 })
  );
  group.add(suspMesh);

  // 5. 南北两端重力式大理石/混凝土锚碇座 (Concrete Anchorages)
  const anchorMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
  const southAnchor = new THREE.Mesh(new THREE.BoxGeometry(45, 24, 48), anchorMat);
  southAnchor.position.set(0, 12, -640);
  const northAnchor = new THREE.Mesh(new THREE.BoxGeometry(45, 24, 48), anchorMat);
  northAnchor.position.set(0, 12, 640);
  group.add(southAnchor, northAnchor);

  return group;
}

function makeSvalbardConcreteTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  // 极地北欧清水混凝土基底色 (Cool Nordic Exposed Architectural Concrete)
  g.fillStyle = "#cbd5e1";
  g.fillRect(0, 0, w, h);

  // 细微水泥骨料杂色颗粒
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const alpha = Math.random() * 0.08;
    g.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(30, 41, 59, ${alpha})`;
    g.fillRect(rx, ry, 1.5, 1.5);
  }

  // 8 块主要水平木模板浇筑拼缝 (Horizontal Timber Formwork Lines)
  const rows = 8;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    // 阴影与高光缝线
    g.fillStyle = "rgba(71, 85, 105, 0.45)";
    g.fillRect(0, y, w, 2);
    g.fillStyle = "rgba(255, 255, 255, 0.55)";
    g.fillRect(0, y + 2, w, 1);

    // 对拉螺栓孔位锚印 (Tie-Rod Anchor Indents)
    for (let x = 32; x < w; x += 64) {
      g.beginPath();
      g.arc(x, y + rh / 2, 3.5, 0, Math.PI * 2);
      g.fillStyle = "rgba(51, 65, 85, 0.6)";
      g.fill();
      g.beginPath();
      g.arc(x, y + rh / 2, 1.5, 0, Math.PI * 2);
      g.fillStyle = "rgba(15, 23, 42, 0.85)";
      g.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 3.0);
  return tex;
}

// --- 17. 斯瓦尔巴全球种子库 (Svalbard Seed Vault) 标志性建筑精细化重构 ---
function createSvalbardSeedVault(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "SvalbardSeedVault";

  const concreteTex = makeSvalbardConcreteTexture();

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.88,
    metalness: 0.02,
    emissive: new THREE.Color(0x1e293b),
    emissiveIntensity: 0.35,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.88,
    metalness: 0.08,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    color: 0xc8d1dc,
    roughness: 0.78,
    metalness: 0.12,
    emissive: new THREE.Color(0x1e293b),
    emissiveIntensity: 0.18,
  });

  const prismMatDay = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.12,
    metalness: 0.75,
  });
  const prismMatNight = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: new THREE.Color(0x06b6d4),
    emissiveIntensity: 2.2,
    roughness: 0.12,
    metalness: 0.85,
  });

  // 1. 标志性破雪而出梯形混凝土入口巨石棱柱 (Platåberget Monolithic Wedge Portal)
  // 尺寸：宽 6.8m (X: -3.4 到 +3.4)，进深 36m (Z: -21 到 +15)，前高 15.5m，后高 6.0m
  const portalW = 6.8;
  const halfW = portalW / 2; // 3.4
  const frontZ = 15.0;
  const frontTopZ = 13.8;
  const backZ = -21.0;
  const frontH = 15.5;
  const rearH = 6.0;
  const lengthZ = frontTopZ - backZ; // 34.8
  const slopeAngle = Math.atan2(frontH - rearH, lengthZ); // 倾斜角
  const slopeLen = Math.hypot(lengthZ, frontH - rearH);
  const midY = (frontH + rearH) / 2; // 10.75
  const midZ = (frontTopZ + backZ) / 2; // -3.6

  // 左右两侧主要厚重混凝土剪力侧墙 (Thick Concrete Flank Walls)
  const wallThick = 0.65;
  const flankShape = new THREE.Shape();
  flankShape.moveTo(frontZ, 0);
  flankShape.lineTo(frontTopZ, frontH);
  flankShape.lineTo(backZ, rearH);
  flankShape.lineTo(backZ, 0);
  flankShape.lineTo(frontZ, 0);

  const flankExtrude: THREE.ExtrudeGeometryOptions = {
    depth: wallThick,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 1,
  };
  const leftFlankGeo = new THREE.ExtrudeGeometry(flankShape, flankExtrude);
  leftFlankGeo.rotateY(-Math.PI / 2);
  leftFlankGeo.translate(-halfW + wallThick, 0, 0);
  const leftFlank = new THREE.Mesh(leftFlankGeo, concreteMat);
  group.add(leftFlank);

  const rightFlankGeo = leftFlankGeo.clone();
  rightFlankGeo.translate(portalW - wallThick, 0, 0);
  const rightFlank = new THREE.Mesh(rightFlankGeo, concreteMat);
  group.add(rightFlank);

  // 后部山体穿透封口墙 (Rear Penetration Wall)
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(portalW, rearH, wallThick), concreteMat);
  rearWall.position.set(0, rearH / 2, backZ + wallThick / 2);
  group.add(rearWall);

  // 顶部主要倾斜混凝土结构顶板 (Sloping Concrete Roof Slab)
  const roofSlabGeo = new THREE.BoxGeometry(portalW, 0.45, slopeLen);
  roofSlabGeo.rotateX(-slopeAngle);
  const roofSlab = new THREE.Mesh(roofSlabGeo, concreteMat);
  roofSlab.position.set(0, midY, midZ);
  group.add(roofSlab);

  // 顶边左右保护封边条 (Parapet Trims)
  const trimGeo = new THREE.BoxGeometry(0.25, 0.35, slopeLen);
  trimGeo.rotateX(-slopeAngle);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65, metalness: 0.15 });
  const leftTrim = new THREE.Mesh(trimGeo, trimMat);
  leftTrim.position.set(-halfW + wallThick / 2, midY + 0.28, midZ);
  const rightTrim = new THREE.Mesh(trimGeo, trimMat);
  rightTrim.position.set(halfW - wallThick / 2, midY + 0.28, midZ);
  group.add(leftTrim, rightTrim);

  // 2. 「永久回响」极光反射水晶多面棱镜艺术屋顶 (Dyveke Sanne's Perpetual Repercussion)
  const artRoofGeo = new THREE.BoxGeometry(portalW - 0.4, 0.35, slopeLen);
  artRoofGeo.rotateX(-slopeAngle);
  const artRoof = new THREE.Mesh(artRoofGeo, prismMatDay);
  artRoof.position.set(0, midY + 0.32, midZ);
  artRoof.userData.isAurora = true;
  group.add(artRoof);

  // 前立面上半部艺术棱镜立面 (Upper Facade Prism Cladding, Y from 5.6 to frontH)
  const alcoveH = 5.6;
  const facadeArtH = frontH - alcoveH;
  const facadeArtGeo = new THREE.BoxGeometry(portalW - 0.4, facadeArtH, 0.35);
  const frontTiltAngle = Math.atan2(frontZ - frontTopZ, frontH);
  facadeArtGeo.rotateX(-frontTiltAngle);
  const facadeArt = new THREE.Mesh(facadeArtGeo, prismMatDay);
  const midFacadeY = (alcoveH + frontH) / 2;
  const midFacadeZ = frontZ - (midFacadeY / frontH) * (frontZ - frontTopZ) - 0.15;
  facadeArt.position.set(0, midFacadeY, midFacadeZ);
  facadeArt.userData.isAurora = true;
  group.add(facadeArt);

  // 屋面立体晶莹高反光三角尖棱晶簇 (Prismatic Facet Crystal Shards)
  const shardMatDay = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.9,
  });
  for (let s = 0; s < 18; s++) {
    const frac = (s + 0.5) / 18;
    const sz = (frontTopZ - 1.2) - frac * (lengthZ - 2.4);
    const sy = frontH - frac * (frontH - rearH) + 0.45;
    const sx = ((s % 3) - 1) * 1.8 + ((s % 2) - 0.5) * 0.3;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.95, 3), shardMatDay);
    shard.position.set(sx, sy, sz);
    shard.rotation.x = -slopeAngle;
    shard.rotation.y = s * 1.1;
    group.add(shard);
  }

  // 3. 深入式重型防爆气密安全门斗 (Recessed Airlock Portal, Inset into Front)
  const alcoveW = portalW - wallThick * 2; // 5.5m
  const alcoveDepth = 2.2;
  const doorZ = frontZ - alcoveDepth; // 12.8

  // 门斗侧面与顶部金属衬板 (Airlock Metal Lining)
  const liningMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.8,
  });
  const alcoveCeiling = new THREE.Mesh(new THREE.BoxGeometry(alcoveW, 0.35, alcoveDepth), liningMat);
  alcoveCeiling.position.set(0, alcoveH, frontZ - alcoveDepth / 2);
  group.add(alcoveCeiling);

  // 重型工业防爆气密双开钢门 (Blast-Proof Double Steel Doors)
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    metalness: 0.92,
    roughness: 0.22,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(alcoveW - 0.4, alcoveH - 0.4, 0.4), doorMat);
  door.position.set(0, alcoveH / 2, doorZ + 0.2);
  group.add(door);

  // 门面中缝密封条与警示黄黑警戒线 (Safety Seal & Hazard Stripes)
  const sealMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    metalness: 0.2,
  });
  const doorSeal = new THREE.Mesh(new THREE.BoxGeometry(0.12, alcoveH - 0.4, 0.45), sealMat);
  doorSeal.position.set(0, alcoveH / 2, doorZ + 0.2);
  group.add(doorSeal);

  // 门楣"SVALBARD GLOBAL SEED VAULT" 发光铭牌 (Illuminated Signage Plaque)
  const signPlateMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(alcoveW - 0.8, 0.65, 0.2), signPlateMat);
  signPlate.position.set(0, alcoveH + 0.45, frontZ - 0.6);
  group.add(signPlate);

  // 门头大功率极地泛光安全照明灯 (Polar Safety Floodlights)
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xfef08a),
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  for (const lx of [-1.6, 1.6]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.35, 12), lampMat);
    lamp.rotation.x = Math.PI / 4;
    lamp.position.set(lx, alcoveH + 1.1, frontZ - 0.5);
    group.add(lamp);
  }

  // 4. 柏拉图山永久冻土山体斜坡与北极雪原地貌 (Platåberget Mountain Slope & Arctic Snow Mantle)
  // 宽 130m，纵深 140m (Z: +45 到 -95)，真实复现末日方舟嵌入北极极地冻土山脉破雪而出的雄伟全貌
  const mountainWidth = 130;
  const mountainDepth = 140;
  const segsX = 48;
  const segsZ = 44;

  function createMountainSlope() {
    const geo = new THREE.PlaneGeometry(mountainWidth, mountainDepth, segsX, segsZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const x = v.x;
      // PlaneGeometry 原点在中心，Z 范围 -70 到 +70
      // 沿 Z 平移，使实际世界坐标 worldZ 覆盖 +45 (引道前端雪原) 到 -95 (柏拉图山平顶台地)
      const worldZ = v.z - 25;

      const isBoundary =
        Math.abs(x) > mountainWidth / 2 - 0.2 ||
        worldZ > 44.5 ||
        worldZ < -94.5;

      if (isBoundary) {
        v.y = -2.0;
      } else {
        let h = 0;
        if (worldZ >= 14) {
          // 前方平缓进场北极雪原区 (Flatter polar apron along access road)
          if (Math.abs(x) < 4.8) {
            h = 0; // 引道中轴完全平整
          } else {
            h = Math.min(1.6, (Math.abs(x) - 4.8) * 0.08);
          }
        } else if (worldZ >= 4) {
          // 门头前部微隆雪坡过渡区，引道与门斗净空开敞
          if (Math.abs(x) < 4.5) {
            h = 0;
          } else {
            h = Math.min(2.5, (Math.abs(x) - 4.5) * 0.14);
          }
        } else if (worldZ >= -21) {
          // 门厅两侧紧贴混凝土侧壁的平滑积雪护坡 (Smooth Flanking Snow Berms)
          const bermProgress = (4 - worldZ) / 25; // 0 到 1
          const maxBermH = 1.0 + bermProgress * 6.2;
          if (Math.abs(x) <= 3.5) {
            // 建筑下方与后部自然垫高连续，杜绝网格断崖伪影
            h = maxBermH * 0.95;
          } else if (Math.abs(x) <= 12) {
            const lateral = (Math.abs(x) - 3.5) / 8.5;
            h = maxBermH * (1.0 - lateral * 0.65);
          } else {
            h = 1.8 + bermProgress * 5.2 + Math.min(8, (Math.abs(x) - 12) * 0.16);
          }
        } else if (worldZ >= -68) {
          // 柏拉图山主坡段向后急剧升高切入冻土岩层 (Main Platåberget Ascending Slope)
          const slopeProgress = (-21 - worldZ) / 47;
          h = 7.2 + 25.0 * Math.pow(slopeProgress, 0.85);
          h += (1.0 - Math.pow(x / 65, 2)) * 3.5;
          h += Math.sin(worldZ * 0.26) * 0.7 + Math.cos(x * 0.16) * 0.5;
        } else {
          // 柏拉图山顶标志性平顶高原台地 (Iconic Flat Summit Mesa of Platåberget)
          h = 32.2 + Math.sin(x * 0.09) * 0.7 + Math.cos(worldZ * 0.14) * 0.4;
        }
        v.y = Math.max(0, h);
      }
      pos.setXYZ(i, v.x, v.y, worldZ);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const mountainGeo = createMountainSlope();
  const mountainSnowMesh = new THREE.Mesh(mountainGeo, snowMat);
  mountainSnowMesh.userData.skipLines = true;
  group.add(mountainSnowMesh);

  // 柏拉图山标志性沉积岩层露头阶地 (Sedimentary Rock Strata Bands)
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.92,
    metalness: 0.06,
  });
  for (const bz of [-38, -62]) {
    const bandMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 2.2, 4.0), bandMat);
    const by = bz === -38 ? 14.5 : 26.5;
    bandMesh.position.set(0, by, bz);
    bandMesh.userData.skipLines = true;
    group.add(bandMesh);
  }

  // 出露的深色玄武岩碎石碎屑 (Basalt Scree Boulders along snow berms)
  for (const side of [-1, 1]) {
    for (let r = 0; r < 5; r++) {
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 + (r % 2) * 0.6, 1), rockMat);
      boulder.position.set(side * (7.2 + r * 2.2), 0.7 + (r % 2) * 0.3, frontZ - 4 - r * 5.2);
      boulder.userData.skipLines = true;
      group.add(boulder);
    }
  }

  // 5. 进场砂石引道与安全护桩 (Raised Access Causeway & Security Bollards)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.9,
    metalness: 0.05,
  });
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 42), roadMat);
  causeway.position.set(0, 0.3, frontZ + 21);
  causeway.userData.skipLines = true;
  group.add(causeway);
  group.add(causeway);

  // 两侧不锈钢安全护柱与警示指示灯 (Security Bollards with Top LED Rings)
  const bollardMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.25,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 1.5,
  });
  for (let bz = frontZ + 4; bz <= frontZ + 40; bz += 8) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.3, 12), bollardMat);
      post.position.set(side * 4.2, 0.95, bz);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 12), ledMat);
      ring.position.set(side * 4.2, 1.45, bz);
      group.add(post, ring);
    }
  }

  // 气象与卫星通信塔 (Polar Telemetry Mast)
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const commMast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 16, 8), mastMat);
  commMast.position.set(16, 11, backZ + 8);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), mastMat);
  dish.rotation.x = -Math.PI / 3;
  dish.position.set(16, 17, backZ + 8);
  group.add(commMast, dish);

  // 6. 昼夜模式切换 (Dynamic Aurora Repercussion Lighting)
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.userData?.isAurora) {
        mesh.material = night ? prismMatNight : prismMatDay;
      }
    });
  };

  return group;
}

// ─────────────────────────────────────────────────────────
// 18. 纽约自由女神像 (Statue of Liberty)
// 伍德堡十一角星形要塞、亨特花岗岩基座、埃菲尔熟铁弹性骨架与自洁氧化铜绿神像
// ─────────────────────────────────────────────────────────
export function createStatueOfLiberty(kit: SurfaceKit) {
  const root = new THREE.Group();
  root.name = "StatueOfLiberty";

  // 材质体系
  const fortStone = mapped(kit.redSandstone, { color: 0x8a624a, roughness: 0.88, bumpScale: 0.32, metersPerTile: 3.5 });
  const fortPaving = mapped(kit.arena, { color: 0x9e9284, roughness: 0.9, metersPerTile: 5 });
  const pedestalBase = mapped(kit.colosseum, { color: 0xbdb09e, roughness: 0.78, bumpScale: 0.25, metersPerTile: 3 });
  const pedestalTrim = stone(0xcbc1b2, 0.68);
  const pedestalShadow = stone(0x42382e, 0.92);
  const bronzePlinth = stone(0x38322a, 0.75, 0.25);

  const copperDay = new THREE.MeshStandardMaterial({
    color: 0x62bfa5,
    roughness: 0.62,
    metalness: 0.18,
  });
  const copperDark = new THREE.MeshStandardMaterial({
    color: 0x478f79,
    roughness: 0.72,
    metalness: 0.12,
  });
  const copperHighlight = new THREE.MeshStandardMaterial({
    color: 0x76ceb6,
    roughness: 0.56,
    metalness: 0.22,
  });

  const torchGoldDay = new THREE.MeshStandardMaterial({
    color: 0xffd23f,
    roughness: 0.22,
    metalness: 0.92,
    emissive: 0xffaa00,
    emissiveIntensity: 0.35,
  });
  const torchGoldNight = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    roughness: 0.15,
    metalness: 0.95,
    emissive: 0xffb703,
    emissiveIntensity: 1.8,
  });

  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1a3340, roughness: 0.25, metalness: 0.35 });
  const lawnMat = mapped(kit.grass, { color: 0x3d6635, roughness: 0.95, metersPerTile: 10 });
  const walkMat = mapped(kit.arena, { color: 0xbdb3a4, roughness: 0.85, metersPerTile: 4 });
  const pierMat = stone(0x64748b, 0.85);

  // 1. 自由岛海堤、滨海步道与渡轮码头 (Liberty Island Pier & Promenades, y = 0 ~ 1.5m)
  cyl(root, seaMat, 118, 124, 1.2, 0, 0, 0, 32);
  const islandGround = cyl(root, walkMat, 116, 118, 1.5, 0, 0, 0, 32);
  islandGround.receiveShadow = true;

  // 东侧渡轮码头栈桥 (Ferry Dock Pier projecting east into the bay)
  box(root, pierMat, 14.0, 1.6, 38.0, 0, 0.4, 130.0);
  box(root, pedestalTrim, 16.0, 0.8, 18.0, 0, 1.6, 142.0); // 码头雨棚候船亭
  for (const bz of [118, 128, 138, 146]) {
    cyl(root, bronzePlinth, 0.4, 0.4, 2.4, -7.5, 0.8, bz, 8); // 缆桩
    cyl(root, bronzePlinth, 0.4, 0.4, 2.4, +7.5, 0.8, bz, 8);
  }

  // 绿地草坪分布环与树木带
  for (const angle of [0.5, 1.1, 1.7, 2.4, 3.8, 4.4, 5.0, 5.6]) {
    const lx = Math.cos(angle) * 82;
    const lz = Math.sin(angle) * 82;
    const lawn = new THREE.Mesh(new THREE.CylinderGeometry(15, 17, 0.4, 8), lawnMat);
    lawn.position.set(lx, 1.5, lz);
    root.add(lawn);

    // 几株低多边形小树增加真实生机
    cyl(root, fortStone, 0.35, 0.45, 3.2, lx + 4, 1.7, lz + 2, 6);
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(2.4, 6, 6), lawnMat);
    foliage.position.set(lx + 4, 4.2, lz + 2);
    root.add(foliage);
  }

  // 西侧主旗杆广场 (Flagpole Plaza)
  box(root, fortPaving, 22.0, 0.3, 22.0, 0, 1.6, -72.0);
  cyl(root, stone(0xe2e8f0, 0.4, 0.6), 0.25, 0.4, 24.0, 0, 1.8, -72.0, 8); // 白漆主旗杆
  // 星条旗飘扬小网格
  const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 }));
  flagMesh.position.set(2.2, 23.5, -72.0);
  root.add(flagMesh);

  // 2. 伍德堡 11 角星形红垒 (Fort Wood 11-Pointed Star Bastion, y = 1.5 ~ 9.0m)
  const starShape = new THREE.Shape();
  const numPoints = 11;
  const outerR = 48.0;
  const innerR = 30.5;
  const totalVertices = numPoints * 2;
  for (let i = 0; i <= totalVertices; i++) {
    const theta = (i / totalVertices) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = Math.cos(theta) * r;
    const pz = Math.sin(theta) * r;
    if (i === 0) starShape.moveTo(px, pz);
    else starShape.lineTo(px, pz);
  }
  const fortGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 7.2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.8,
    bevelThickness: 0.6,
  });
  fortGeo.rotateX(Math.PI / 2);
  const fortMesh = new THREE.Mesh(fortGeo, fortStone);
  fortMesh.position.set(0, 8.7, 0);
  root.add(fortMesh);

  // 堡垒内部铺砌平台 (y = 8.7m)
  cyl(root, fortPaving, 28, 28, 0.6, 0, 8.7, 0, 24);

  // 伍德堡角堡夜间仰射投光灯 (Bastion Architectural Floodlights)
  const floodlights: THREE.SpotLight[] = [];
  const floodPositions: [number, number, number][] = [
    [-24, 9.2, -24],
    [24, 9.2, -24],
    [-24, 9.2, 24],
    [24, 9.2, 24],
  ];
  for (const [fx, fy, fz] of floodPositions) {
    const spot = new THREE.SpotLight(0xffecd1, 0, 110, 0.58, 0.45, 1.2);
    spot.position.set(fx, fy, fz);
    spot.target.position.set(0, 64, 0);
    root.add(spot);
    root.add(spot.target);
    floodlights.push(spot);
    cyl(root, bronzePlinth, 0.45, 0.55, 0.7, fx, fy - 0.2, fz, 6);
  }

  // 3. 理查德·莫里斯·亨特古典主义花岗岩基座 (Hunt Pedestal, y = 9.3 ~ 47.0m)
  // A. 基座下层台基 (Terrace Plinth, y = 9.3 ~ 16.5m)
  box(root, pedestalBase, 27.0, 3.2, 27.0, 0, 9.3, 0);
  box(root, pedestalTrim, 25.4, 0.8, 25.4, 0, 12.5, 0);
  box(root, pedestalBase, 23.8, 3.2, 23.8, 0, 13.3, 0);
  box(root, pedestalTrim, 22.4, 0.8, 22.4, 0, 16.5, 0);

  // 四方对称古典纪念碑山墙门斗与大台阶
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const portalGrp = new THREE.Group();
    box(portalGrp, pedestalBase, 8.4, 6.0, 2.2, 0, 9.5, 12.2);
    box(portalGrp, pedestalShadow, 4.2, 5.0, 0.5, 0, 9.5, 13.2);

    // 门斗外凸台阶
    for (let st = 0; st < 6; st++) {
      box(portalGrp, pedestalTrim, 7.6 - st * 0.4, 0.45, 0.6, 0, 9.5 + st * 0.4, 13.4 + (5 - st) * 0.55);
    }

    const pedimentGeo = new THREE.ConeGeometry(5.2, 2.0, 3);
    pedimentGeo.rotateZ(Math.PI);
    pedimentGeo.rotateY(Math.PI / 6);
    const pediment = new THREE.Mesh(pedimentGeo, pedestalTrim);
    pediment.position.set(0, 16.2, 12.0);
    portalGrp.add(pediment);
    portalGrp.rotation.y = rot;
    root.add(portalGrp);
  }

  // B. 基座中层柱廊体 (Colonnade Tower, y = 17.3 ~ 35.0m, 收分梯形台)
  const midTower = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 10.4, 17.7, 4),
    pedestalBase
  );
  midTower.rotation.y = Math.PI / 4;
  midTower.position.set(0, 17.3 + 17.7 / 2, 0);
  root.add(midTower);

  // 四面壁柱 (Engaged Classical Pilasters) 与凹窗
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const wallGrp = new THREE.Group();
    box(wallGrp, pedestalShadow, 10.5, 14.5, 0.4, 0, 18.5, 8.4);
    for (const px of [-4.2, -1.4, 1.4, 4.2]) {
      cyl(wallGrp, pedestalTrim, 0.45, 0.5, 15.2, px, 18.2, 8.6, 8);
    }
    box(wallGrp, pedestalTrim, 12.6, 0.9, 1.2, 0, 33.6, 8.5);
    wallGrp.rotation.y = rot;
    root.add(wallGrp);
  }

  // C. 悬挑观景阳台与顶层柱顶盘 (Observation Gallery, y = 35.0 ~ 46.8m)
  box(root, pedestalTrim, 18.2, 1.2, 18.2, 0, 35.0, 0);
  box(root, bronzePlinth, 18.4, 0.9, 0.25, 0, 36.2, 8.9);
  box(root, bronzePlinth, 18.4, 0.9, 0.25, 0, 36.2, -8.9);
  box(root, bronzePlinth, 0.25, 0.9, 18.4, 8.9, 36.2, 0);
  box(root, bronzePlinth, 0.25, 0.9, 18.4, -8.9, 36.2, 0);

  // 顶层盾徽阁楼 (Attic Tier with 40 State Shields)
  box(root, pedestalBase, 15.4, 7.8, 15.4, 0, 36.2, 0);
  for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const shieldGrp = new THREE.Group();
    for (const sx of [-4.5, -1.5, 1.5, 4.5]) {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.35, 12), pedestalTrim);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(sx, 40.5, 7.85);
      shieldGrp.add(shield);
    }
    shieldGrp.rotation.y = rot;
    root.add(shieldGrp);
  }
  box(root, pedestalTrim, 14.2, 1.2, 14.2, 0, 44.0, 0);
  box(root, bronzePlinth, 12.0, 1.4, 12.0, 0, 45.2, 0);

  // 4. 自由女神像主体 (Statue Sculpture, y = 46.6 ~ 93.0m)
  const statueGroup = new THREE.Group();

  // A. 铜像底座与脚下断裂镣铐 (Broken Shackles & Plinth, y = 46.6 ~ 49.0m)
  box(statueGroup, copperDark, 9.6, 1.2, 9.6, 0, 46.6, 0);
  const chain1 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.2, 6, 12), bronzePlinth);
  chain1.position.set(1.4, 47.9, 2.2);
  chain1.rotation.x = Math.PI / 3;
  const chain2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 6, 12), bronzePlinth);
  chain2.position.set(2.4, 47.7, 2.6);
  chain2.rotation.y = Math.PI / 4;
  statueGroup.add(chain1, chain2);

  // B. 经典的古罗马长袍下摆与前迈步伐 (Contrapposto Lower Skirt, y = 47.8 ~ 68.0m)
  const skirtLower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 5.2, 11.5, 14),
    copperDay
  );
  skirtLower.position.set(0, 47.8 + 11.5 / 2, 0.3);
  statueGroup.add(skirtLower);

  // 裙摆深凹垂直褶皱筋线 (14 条竖向深褶折线，营造极其逼真的冲压铜皮阴影感)
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const rT = 3.65;
    const rB = 5.25;
    const fxT = Math.cos(angle) * rT;
    const fzT = Math.sin(angle) * rT;
    const fxB = Math.cos(angle) * rB;
    const fzB = Math.sin(angle) * rB;
    const foldGeo = new THREE.CylinderGeometry(0.28, 0.42, 11.6, 4);
    const fold = new THREE.Mesh(foldGeo, copperDark);
    fold.position.set((fxT + fxB) / 2, 47.8 + 11.6 / 2, (fzT + fzB) / 2 + 0.3);
    fold.rotation.y = angle;
    statueGroup.add(fold);
  }

  // C. 裙袍中段与腰身 (Waist & Stola Drapery, y = 59.3 ~ 72.5m)
  const skirtMid = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 3.7, 13.2, 14),
    copperDay
  );
  skirtMid.position.set(-0.1, 59.3 + 13.2 / 2, 0.1);
  statueGroup.add(skirtMid);

  // 斜向披肩挂布 (Mantle across chest and left shoulder)
  const mantle = new THREE.Mesh(
    new THREE.CylinderGeometry(2.9, 3.4, 8.4, 12, 1, true, 0.8, Math.PI * 1.2),
    copperHighlight
  );
  mantle.position.set(-0.1, 68.0, 0.2);
  mantle.rotation.z = -0.15;
  statueGroup.add(mantle);

  // D. 上半身、胸腔与肩膀 (Torso & Shoulders, y = 72.0 ~ 79.5m)
  box(statueGroup, copperDay, 5.2, 4.2, 2.8, -0.1, 72.0, 0.1);
  const neckDrape = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.45, 6, 12, Math.PI), copperDark);
  neckDrape.position.set(-0.1, 76.2, 1.2);
  neckDrape.rotation.x = Math.PI / 2;
  statueGroup.add(neckDrape);

  // E. 颈部与庄严古典面容 (Neck & Head, y = 76.2 ~ 83.2m)
  cyl(statueGroup, copperDay, 0.95, 1.15, 2.2, -0.1, 76.2, 0.15, 10);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.65, 12, 12), copperHighlight);
  head.scale.set(0.9, 1.15, 1.05);
  head.position.set(-0.1, 79.8, 0.25);
  statueGroup.add(head);

  // 卷曲希腊发髻与披肩发缕 (Hair locks on shoulders)
  const chignon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), copperDark);
  chignon.position.set(-0.1, 79.6, -1.2);
  statueGroup.add(chignon);
  for (const sx of [-0.9, 0.9]) {
    const hairLock = cyl(statueGroup, copperDark, 0.25, 0.35, 2.6, -0.1 + sx, 77.2, 0.2, 6);
    hairLock.rotation.z = -sx * 0.2;
  }

  // F. 七芒星日芒王冠与 25 扇视窗 (Radiate Crown & Diadem, y = 80.8 ~ 84.8m)
  const diadem = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.68, 0.9, 16, 1, true), copperDay);
  diadem.position.set(-0.1, 80.8 + 0.45, 0.25);
  statueGroup.add(diadem);

  const windowRing = new THREE.Mesh(new THREE.CylinderGeometry(1.76, 1.76, 0.35, 25, 1, true), pedestalShadow);
  windowRing.position.set(-0.1, 81.1, 0.25);
  statueGroup.add(windowRing);

  // 七道放射利芒 (7 Spikes / Rays)
  const rayAngles = [-72, -48, -24, 0, 24, 48, 72];
  for (const deg of rayAngles) {
    const rad = (deg * Math.PI) / 180;
    const rayLength = 3.6;
    const rayGeo = new THREE.ConeGeometry(0.32, rayLength, 4);
    rayGeo.rotateX(Math.PI / 2);
    const ray = new THREE.Mesh(rayGeo, copperHighlight);
    ray.position.set(-0.1 + Math.sin(rad) * 1.5, 81.6, 0.25 + Math.cos(rad) * 1.5);
    ray.rotation.y = rad;
    ray.rotation.x = -0.25;
    statueGroup.add(ray);
  }

  // G. 左手紧抱《独立宣言》法典石板 (The Tablet of Law, y = 67.5 ~ 76.5m)
  const leftUpperArm = cyl(statueGroup, copperDay, 0.8, 0.9, 4.2, -2.4, 71.8, 0.3, 8);
  leftUpperArm.rotation.z = 0.45;
  const leftForeArm = cyl(statueGroup, copperDay, 0.7, 0.8, 3.8, -2.5, 68.6, 1.4, 8);
  leftForeArm.rotation.x = -0.6;
  leftForeArm.rotation.z = -0.3;

  const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.9, 4.2, 0.55), copperHighlight);
  tablet.position.set(-2.6, 70.8, 1.9);
  tablet.rotation.set(0.2, 0.4, 0.15);
  statueGroup.add(tablet);
  const tabletFace = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.8, 0.08), copperDark);
  tabletFace.position.set(-2.55, 70.8, 2.2);
  tabletFace.rotation.set(0.2, 0.4, 0.15);
  statueGroup.add(tabletFace);
  box(statueGroup, copperDay, 0.7, 1.2, 0.45, -1.9, 70.8, 2.2);

  // H. 右臂高擎与镀金火炬 (Raised Right Arm & The Torch, y = 74.0 ~ 93.0m)
  const rightUpperArm = cyl(statueGroup, copperDay, 0.85, 0.95, 5.2, 2.2, 74.5, 0.2, 8);
  rightUpperArm.rotation.z = -0.15;
  const sleeve = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 8, 1, true), copperDark);
  sleeve.rotation.x = Math.PI;
  sleeve.position.set(2.4, 75.8, 0.2);
  statueGroup.add(sleeve);

  cyl(statueGroup, copperDay, 0.65, 0.78, 5.8, 2.5, 79.5, 0.3, 8);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), copperDay);
  hand.position.set(2.5, 85.0, 0.3);
  statueGroup.add(hand);

  cyl(statueGroup, copperDark, 0.55, 0.4, 2.8, 2.5, 85.4, 0.3, 8);
  const torchBalcony = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.9, 0.9, 12), copperHighlight);
  torchBalcony.position.set(2.5, 87.2, 0.3);
  statueGroup.add(torchBalcony);

  // 纯金火焰雕塑 (24K Gold Leaf Flame, y = 87.5 ~ 93.0m)
  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 4.8, 8),
    torchGoldDay
  );
  flameMesh.position.set(2.5, 87.6 + 4.8 / 2, 0.3);
  flameMesh.rotation.y = 0.4;
  flameMesh.rotation.z = 0.08;
  flameMesh.userData.isTorchFlame = true;
  statueGroup.add(flameMesh);

  // 火焰内焰璀璨光核 (Inner Radiant Core)
  const flameCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  flameCore.position.set(2.5, 89.6, 0.3);
  flameCore.visible = false;
  statueGroup.add(flameCore);

  // 火焰点光源 (夜间照亮王冠与雕像)
  const torchLight = new THREE.PointLight(0xffb833, 0.8, 65, 1.2);
  torchLight.position.set(2.5, 90.5, 0.3);
  torchLight.userData.isTorchLight = true;
  statueGroup.add(torchLight);

  root.add(statueGroup);

  // 5. 昼夜模式切换 (Night Lighting)
  root.userData.setNightMode = (night: boolean) => {
    flameMesh.material = night ? torchGoldNight : torchGoldDay;
    flameCore.visible = night;
    torchLight.intensity = night ? 3.5 : 0.8;
    for (const spot of floodlights) {
      spot.intensity = night ? 2.4 : 0;
    }
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 19. 巴黎拉德芳斯新凯旋门 (La Grande Arche de la Défense)
// 110 米空心超立方体、悬挂式「云朵」张拉膜、全景电梯与 CNIT 拱壳大厅
// ─────────────────────────────────────────────────────────
function makeGrandeArcheWindowTexture(isNight: boolean): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = isNight ? "#090d16" : "#4b7a9e";
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
          g.fillRect(x + 1.5, y + 1.5, colW - 3, floorH - 3);
        } else {
          g.fillStyle = "#1e293b";
          g.fillRect(x + 1.5, y + 1.5, colW - 3, floorH - 3);
        }
      } else {
        g.fillStyle = "#8ec5fc";
        g.fillRect(x + 1, y + 1, colW - 2, floorH - 2);
        g.fillStyle = "#cbd5e1";
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
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = "#f8fafc";
  g.fillRect(0, 0, w, h);

  const panels = 16;
  const step = w / panels;
  g.strokeStyle = "#cbd5e1";
  g.lineWidth = 1.5;
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
  tex.repeat.set(3, 3);
  return tex;
}

export function createGrandeArche(kit: SurfaceKit) {
  const root = new THREE.Group();
  root.name = "GrandeArche";

  const marbleTex = makeCarraraMarbleTexture();
  const marbleWhite = new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xf6f8fa,
    roughness: 0.32,
    metalness: 0.08,
  });
  const marbleBevel = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.06,
  });
  const marbleDark = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.65,
    metalness: 0.12,
  });

  const winDayTex = makeGrandeArcheWindowTexture(false);
  const winNightTex = makeGrandeArcheWindowTexture(true);

  const glassDay = new THREE.MeshStandardMaterial({
    map: winDayTex,
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.85,
  });
  const glassNight = new THREE.MeshStandardMaterial({
    map: winNightTex,
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1,
    emissiveMap: winNightTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.52,
    metalness: 0.82,
  });
  const cloudMatDay = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.42,
    metalness: 0.04,
    opacity: 0.92,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const cloudMatNight = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.38,
    metalness: 0.06,
    opacity: 0.96,
    transparent: true,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.65,
    side: THREE.DoubleSide,
  });
  const parvisPaving = mapped(kit.colosseum, { color: 0xcfd4dc, roughness: 0.82, metersPerTile: 10 });
  const stepsMat = new THREE.MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.45 });
  const cnitConcrete = stone(0xd1d5db, 0.78, 0.1);

  // 1. 底层高架前庭平台与地铁/公路架空巨柱群 (Le Parvis & Foundations, y = 0 ~ 12m)
  const parvis = new THREE.Mesh(new THREE.BoxGeometry(220, 4.0, 260), parvisPaving);
  parvis.position.set(0, 2.0, 0);
  root.add(parvis);

  // 12 根独立巨型减震立柱 (12 Megacolumns under the Arch)
  for (const cx of [-44.5, +44.5]) {
    for (const cz of [-42, -14, 14, 42]) {
      cyl(root, steelMat, 2.4, 2.6, 12.0, cx, 0, cz, 16);
      cyl(root, marbleDark, 2.9, 2.9, 0.8, cx, 11.6, cz, 16);
    }
  }

  // 2. 超立方体空心巨构主门框 (The Mega Portal Frame, y = 12m ~ 110.9m)
  // A. 南侧立柱塔楼 (South Tower / Left Pylon, X = -44.5m)
  box(root, marbleWhite, 18.5, 98.9, 112.0, -44.5, 12.0, 0);

  // B. 北侧立柱塔楼 (North Tower / Right Pylon, X = +44.5m)
  box(root, marbleWhite, 18.5, 98.9, 112.0, +44.5, 12.0, 0);

  // C. 顶层多层桁架天桥跨梁 (Upper Roof Bridge, y = 88.0 ~ 110.9m, 跨度 70m)
  box(root, marbleWhite, 70.0, 22.9, 112.0, 0, 88.0, 0);

  // D. 门洞前后立面 45° 倒角边框 (Front and Back Chamfered Portal Porticos, Z = ±56m)
  // 净空洞口 y = 14.0m ~ 88.0m (h = 74.0m, x = ±34.0m)
  for (const sz of [-56, 56]) {
    for (const sx of [-1, 1]) {
      const bevel = box(root, marbleBevel, 3.2, 74.0, 1.2, sx * 34.0, 14.0, sz);
      bevel.rotation.y = sx * 0.45;
    }
    const topBevel = box(root, marbleBevel, 68.0, 3.2, 1.2, 0, 86.4, sz);
    topBevel.rotation.x = (sz > 0 ? -1 : 1) * 0.45;
  }

  // E. 门洞两侧 35 层通透玻璃幕墙 (Glass Curtain Walls inside the Void)
  const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 74.0, 108.0), glassDay);
  leftGlass.position.set(-34.8, 51.0, 0);
  leftGlass.userData.isOfficeGlass = true;
  leftGlass.userData.keepUv = true;
  root.add(leftGlass);

  const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 74.0, 108.0), glassDay);
  rightGlass.position.set(+34.8, 51.0, 0);
  rightGlass.userData.isOfficeGlass = true;
  rightGlass.userData.keepUv = true;
  root.add(rightGlass);

  // 塔楼前后外立面垂直采光窗带 (Exterior Recessed Vertical Window Strips on Front & Back Pylons)
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
  for (const sz of [-56.1, 56.1]) {
    for (const sx of [-44.5, +44.5]) {
      for (const ox of [-5.5, 0, 5.5]) {
        const winStrip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 88.0, 0.4), exteriorWinDay);
        winStrip.position.set(sx + ox, 60.0, sz);
        winStrip.userData.keepUv = true;
        root.add(winStrip);
        exteriorWindows.push(winStrip);
      }
    }
  }

  const roofUnderside = new THREE.Mesh(new THREE.BoxGeometry(68.8, 0.8, 110.0), marbleBevel);
  roofUnderside.position.set(0, 88.0, 0);
  root.add(roofUnderside);

  // 幕墙外立面通透百叶与水平腰线
  for (let fl = 1; fl <= 16; fl++) {
    const fy = 16.0 + fl * 4.4;
    box(root, steelMat, 0.9, 0.35, 108.4, -34.8, fy, 0);
    box(root, steelMat, 0.9, 0.35, 108.4, +34.8, fy, 0);
  }

  // 3. 悬挂张拉膜结构「云朵」天幕 (Les Nuages / The Clouds, y = 24m ~ 38m)
  const cloudGroup = new THREE.Group();
  for (const cz of [-32, -8, 16, 40]) {
    const waveGeo = new THREE.CylinderGeometry(18.0, 22.0, 2.0, 16, 1, true, -Math.PI / 3, (Math.PI * 2) / 3);
    waveGeo.rotateZ(Math.PI / 2);
    const wave = new THREE.Mesh(waveGeo, cloudMatDay);
    wave.scale.set(1.4, 0.6, 1.2);
    wave.position.set(0, 30.0, cz);
    wave.userData.isCloud = true;
    cloudGroup.add(wave);
  }
  for (const cz of [-40, -20, 0, 20, 40]) {
    const cable1 = cyl(cloudGroup, steelMat, 0.08, 0.08, 38.0, -17.5, 34.0, cz, 4);
    cable1.rotation.z = 0.55;
    const cable2 = cyl(cloudGroup, steelMat, 0.08, 0.08, 38.0, +17.5, 34.0, cz, 4);
    cable2.rotation.z = -0.55;
  }
  root.add(cloudGroup);

  // 4. 中央悬空观光电梯井 (Panoramic Glass Elevator Spine, y = 14m ~ 88m)
  const elevatorTower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 74.0, 3.2), steelMat);
  elevatorTower.position.set(0, 51.0, -4.0);
  root.add(elevatorTower);

  const elevatorLights: THREE.PointLight[] = [];
  for (const ey of [32.0, 68.0]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 4.2, 12), glassDay);
    pod.position.set(0, ey, -2.0);
    pod.userData.isOfficeGlass = true;
    pod.userData.keepUv = true;
    root.add(pod);

    const podLight = new THREE.PointLight(0xfef08a, 0, 14, 1.8);
    podLight.position.set(0, ey, -2.0);
    root.add(podLight);
    elevatorLights.push(podLight);
  }

  // 5. 百级大理石纪念大台阶 (Monumental Grand Staircase, y = 4.0 ~ 14.0m)
  const stairSteps = 16;
  const stairWidth = 70.0;
  const stairRun = 36.0;
  const stairRise = 10.0;
  for (let s = 0; s < stairSteps; s++) {
    const frac = s / stairSteps;
    const sy = 4.0 + frac * stairRise;
    const sz = 55.0 - frac * stairRun;
    const stepDepth = stairRun / stairSteps + 0.3;
    const stepHeight = stairRise / stairSteps;
    box(root, stepsMat, stairWidth, stepHeight, stepDepth, 0, sy, sz);
  }

  // 6. 顶层天台全景露台与天窗 (Rooftop Promenade & Belvederes, y = 110.9m)
  box(root, steelMat, 107.0, 1.4, 0.3, 0, 110.9, 55.5);
  box(root, steelMat, 107.0, 1.4, 0.3, 0, 110.9, -55.5);
  box(root, steelMat, 0.3, 1.4, 111.0, 53.0, 110.9, 0);
  box(root, steelMat, 0.3, 1.4, 111.0, -53.0, 110.9, 0);
  box(root, marbleBevel, 48.0, 3.2, 60.0, 0, 110.9, 0);

  // 7. 周边经典地标语境：CNIT 巨型三角拱壳大厅 (CNIT Triangular Shell Dome)
  const cnitGroup = new THREE.Group();
  cnitGroup.position.set(90.0, 4.0, 42.0);
  cnitGroup.rotation.y = -0.35;
  const cnitShell = new THREE.Mesh(
    new THREE.ConeGeometry(52.0, 32.0, 3),
    cnitConcrete
  );
  cnitShell.rotation.y = Math.PI / 6;
  cnitShell.position.set(0, 16.0, 0);
  cnitGroup.add(cnitShell);

  const cnitGlass = new THREE.Mesh(new THREE.CylinderGeometry(44.0, 48.0, 12.0, 3, 1, true), glassDay);
  cnitGlass.rotation.y = Math.PI / 6;
  cnitGlass.position.set(0, 6.0, 0);
  cnitGlass.userData.isOfficeGlass = true;
  cnitGlass.userData.keepUv = true;
  cnitGroup.add(cnitGlass);
  root.add(cnitGroup);

  // 8. 拱洞与「云朵」夜间建筑泛光照明 (Undercroft & Cloud Uplight)
  const cloudSpot = new THREE.SpotLight(0x60a5fa, 0, 95, 0.65, 0.5, 1.2);
  cloudSpot.position.set(0, 14.5, 0);
  cloudSpot.target.position.set(0, 36.0, 0);
  root.add(cloudSpot);
  root.add(cloudSpot.target);

  const voidSpot = new THREE.PointLight(0xffeedd, 0, 90, 1.4);
  voidSpot.position.set(0, 18.0, 0);
  root.add(voidSpot);

  // 9. 昼夜模式切换 (Night Lighting)
  root.userData.setNightMode = (night: boolean) => {
    leftGlass.material = night ? glassNight : glassDay;
    rightGlass.material = night ? glassNight : glassDay;
    cnitGlass.material = night ? glassNight : glassDay;
    for (const ew of exteriorWindows) {
      ew.material = night ? exteriorWinNight : exteriorWinDay;
    }
    cloudGroup.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.userData?.isCloud) {
        mesh.material = night ? cloudMatNight : cloudMatDay;
      }
    });
    cloudSpot.intensity = night ? 2.6 : 0;
    voidSpot.intensity = night ? 1.8 : 0;
    for (const el of elevatorLights) {
      el.intensity = night ? 1.5 : 0;
    }
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 巴黎埃菲尔铁塔 (Eiffel Tower)
// ─────────────────────────────────────────────────────────

export function createEiffelTower(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "eiffel";

  // 熟铁骨架日间材质 (Wrought Iron Puddled Antique Bronze)
  const ironDay = new THREE.MeshStandardMaterial({
    color: 0x4a3c2c,
    roughness: 0.65,
    metalness: 0.75,
  });
  // 熟铁骨架夜间香槟金泛光材质 (Golden Floodlit Champagne Glow)
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

  const ironMeshes: THREE.Mesh[] = [];
  const glassMeshes: THREE.Mesh[] = [];

  // 1. 战神广场绿荫台基 (Champ de Mars Plinth)
  const parkBase = box(root, stone(0x27361b, 0.95, 0.0), 160, 1.2, 160, 0, 0, 0);
  parkBase.userData.skipLines = true;

  // 2. 四足倾斜熟铁桁架巨柱 (Four Slanted Pylons, y = 0 ~ 57m)
  // 底座中心：(±42, 0, ±42) -> 一层中心：(±23, 57, ±23)
  const legPositions = [
    { x: -42, z: -42, tx: -23, tz: -23 }, // NW
    { x: 42, z: -42, tx: 23, tz: -23 },  // NE
    { x: 42, z: 42, tx: 23, tz: 23 },    // SE
    { x: -42, z: 42, tx: -23, tz: 23 },   // SW
  ];

  for (const lp of legPositions) {
    // 双层花岗岩减震基墩
    const ped1 = box(root, masonryMat, 20, 2.5, 20, lp.x, 0.6, lp.z);
    ped1.userData.skipLines = true;
    const ped2 = box(root, masonryMat, 16, 2.5, 16, lp.x, 3.1, lp.z);
    ped2.userData.skipLines = true;

    const legDx = lp.tx - lp.x;
    const legDz = lp.tz - lp.z;
    const legLen = Math.hypot(legDx, 57, legDz);
    const slopeQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(legDx, 57, legDz).normalize()
    );

    // 每条腿作为一个实体的倾斜格构空间桁架组
    const legGroup = new THREE.Group();
    legGroup.position.set((lp.x + lp.tx) / 2, 57 / 2, (lp.z + lp.tz) / 2);
    legGroup.quaternion.copy(slopeQuat);

    // 内部倾斜电梯轨道井核心 (Elevator Core Spine inside each leg)
    const elevatorTrack = box(legGroup, ironDay, 2.8, legLen, 2.8, 0, -legLen / 2, 0);
    ironMeshes.push(elevatorTrack);

    // 四根粗壮主角钢弦杆 (Corner Chords, 1.5m 见方柱)
    const halfBase = 5.2;
    const halfTop = 3.6;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const chord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 1.25, legLen, 4),
          ironDay
        );
        chord.position.set(sx * (halfBase + halfTop) / 2, 0, sz * (halfBase + halfTop) / 2);
        chord.rotation.y = Math.PI / 4;
        legGroup.add(chord);
        ironMeshes.push(chord);
      }
    }

    // 沿腿身分布的密布横梁与 X 型对角交叉桁架腹杆 (Dense X-Truss Webs on all 4 faces)
    const stages = 6;
    for (let s = 0; s < stages; s++) {
      const frac1 = s / stages - 0.5;
      const frac2 = (s + 1) / stages - 0.5;
      const y1 = frac1 * legLen;
      const y2 = frac2 * legLen;
      const midY = (y1 + y2) / 2;
      const segH = y2 - y1;
      const curW = (halfBase + halfTop) + (s / stages) * (halfTop - halfBase) * 2;

      // 4 面环形水平腰箍梁
      for (const side of [0, 1, 2, 3]) {
        const isX = (side % 2 === 0);
        const sign = side < 2 ? 1 : -1;
        const ring = box(
          legGroup,
          ironDay,
          isX ? curW : 0.8,
          0.85,
          isX ? 0.8 : curW,
          isX ? 0 : sign * (curW / 2),
          y1 - 0.4,
          isX ? sign * (curW / 2) : 0
        );
        ironMeshes.push(ring);

        // X 型交叉斜撑对角腹杆 (Crossed Diagonal Struts)
        const diagLen = Math.hypot(curW, segH);
        const diagAng = Math.atan2(segH, curW);

        const d1 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.65, 0.65), ironDay);
        d1.position.set(
          isX ? 0 : sign * (curW / 2),
          midY,
          isX ? sign * (curW / 2) : 0
        );
        if (isX) {
          d1.rotation.z = diagAng;
        } else {
          d1.rotation.y = Math.PI / 2;
          d1.rotation.x = diagAng;
        }
        legGroup.add(d1);
        ironMeshes.push(d1);

        const d2 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.65, 0.65), ironDay);
        d2.position.set(
          isX ? 0 : sign * (curW / 2),
          midY,
          isX ? sign * (curW / 2) : 0
        );
        if (isX) {
          d2.rotation.z = -diagAng;
        } else {
          d2.rotation.y = Math.PI / 2;
          d2.rotation.x = -diagAng;
        }
        legGroup.add(d2);
        ironMeshes.push(d2);
      }
    }

    root.add(legGroup);
  }

  // 3. 四面深邃宏伟的抛物线大拱券 (Monumental Base Arches, y = 0 ~ 39m)
  // 拱券深度加厚至 14 米，拥有双层上下弧梁与辐射状腹杆
  const archConfigs = [
    { x: 0, z: -32.5, rotY: 0 },
    { x: 32.5, z: 0, rotY: Math.PI / 2 },
    { x: 0, z: 32.5, rotY: 0 },
    { x: -32.5, z: 0, rotY: Math.PI / 2 },
  ];
  for (const ac of archConfigs) {
    const archGroup = new THREE.Group();
    archGroup.position.set(ac.x, 0, ac.z);
    archGroup.rotation.y = ac.rotY;

    const ptsCount = 20;
    const archSpan = 65;
    const archPeak = 39;
    const archDepth = 14.0; // 深度加厚至 14 米，完全填满两腿间距！

    // 上下双层抛物线拱圈截面
    const archShape = new THREE.Shape();
    archShape.moveTo(-archSpan / 2, 0);
    for (let i = 0; i <= ptsCount; i++) {
      const t = (i / ptsCount) * 2 - 1;
      const y = archPeak * (1 - t * t);
      const x = t * (archSpan / 2);
      archShape.lineTo(x, y);
    }
    for (let i = ptsCount; i >= 0; i--) {
      const t = (i / ptsCount) * 2 - 1;
      const y = Math.max(0, (archPeak - 4.5) * (1 - t * t));
      const x = t * ((archSpan - 6) / 2);
      archShape.lineTo(x, y);
    }
    archShape.closePath();

    const extrudeGeom = new THREE.ExtrudeGeometry(archShape, {
      depth: archDepth,
      bevelEnabled: true,
      bevelThickness: 0.6,
      bevelSize: 0.5,
      bevelSegments: 2,
    });
    extrudeGeom.center();
    const archMesh = new THREE.Mesh(extrudeGeom, ironDay);
    archMesh.position.set(0, archPeak / 2, 0);
    archGroup.add(archMesh);
    ironMeshes.push(archMesh);

    // 拱腹辐射状工字钢支柱花饰
    for (let i = 1; i < ptsCount; i++) {
      const t = (i / ptsCount) * 2 - 1;
      const y = (archPeak - 2.2) * (1 - t * t);
      const x = t * (archSpan / 2);
      for (const oz of [-5, 0, 5]) {
        const strut = box(archGroup, ironDay, 0.7, 4.2, 0.7, x, y - 2.1, oz);
        ironMeshes.push(strut);
      }
    }

    // 拱顶中央装饰金徽章圆环
    const rosette = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, archDepth + 0.5, 16),
      goldSpireMat
    );
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(0, archPeak - 2.2, 0);
    archGroup.add(rosette);

    root.add(archGroup);
  }

  // 4. 一层宏伟双层大观景台 (Platform 1, y = 57m, 72m x 72m)
  const p1Outer = box(root, deckMat, 72, 4.2, 72, 0, 57, 0);
  p1Outer.userData.skipLines = true;

  // 外围 72 位法国科学家金色雕刻铭文楣饰 (The 72 Scientists Frieze)
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const friezeBar = box(root, goldSpireMat, 66, 2.2, 0.6, 0, 59.5, 36.1);
    friezeBar.rotation.y = rotY;
  }

  const p1Rim = box(root, ironDay, 73.5, 1.8, 73.5, 0, 60.5, 0);
  ironMeshes.push(p1Rim);

  // 四座大型全景玻璃展厅与餐厅
  for (const sx of [-22, 22]) {
    for (const sz of [-22, 22]) {
      const pav = box(root, glassDay, 13, 5.2, 13, sx, 61.5, sz);
      pav.userData.keepUv = true;
      glassMeshes.push(pav);
      box(root, ironDay, 14, 0.8, 14, sx, 66.5, sz);
    }
  }

  // 中庭强化玻璃镂空透空漫步区
  box(root, deckMat, 28, 0.6, 28, 0, 59.2, 0);

  // 5. 一至二层斜向收拢段 (Platform 1 to Platform 2, y = 57m ~ 115m)
  // 腿身从 (±23, 57, ±23) 收拢至 (±13.5, 115, ±13.5)
  for (const lp of legPositions) {
    const startX = lp.tx;
    const startZ = lp.tz;
    const endX = (lp.tx > 0 ? 1 : -1) * 13.5;
    const endZ = (lp.tz > 0 ? 1 : -1) * 13.5;
    const legDx = endX - startX;
    const legDz = endZ - startZ;
    const legLen = Math.hypot(legDx, 58, legDz);
    const slopeQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(legDx, 58, legDz).normalize()
    );

    const midLegGroup = new THREE.Group();
    midLegGroup.position.set((startX + endX) / 2, 57 + 58 / 2, (startZ + endZ) / 2);
    midLegGroup.quaternion.copy(slopeQuat);

    // 4 根加粗主角柱 (1.1m)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const chord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.95, legLen, 4),
          ironDay
        );
        chord.position.set(sx * 2.8, 0, sz * 2.8);
        chord.rotation.y = Math.PI / 4;
        midLegGroup.add(chord);
        ironMeshes.push(chord);
      }
    }

    // 4 级 X 型交叉桁架
    for (let s = 0; s < 4; s++) {
      const frac = (s + 0.5) / 4 - 0.5;
      const my = frac * legLen;
      const diagLen = Math.hypot(5.6, legLen / 4);
      const ang = Math.atan2(legLen / 4, 5.6);
      for (const isX of [true, false]) {
        for (const sgn of [-1, 1]) {
          const d1 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.55, 0.55), ironDay);
          d1.position.set(isX ? 0 : sgn * 2.8, my, isX ? sgn * 2.8 : 0);
          if (isX) d1.rotation.z = ang;
          else { d1.rotation.y = Math.PI / 2; d1.rotation.x = ang; }
          midLegGroup.add(d1);
          ironMeshes.push(d1);

          const d2 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.55, 0.55), ironDay);
          d2.position.set(isX ? 0 : sgn * 2.8, my, isX ? sgn * 2.8 : 0);
          if (isX) d2.rotation.z = -ang;
          else { d2.rotation.y = Math.PI / 2; d2.rotation.x = -ang; }
          midLegGroup.add(d2);
          ironMeshes.push(d2);
        }
      }
    }

    root.add(midLegGroup);
  }

  // 四腿中部重型加劲连系横梁 (y = 86m & y = 102m)
  for (const hy of [86, 102]) {
    const w = hy === 86 ? 38 : 31;
    const off = hy === 86 ? 19 : 15.5;
    box(root, ironDay, w, 2.2, 1.8, 0, hy, -off);
    box(root, ironDay, w, 2.2, 1.8, 0, hy, off);
    box(root, ironDay, 1.8, 2.2, w, -off, hy, 0);
    box(root, ironDay, 1.8, 2.2, w, off, hy, 0);
  }

  // 6. 二层观景台与儒勒·凡尔纳餐厅 (Platform 2, y = 115m, 44m x 44m)
  const p2Outer = box(root, deckMat, 44, 4.0, 44, 0, 115, 0);
  p2Outer.userData.skipLines = true;
  const p2Rim = box(root, ironDay, 45.5, 1.6, 45.5, 0, 117.2, 0);
  ironMeshes.push(p2Rim);

  // 凡尔纳米其林餐厅全景深色玻璃立面
  const p2Core = box(root, glassDay, 28, 4.0, 28, 0, 119.5, 0);
  p2Core.userData.keepUv = true;
  glassMeshes.push(p2Core);

  // 二层露天观景天台与金色栏杆
  box(root, deckMat, 34, 1.4, 34, 0, 123.5, 0);
  box(root, goldSpireMat, 34.5, 1.1, 34.5, 0, 124.8, 0);

  // 7. 二层至三层汇聚为一的主塔身巨柱 (Main Tower Spire Column, y = 125m ~ 276m)
  // 【彻底告别单薄感】：在二层之上汇聚为一个四面密布 X 格构的大型空腹实体重型钢塔！
  // 底部 17.5m 见方 -> 顶部 8.0m 见方，全高 151 米！
  const spireH = 151;
  const spireBaseY = 125;
  const spireStepsCount = 15; // 15 级密集 X 格构节段！

  // 中央重型垂直电梯井核心 (Solid Elevator Core)
  const centralSpine = box(root, ironDay, 4.2, spireH, 4.2, 0, spireBaseY, 0);
  centralSpine.position.y = spireBaseY + spireH / 2;
  ironMeshes.push(centralSpine);

  // 4 根粗壮的主塔角柱 (Corner Tower Columns)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 1.35, spireH, 6),
        ironDay
      );
      col.position.set(sx * 6.5, spireBaseY + spireH / 2, sz * 6.5);
      col.rotation.y = Math.PI / 4;
      root.add(col);
      ironMeshes.push(col);
    }
  }

  // 15 级密集分布的水平围梁与 4 面交叉 X 型桁架腹杆 (Dense Façade X-Trusses)
  for (let s = 0; s < spireStepsCount; s++) {
    const frac1 = s / spireStepsCount;
    const frac2 = (s + 1) / spireStepsCount;
    const y1 = spireBaseY + frac1 * spireH;
    const y2 = spireBaseY + frac2 * spireH;
    const midY = (y1 + y2) / 2;
    const segH = y2 - y1;
    const w1 = 17.5 - frac1 * 9.5;
    const w2 = 17.5 - frac2 * 9.5;
    const curW = (w1 + w2) / 2;

    // 四面闭合水平环梁
    for (const side of [0, 1, 2, 3]) {
      const isX = (side % 2 === 0);
      const sign = side < 2 ? 1 : -1;
      const ring = box(
        root,
        ironDay,
        isX ? curW : 0.8,
        0.8,
        isX ? 0.8 : curW,
        isX ? 0 : sign * (curW / 2),
        y1,
        isX ? sign * (curW / 2) : 0
      );
      ironMeshes.push(ring);

      // 双向对角 X 撑
      const diagLen = Math.hypot(curW, segH);
      const ang = Math.atan2(segH, curW);

      const d1 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.55, 0.55), ironDay);
      d1.position.set(isX ? 0 : sign * (curW / 2), midY, isX ? sign * (curW / 2) : 0);
      if (isX) d1.rotation.z = ang;
      else { d1.rotation.y = Math.PI / 2; d1.rotation.x = ang; }
      root.add(d1);
      ironMeshes.push(d1);

      const d2 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.55, 0.55), ironDay);
      d2.position.set(isX ? 0 : sign * (curW / 2), midY, isX ? sign * (curW / 2) : 0);
      if (isX) d2.rotation.z = -ang;
      else { d2.rotation.y = Math.PI / 2; d2.rotation.x = -ang; }
      root.add(d2);
      ironMeshes.push(d2);
    }

    // 中途三个标志性外悬挑检修兼观景环廊 (Balconies at y=165m, 205m, 245m)
    if (s === 4 || s === 8 || s === 12) {
      const bPlat = box(root, ironDay, curW + 2.4, 0.9, curW + 2.4, 0, y1, 0);
      ironMeshes.push(bPlat);
    }
  }

  // 8. 三层顶层观景台与埃菲尔私人公寓 (Platform 3, y = 276m ~ 295m)
  const p3Lower = new THREE.Mesh(
    new THREE.CylinderGeometry(8.0, 8.5, 6.5, 18),
    glassDay
  );
  p3Lower.position.set(0, 276 + 6.5 / 2, 0);
  p3Lower.userData.keepUv = true;
  root.add(p3Lower);
  glassMeshes.push(p3Lower);

  const p3Deck = new THREE.Mesh(
    new THREE.CylinderGeometry(9.0, 9.0, 1.4, 18),
    deckMat
  );
  p3Deck.position.set(0, 283.5, 0);
  root.add(p3Deck);

  const p3Upper = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.8, 8.0, 16),
    ironDay
  );
  p3Upper.position.set(0, 287.5, 0);
  root.add(p3Upper);
  ironMeshes.push(p3Upper);

  // 9. 镀金穹顶、旋转灯塔与广播发射桅杆 (Dome, Lantern & Broadcast Mast, y = 295m ~ 330m)
  const cupola = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    goldSpireMat
  );
  cupola.position.set(0, 295.5, 0);
  root.add(cupola);

  const beaconGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 2.2,
  });
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.6, 6.5, 14),
    beaconGlassMat
  );
  lantern.position.set(0, 299.5, 0);
  root.add(lantern);

  const mastLower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 2.4, 15, 8),
    goldSpireMat
  );
  mastLower.position.set(0, 310.5, 0);
  root.add(mastLower);

  const mastPinnacle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.2, 14, 8),
    goldSpireMat
  );
  mastPinnacle.position.set(0, 324.5, 0);
  root.add(mastPinnacle);

  for (const ay of [306, 312, 318, 324]) {
    box(root, goldSpireMat, 5.2, 0.3, 0.3, 0, ay, 0);
    box(root, goldSpireMat, 0.3, 0.3, 5.2, 0, ay, 0);
  }

  const redBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0044 })
  );
  redBeacon.position.set(0, 330, 0);
  root.add(redBeacon);

  // 10. 360° 双光束旋转探照灯 (Lighthouse Beacon)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 301, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const sign of [-1, 1]) {
    const beamGeo = new THREE.ConeGeometry(10.0, 90, 16, 1, true);
    beamGeo.rotateZ(sign * Math.PI / 2);
    beamGeo.translate(sign * 45, 0, 0);
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beaconGroup.add(beamMesh);
  }
  root.add(beaconGroup);

  // 11. 夜间建筑泛光照明
  const flood1 = new THREE.PointLight(0xf59e0b, 0, 130, 1.6);
  flood1.position.set(0, 42, 0);
  root.add(flood1);

  const flood2 = new THREE.PointLight(0xfbbf24, 0, 110, 1.5);
  flood2.position.set(0, 118, 0);
  root.add(flood2);

  const flood3 = new THREE.PointLight(0xfef08a, 0, 90, 1.5);
  flood3.position.set(0, 278, 0);
  root.add(flood3);

  // 昼夜模式切换
  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    for (const mesh of ironMeshes) {
      mesh.material = night ? ironNight : ironDay;
    }
    for (const gm of glassMeshes) {
      gm.material = night ? glassNight : glassDay;
    }
    beamMat.opacity = night ? 0.38 : 0.0;
    flood1.intensity = night ? 3.8 : 0;
    flood2.intensity = night ? 2.8 : 0;
    flood3.intensity = night ? 2.4 : 0;
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 希腊雅典帕特农神庙 (Parthenon, Acropolis of Athens)
// ─────────────────────────────────────────────────────────

export function createParthenon(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "parthenon";

  // 彭特利库斯蜜糖色大理石 (Pentelic Honey Marble)
  const marbleDay = stone(0xeddcc4, 0.88, 0.04);
  const marbleNight = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.75,
    metalness: 0.08,
    emissive: 0xb45309,
    emissiveIntensity: 0.32,
  });
  const rockMat = stone(0x78716c, 0.96, 0.02);
  const goldAthenaMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.25,
    metalness: 0.85,
    emissive: 0x92400e,
    emissiveIntensity: 0.2,
  });
  const darkWaterMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.1,
    metalness: 0.8,
  });

  const marbleMeshes: THREE.Mesh[] = [];

  // 1. 雅典卫城石灰岩巨岩台基 (Acropolis Limestone Rock Promontory, y = 0 ~ 5m)
  const rockHill = box(root, rockMat, 108, 5.0, 62, 0, 0, 0);
  rockHill.userData.skipLines = true;
  for (const sx of [-46, 46]) {
    const rockTier = box(root, rockMat, 16, 2.5, 54, sx, 1.2, 0);
    rockTier.userData.skipLines = true;
  }

  // 2. 三层大理石基阶 (Three-Tier Crepidoma: Stereobate & Stylobate, y = 5.0 ~ 6.65m)
  const step1 = box(root, marbleDay, 72.5, 0.55, 33.5, 0, 5.0, 0);
  marbleMeshes.push(step1);
  const step2 = box(root, marbleDay, 71.0, 0.55, 32.2, 0, 5.55, 0);
  marbleMeshes.push(step2);
  const stylobate = box(root, marbleDay, 69.5, 0.55, 30.9, 0, 6.1, 0);
  marbleMeshes.push(stylobate);

  // 3. 多立克八柱围柱廊 (Octastyle Peripteral Colonnade, 8 x 17 = 46 主柱, y = 6.65 ~ 17.1m)
  const colHeight = 10.43;
  const colBaseY = 6.65;
  const colGeo = new THREE.CylinderGeometry(0.74, 0.95, colHeight, 20);
  const abacusGeo = new THREE.BoxGeometry(2.1, 0.45, 2.1);
  const echinusGeo = new THREE.CylinderGeometry(1.08, 0.74, 0.45, 20);

  const colPositions: [number, number][] = [];
  const spanX = 64.0;
  const spanZ = 25.6;
  const numX = 17;
  const numZ = 8;

  for (let ix = 0; ix < numX; ix++) {
    const x = -spanX / 2 + (ix / (numX - 1)) * spanX;
    colPositions.push([x, -spanZ / 2]);
    colPositions.push([x, spanZ / 2]);
  }
  for (let iz = 1; iz < numZ - 1; iz++) {
    const z = -spanZ / 2 + (iz / (numZ - 1)) * spanZ;
    colPositions.push([-spanX / 2, z]);
    colPositions.push([spanX / 2, z]);
  }

  for (const [cx, cz] of colPositions) {
    const col = new THREE.Mesh(colGeo, marbleDay);
    col.position.set(cx, colBaseY + colHeight / 2, cz);
    col.rotation.z = -cx * 0.0006;
    col.rotation.x = cz * 0.0006;
    root.add(col);
    marbleMeshes.push(col);

    const echinus = new THREE.Mesh(echinusGeo, marbleDay);
    echinus.position.set(cx, colBaseY + colHeight + 0.22, cz);
    root.add(echinus);
    marbleMeshes.push(echinus);

    const abacus = new THREE.Mesh(abacusGeo, marbleDay);
    abacus.position.set(cx, colBaseY + colHeight + 0.65, cz);
    root.add(abacus);
    marbleMeshes.push(abacus);
  }

  // 4. 楣梁与多立克排档三进饰中楣 (Architrave & Doric Frieze, y = 18.0 ~ 21.0m)
  box(root, marbleDay, 67.5, 1.4, 2.0, 0, 17.8, -spanZ / 2);
  box(root, marbleDay, 67.5, 1.4, 2.0, 0, 17.8, spanZ / 2);
  box(root, marbleDay, 2.0, 1.4, 28.5, -spanX / 2, 17.8, 0);
  box(root, marbleDay, 2.0, 1.4, 28.5, spanX / 2, 17.8, 0);

  const friezeY = 19.2;
  const friezeLong = box(root, marbleDay, 67.5, 1.4, 1.8, 0, friezeY, -spanZ / 2);
  const friezeLong2 = box(root, marbleDay, 67.5, 1.4, 1.8, 0, friezeY, spanZ / 2);
  const friezeShort1 = box(root, marbleDay, 1.8, 1.4, 28.5, -spanX / 2, friezeY, 0);
  const friezeShort2 = box(root, marbleDay, 1.8, 1.4, 28.5, spanX / 2, friezeY, 0);
  marbleMeshes.push(friezeLong, friezeLong2, friezeShort1, friezeShort2);

  // 92 块三进线条排档块 (Triglyphs)
  for (let ix = 0; ix < numX * 2; ix++) {
    const tx = -spanX / 2 + (ix / (numX * 2 - 1)) * spanX;
    box(root, stone(0x78350f, 0.9, 0.1), 0.55, 1.35, 0.2, tx, friezeY, -spanZ / 2 - 0.95);
    box(root, stone(0x78350f, 0.9, 0.1), 0.55, 1.35, 0.2, tx, friezeY, spanZ / 2 + 0.95);
  }

  // 5. 东西三角楣山花 (East & West Pediments with Sculptures, y = 20.6 ~ 25.2m)
  for (const sx of [-spanX / 2, spanX / 2]) {
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-15.4, 0);
    pedShape.lineTo(15.4, 0);
    pedShape.lineTo(0, 4.4);
    pedShape.closePath();

    const pedGeo = new THREE.ExtrudeGeometry(pedShape, {
      depth: 2.2,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 0.35,
    });
    pedGeo.center();
    const pedMesh = new THREE.Mesh(pedGeo, marbleDay);
    pedMesh.rotation.y = Math.PI / 2;
    pedMesh.position.set(sx, 22.8, 0);
    root.add(pedMesh);
    marbleMeshes.push(pedMesh);

    // 三角楣内众神浮雕群剪影
    for (const oz of [-9, -4.5, 0, 4.5, 9]) {
      const statueH = 3.6 - Math.abs(oz) * 0.25;
      const statue = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, statueH, 8),
        marbleDay
      );
      statue.position.set(sx + (sx > 0 ? 1.0 : -1.0), 20.6 + statueH / 2, oz);
      root.add(statue);
      marbleMeshes.push(statue);
    }
  }

  // 6. 大理石双坡屋顶 (Marble Tiled Gable Roof - 彻底修正屋顶朝向与正脊高度)
  // 正脊在中央 Z = 0 处高达 25.2m，两侧屋檐向南北自然倾斜向下至 Z = ±16.0m (高度 20.8m)
  const roofShape = new THREE.Shape();
  const eaveZ = 16.0;
  const ridgeY = 25.2;
  const eaveY = 20.8;
  const slabThick = 0.55;

  roofShape.moveTo(-eaveZ, eaveY);
  roofShape.lineTo(0, ridgeY);
  roofShape.lineTo(eaveZ, eaveY);
  roofShape.lineTo(eaveZ, eaveY - slabThick);
  roofShape.lineTo(0, ridgeY - slabThick);
  roofShape.lineTo(-eaveZ, eaveY - slabThick);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 68.0,
    bevelEnabled: false,
  });
  roofGeo.center();
  const roofMesh = new THREE.Mesh(roofGeo, marbleDay);
  roofMesh.rotation.y = Math.PI / 2;
  roofMesh.position.set(0, 22.8, 0);
  root.add(roofMesh);
  marbleMeshes.push(roofMesh);

  // 东西正脊饰与檐口角饰 (Acroteria & Ridge Crest)
  const ridgeBeam = cyl(root, marbleDay, 0.35, 0.35, 68.5, 0, 25.2, 0, 8);
  ridgeBeam.rotation.z = Math.PI / 2;
  marbleMeshes.push(ridgeBeam);

  // 7. 内殿主室与黄金雅典娜神像 (Inner Cella / Naos, y = 6.65 ~ 18.0m)
  const cellaWall1 = box(root, marbleDay, 48.0, 11.2, 1.4, 0, 6.65, -9.2);
  const cellaWall2 = box(root, marbleDay, 48.0, 11.2, 1.4, 0, 6.65, 9.2);
  const cellaBack = box(root, marbleDay, 1.4, 11.2, 18.4, -24.0, 6.65, 0);
  marbleMeshes.push(cellaWall1, cellaWall2, cellaBack);

  box(root, darkWaterMat, 14.0, 0.2, 7.5, 2.0, 6.68, 0);

  const athenaGroup = new THREE.Group();
  athenaGroup.position.set(-10.0, 6.65, 0);
  box(athenaGroup, marbleDay, 3.6, 1.2, 3.6, 0, 0, 0);
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.15, 8.5, 12),
    goldAthenaMat
  );
  torso.position.set(0, 1.2 + 8.5 / 2, 0);
  athenaGroup.add(torso);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 10), goldAthenaMat);
  helm.position.set(0, 10.4, 0);
  athenaGroup.add(helm);
  cyl(athenaGroup, goldAthenaMat, 0.08, 0.08, 11.5, -1.2, 0, 0.8, 6);
  root.add(athenaGroup);

  // 8. 夜间古典泛光照明
  const spotEast = new THREE.PointLight(0xf59e0b, 0, 50, 1.8);
  spotEast.position.set(38.0, 8.0, 0);
  root.add(spotEast);

  const spotWest = new THREE.PointLight(0xf59e0b, 0, 50, 1.8);
  spotWest.position.set(-38.0, 8.0, 0);
  root.add(spotWest);

  const spotCella = new THREE.PointLight(0xfbbf24, 0, 35, 1.5);
  spotCella.position.set(-8.0, 12.0, 0);
  root.add(spotCella);

  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    for (const mm of marbleMeshes) {
      mm.material = night ? marbleNight : marbleDay;
    }
    spotEast.intensity = night ? 2.8 : 0;
    spotWest.intensity = night ? 2.8 : 0;
    spotCella.intensity = night ? 2.2 : 0;
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 迪拜未来博物馆 (Museum of the Future, Dubai)
// ─────────────────────────────────────────────────────────

function makeMuseumArabicTexture(isNight: boolean): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 金属底色
  ctx.fillStyle = isNight ? "#0f172a" : "#d1d5db";
  ctx.fillRect(0, 0, w, h);

  // 1,024 块三角形拓扑网格分格线 (Parametric Diagrid)
  ctx.strokeStyle = isNight ? "rgba(255,255,255,0.14)" : "rgba(71,85,105,0.35)";
  ctx.lineWidth = 1.8;
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
  for (let y = 0; y < h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 阿拉伯书法诗句窗带 (Arabic Calligraphy Window Bands)
  ctx.strokeStyle = isNight ? "#38bdf8" : "#0f172a";
  ctx.fillStyle = isNight ? "#38bdf8" : "#0f172a";
  ctx.lineWidth = isNight ? 7 : 5;
  if (isNight) {
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 16;
  }

  // 绘制 5 道横贯立面的优美阿拉伯书法长卷与变音符
  const bands = [80, 160, 256, 350, 430];
  for (let b = 0; b < bands.length; b++) {
    const cy = bands[b];
    ctx.beginPath();
    ctx.moveTo(20, cy);
    for (let x = 20; x < w - 20; x += 35) {
      const freq = (x / w) * Math.PI * (6 + b);
      const dy = Math.sin(freq) * 32 + ((x % 70 === 0) ? -24 : 16);
      ctx.quadraticCurveTo(x + 12, cy + dy, x + 30, cy + dy * 0.3);
    }
    ctx.stroke();

    for (let x = 40; x < w - 40; x += 60) {
      const dotY = cy + Math.sin(x * 0.1) * 36;
      ctx.beginPath();
      ctx.arc(x, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
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

  // 材质
  const grassMat = stone(0x2d5a27, 0.95, 0.0);
  const concreteMat = stone(0x94a3b8, 0.85, 0.05);

  const texDay = makeMuseumArabicTexture(false);
  const texNight = makeMuseumArabicTexture(true);

  const torusMatDay = new THREE.MeshStandardMaterial({
    map: texDay,
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.88,
  });
  const torusMatNight = new THREE.MeshStandardMaterial({
    map: texNight,
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.4,
    emissiveMap: texNight,
    emissive: 0xffffff,
    emissiveIntensity: 1.25,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.8,
  });
  const glassDay = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.6,
  });

  // 1. 三层起伏覆土绿丘生态基座 (Landscaped Green Podium Hill, y = 0 ~ 12m)
  // 底座主覆土体：长 116m x 宽 72m x 高 10m
  const hillMain = box(root, grassMat, 116, 9.5, 72, 0, 0, 0);
  hillMain.userData.skipLines = true;
  for (const sz of [-36, 36]) {
    const tier = box(root, grassMat, 96, 5.0, 18, 0, 0, sz);
    tier.userData.skipLines = true;
  }
  // 入口迎宾广场与镜面水池
  box(root, stone(0x0f172a, 0.15, 0.85), 45, 0.4, 24, 0, 9.6, 28);
  // 玻璃入口大堂
  const lobbyGlass = box(root, glassDay, 38, 4.5, 12, 0, 9.8, 22);
  lobbyGlass.userData.keepUv = true;

  // 2. 标志性无柱中空圆环环面 (Iconic Torus Ring with Elliptical Void, y = 10m ~ 77m)
  // 外轮廓椭圆：长半轴 a=48m, 短半轴 b=33.5m (总高 67m，加上底座正好 77m)
  // 内部中空椭圆：长半轴 a=22m, 短半轴 b=13.5m
  const torusShape = new THREE.Shape();
  const outerRx = 48.0;
  const outerRy = 33.5;
  const innerRx = 21.0;
  const innerRy = 13.0;

  // 外轮廓顺时针椭圆
  const outerPts = 48;
  for (let i = 0; i <= outerPts; i++) {
    const theta = (i / outerPts) * Math.PI * 2;
    const px = Math.cos(theta) * outerRx;
    const py = Math.sin(theta) * outerRy;
    if (i === 0) torusShape.moveTo(px, py);
    else torusShape.lineTo(px, py);
  }

  // 内部中空空洞逆时针内孔 (Hole)
  const holePath = new THREE.Path();
  const innerPts = 36;
  for (let i = 0; i <= innerPts; i++) {
    const theta = -(i / innerPts) * Math.PI * 2;
    const px = Math.cos(theta) * innerRx;
    const py = Math.sin(theta) * innerRy;
    if (i === 0) holePath.moveTo(px, py);
    else holePath.lineTo(px, py);
  }
  torusShape.holes.push(holePath);

  // 挤出形成厚度 28m 的饱满圆润环面
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 26.0,
    bevelEnabled: true,
    bevelThickness: 3.8,
    bevelSize: 3.2,
    bevelSegments: 6,
    curveSegments: 36,
  };

  const torusGeo = new THREE.ExtrudeGeometry(torusShape, extrudeSettings);
  torusGeo.center();

  // 精确将长 96m x 高 67m 的环面顶点坐标归一化映射至 [0, 1] UV 空间，使阿拉伯书法与三角形分格完美覆贴
  const posAttr = torusGeo.attributes.position;
  const uvAttr = torusGeo.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    uvAttr.setXY(i, (x + 48.0) / 96.0, (y + 33.5) / 67.0);
  }
  uvAttr.needsUpdate = true;

  const torusMesh = new THREE.Mesh(torusGeo, torusMatDay);
  torusMesh.position.set(0, 43.5, 0);
  torusMesh.userData.keepUv = true;
  root.add(torusMesh);

  // 3. 空洞内斜撑钢管桁架与观景悬挑天桥 (Diagrid Lattice & Void Observation Deck)
  // 悬空观景挑台 (y = 43.5m)
  const deck = box(root, concreteMat, 18, 1.2, 24, 0, 31.0, 0);
  deck.userData.skipLines = true;
  box(root, steelMat, 18.2, 1.1, 0.3, 0, 32.2, 11.8);
  box(root, steelMat, 18.2, 1.1, 0.3, 0, 32.2, -11.8);

  // 内部斜撑钢柱 (Diagrid Columns inside the void)
  for (let ix = -16; ix <= 16; ix += 8) {
    const col1 = cyl(root, steelMat, 0.35, 0.35, 24, ix, 43.5, 9.5, 8);
    col1.rotation.z = (ix / 16) * 0.45;
    const col2 = cyl(root, steelMat, 0.35, 0.35, 24, ix, 43.5, -9.5, 8);
    col2.rotation.z = -(ix / 16) * 0.45;
  }

  // 4. 周边地铁连廊与现代柱廊 (Metro Link Bridge)
  const bridge = box(root, concreteMat, 14, 3.2, 85, 42, 7.5, 0);
  bridge.userData.skipLines = true;

  // 5. 夜间未来科技泛光与激光光束
  const voidLight = new THREE.PointLight(0x38bdf8, 0, 75, 1.8);
  voidLight.position.set(0, 43.5, 0);
  root.add(voidLight);

  const hillSpot = new THREE.PointLight(0x34d399, 0, 60, 1.5);
  hillSpot.position.set(0, 14, 25);
  root.add(hillSpot);

  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    torusMesh.material = night ? torusMatNight : torusMatDay;
    voidLight.intensity = night ? 3.2 : 0;
    hillSpot.intensity = night ? 2.4 : 0;
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 巴塞罗那圣家堂 (Basílica de la Sagrada Família)
// ─────────────────────────────────────────────────────────

function makeSagradaStainedGlassTexture(isEastDawn: boolean): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, size, size);

  // 仿高迪马赛克与彩绘玻璃 (Stained Glass Windows)
  // 东侧诞生立面清晨：深蓝、天青、翡翠绿；西侧受难立面落日：琥珀金、橘红、深绯红
  const coldColors = ["#0284c7", "#06b6d4", "#0d9488", "#10b981", "#3b82f6", "#6366f1"];
  const warmColors = ["#ea580c", "#f97316", "#eab308", "#ef4444", "#b91c1c", "#f59e0b"];
  const palette = isEastDawn ? coldColors : warmColors;

  const cols = 8;
  const rows = 12;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = palette[(c * 3 + r * 7) % palette.length];
      ctx.fillRect(c * cellW + 3, r * cellH + 3, cellW - 6, cellH - 6);
    }
  }

  // 铅条花格网
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, size);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(size, r * cellH);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createSagradaFamilia(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "sagrada";

  // 加泰罗尼亚砂岩材质 (Montjuïc Sandstone)
  const stoneDay = stone(0xc29b68, 0.88, 0.05);
  const stoneNight = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.65,
    metalness: 0.1,
    emissive: 0x92400e,
    emissiveIntensity: 0.35,
  });

  // 威尼斯彩色玻璃马赛克碎瓷 (Trencadís Mosaic)
  const mosaicMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.7,
  });
  const crossWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.4,
    emissive: 0xffffff,
    emissiveIntensity: 0.6,
  });
  const starCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.1,
    metalness: 0.3,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.2,
  });

  // 彩绘玻璃材质
  const texEast = makeSagradaStainedGlassTexture(true);
  const texWest = makeSagradaStainedGlassTexture(false);
  const glassEastDay = new THREE.MeshStandardMaterial({
    map: texEast,
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  const glassEastNight = new THREE.MeshStandardMaterial({
    map: texEast,
    color: 0xffffff,
    emissiveMap: texEast,
    emissive: 0xffffff,
    emissiveIntensity: 1.6,
  });
  const glassWestDay = new THREE.MeshStandardMaterial({
    map: texWest,
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  const glassWestNight = new THREE.MeshStandardMaterial({
    map: texWest,
    color: 0xffffff,
    emissiveMap: texWest,
    emissive: 0xffffff,
    emissiveIntensity: 1.6,
  });

  const stoneMeshes: THREE.Mesh[] = [];
  const glassEastMeshes: THREE.Mesh[] = [];
  const glassWestMeshes: THREE.Mesh[] = [];

  // 1. 大教堂地坪基台 (Latin Cross Basilica Podium, y = 0 ~ 3.5m)
  const basePlinth = box(root, stone(0x3e3427, 0.95, 0.0), 96, 3.5, 62, 0, 0, 0);
  basePlinth.userData.skipLines = true;

  // 2. 中殿与侧厅大理石主体 (Nave & Aisles Walls, y = 3.5 ~ 46m)
  // 中殿主墙体 (长 82m x 宽 32m x 高 36m)
  const naveBody = box(root, stoneDay, 82, 34, 32, 0, 3.5, 0);
  stoneMeshes.push(naveBody);

  // 耳堂横翼 (Transept, 跨度 56m)
  const transept = box(root, stoneDay, 34, 34, 56, 0, 3.5, 0);
  stoneMeshes.push(transept);

  // 东西两侧彩绘大高侧窗带 (Stained Glass Lancets)
  // 东侧 (Z = +16.2m)
  for (let x = -28; x <= 28; x += 14) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(8.5, 24, 0.6), glassEastDay);
    win.position.set(x, 24, 16.2);
    win.userData.keepUv = true;
    root.add(win);
    glassEastMeshes.push(win);
  }
  // 西侧 (Z = -16.2m)
  for (let x = -28; x <= 28; x += 14) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(8.5, 24, 0.6), glassWestDay);
    win.position.set(x, 24, -16.2);
    win.userData.keepUv = true;
    root.add(win);
    glassWestMeshes.push(win);
  }

  // 3. 诞生立面与受难立面八座蜂巢钟楼 (Eight Apostles Bell Towers, y = 35 ~ 115m)
  // 诞生立面 (东侧 X = +28m, Z = -18, -6, +6, +18)
  // 受难立面 (西侧 X = -28m, Z = -18, -6, +6, +18)
  const towerClusters = [
    { x: 28, sign: 1 },
    { x: -28, sign: -1 },
  ];

  for (const tc of towerClusters) {
    const zOffsets = [-17, -5.5, 5.5, 17];
    for (let i = 0; i < zOffsets.length; i++) {
      const tz = zOffsets[i];
      const isInner = (i === 1 || i === 2);
      const towerH = isInner ? 115 : 107;
      const shaftH = towerH - 35;

      // 钟楼镂空百叶身部 (Perforated Bell Spire Shaft)
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 3.4, shaftH, 12),
        stoneDay
      );
      shaft.position.set(tc.x, 35 + shaftH / 2, tz);
      root.add(shaft);
      stoneMeshes.push(shaft);

      // 钟楼顶部彩色碎瓷马赛克塔尖 (Trencadís Mosaic Finials, 12m)
      const finialBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 2.2, 5.0, 10),
        mosaicMat
      );
      finialBase.position.set(tc.x, towerH + 2.5, tz);
      root.add(finialBase);

      // 塔顶丰饶金球风向十字
      const finialSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 10, 10),
        mosaicMat
      );
      finialSphere.position.set(tc.x, towerH + 6.0, tz);
      root.add(finialSphere);

      box(root, crossWhiteMat, 2.4, 0.5, 0.5, tc.x, towerH + 8.0, tz);
      box(root, crossWhiteMat, 0.5, 3.2, 0.5, tc.x, towerH + 7.5, tz);
    }
  }

  // 4. 中央六座核心圣塔 (Central Tower Complex, y = 35 ~ 172.5m)
  // A. 中央耶稣基督之塔 (Tower of Jesus Christ, 规划总高 172.5m)
  const christTowerH = 132;
  const christTower = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 8.8, christTowerH, 16),
    stoneDay
  );
  christTower.position.set(0, 35 + christTowerH / 2, 0);
  root.add(christTower);
  stoneMeshes.push(christTower);

  // 基督塔顶 15 米四臂高迪十字架 (The Monumental Four-Armed Cross)
  const crossGroup = new THREE.Group();
  crossGroup.position.set(0, 167, 0);
  // 垂直十字臂
  box(crossGroup, crossWhiteMat, 2.2, 11.0, 2.2, 0, 0, 0);
  // 水平 X 臂
  box(crossGroup, crossWhiteMat, 9.5, 2.2, 2.2, 0, 1.5, 0);
  // 水平 Z 臂
  box(crossGroup, crossWhiteMat, 2.2, 2.2, 9.5, 0, 1.5, 0);
  root.add(crossGroup);

  // B. 圣母玛利亚之塔 (Tower of the Virgin Mary, 138m, 位于后殿 X = 0, Z = -24m)
  const maryH = 98;
  const maryTower = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 6.8, maryH, 14),
    stoneDay
  );
  maryTower.position.set(0, 35 + maryH / 2, -24);
  root.add(maryTower);
  stoneMeshes.push(maryTower);

  // 圣母塔顶璀璨十二芒星 (Stella Matutina / 12-pointed Luminous Star)
  const maryStar = new THREE.Mesh(
    new THREE.DodecahedronGeometry(3.5, 1),
    starCrystalMat
  );
  maryStar.position.set(0, 137.5, -24);
  root.add(maryStar);

  // C. 四福音传教士之塔 (Four Evangelists Towers, 135m, 环绕基督塔)
  const evangelistOffsets = [
    { x: -9, z: -9 },
    { x: 9, z: -9 },
    { x: 9, z: 9 },
    { x: -9, z: 9 },
  ];
  for (const eo of evangelistOffsets) {
    const evH = 95;
    const evTower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 4.2, evH, 10),
      stoneDay
    );
    evTower.position.set(eo.x, 35 + evH / 2, eo.z);
    root.add(evTower);
    stoneMeshes.push(evTower);

    // 福音象征翼雕
    const evStatue = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 8, 8),
      crossWhiteMat
    );
    evStatue.position.set(eo.x, 133.5, eo.z);
    root.add(evStatue);
  }

  // 5. 诞生立面雕刻大门洞与自然树木雕塑 (Nativity Façade Triple Portals)
  const portalHope = box(root, stoneDay, 3.5, 14, 10, 31, 3.5, -12);
  const portalCharity = box(root, stoneDay, 4.5, 18, 12, 31.5, 3.5, 0);
  const portalFaith = box(root, stoneDay, 3.5, 14, 10, 31, 3.5, 12);
  stoneMeshes.push(portalHope, portalCharity, portalFaith);

  // 生命之树丝柏常青树雕塑 (Cypress Tree of Life)
  const cypress = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 14, 10),
    stone(0x166534, 0.9, 0.05)
  );
  cypress.position.set(32.5, 28, 0);
  root.add(cypress);

  // 6. 圣殿内部仿生树状倾斜石柱森林 (Branching Tree Columns inside the Nave)
  for (let x = -20; x <= 20; x += 10) {
    for (const z of [-6, 6]) {
      cyl(root, stone(0x78716c, 0.7, 0.1), 0.85, 1.1, 22, x, 3.5, z, 8);
      // 分叉树枝 (Branching boughs)
      for (const rotZ of [-0.35, 0.35]) {
        const branch = cyl(root, stone(0x78716c, 0.7, 0.1), 0.5, 0.7, 8, x, 24, z, 6);
        branch.rotation.z = rotZ;
      }
    }
  }

  // 7. 夜间金辉泛光与圣光漫射
  const spotNativity = new THREE.PointLight(0xf59e0b, 0, 75, 1.8);
  spotNativity.position.set(45, 25, 0);
  root.add(spotNativity);

  const spotPassion = new THREE.PointLight(0xf59e0b, 0, 75, 1.8);
  spotPassion.position.set(-45, 25, 0);
  root.add(spotPassion);

  const spotChristCross = new THREE.PointLight(0xffffff, 0, 50, 1.5);
  spotChristCross.position.set(0, 168, 0);
  root.add(spotChristCross);

  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    for (const sm of stoneMeshes) {
      sm.material = night ? stoneNight : stoneDay;
    }
    for (const gm of glassEastMeshes) {
      gm.material = night ? glassEastNight : glassEastDay;
    }
    for (const gm of glassWestMeshes) {
      gm.material = night ? glassWestNight : glassWestDay;
    }
    spotNativity.intensity = night ? 3.0 : 0;
    spotPassion.intensity = night ? 3.0 : 0;
    spotChristCross.intensity = night ? 2.5 : 0;
  };

  return root;
}

function withMeterUvs(id: string, build: (kit: SurfaceKit) => THREE.Group) {
  return (kit: SurfaceKit) => {
    const group = build(kit);
    finishSurfaces(group, 7);
    attachLandmarkLines(group, id);
    return group;
  };
}

export const LANDMARK_BUILDERS: Record<string, (kit: SurfaceKit) => THREE.Group> = {
  giza: withMeterUvs("giza", createGiza),
  wall: withMeterUvs("wall", createGreatWall),
  petra: withMeterUvs("petra", createPetra),
  colosseum: withMeterUvs("colosseum", createColosseum),
  chichen: withMeterUvs("chichen", createChichenItza),
  machu: withMeterUvs("machu", createMachuPicchu),
  taj: withMeterUvs("taj", createTajMahal),
  christ: withMeterUvs("christ", createChrist),
  pentagon: withMeterUvs("pentagon", createPentagon),
  fast: withMeterUvs("fast", createFastTelescope),
  burj: withMeterUvs("burj", createBurjKhalifa),
  apple: withMeterUvs("apple", createApplePark),
  sydney: withMeterUvs("sydney", createSydneyOperaHouse),
  globalcenter: withMeterUvs("globalcenter", createChengduGlobalCenter),
  hzmb: withMeterUvs("hzmb", createHZMB),
  goldengate: withMeterUvs("goldengate", createGoldenGateBridge),
  svalbard: withMeterUvs("svalbard", createSvalbardSeedVault),
  liberty: withMeterUvs("liberty", createStatueOfLiberty),
  defense: withMeterUvs("defense", createGrandeArche),
  eiffel: withMeterUvs("eiffel", createEiffelTower),
  parthenon: withMeterUvs("parthenon", createParthenon),
  futuremuseum: withMeterUvs("futuremuseum", createMuseumOfTheFuture),
  sagrada: withMeterUvs("sagrada", createSagradaFamilia),
};
