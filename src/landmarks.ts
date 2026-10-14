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

  const sphinx = new THREE.Group();
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(11.8, 16, 12), sphinxMat);
  haunch.scale.set(1.22, 0.8, 1.48);
  haunch.position.set(0, 10.6, -18);
  sphinx.add(haunch);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(9.4, 30, 8, 16), sphinxMat);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1.12, 1, 0.88);
  body.position.set(0, 10.6, 3);
  sphinx.add(body);
  box(sphinx, sphinxMat, 8.4, 5.6, 26, -6.6, 0, 26);
  box(sphinx, sphinxMat, 8.4, 5.6, 26, 6.6, 0, 26);
  cyl(sphinx, sphinxMat, 3.6, 4.1, 2.2, -6.6, 0, 38.5, 10);
  cyl(sphinx, sphinxMat, 3.6, 4.1, 2.2, 6.6, 0, 38.5, 10);
  box(sphinx, sphinxMat, 7.6, 7.2, 10, -8.4, 0, -22);
  box(sphinx, sphinxMat, 7.6, 7.2, 10, 8.4, 0, -22);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(8.8, 1.15, 8, 14, Math.PI * 0.75), sphinxMat);
  tail.rotation.set(Math.PI / 2, 0, Math.PI / 5);
  tail.position.set(8.4, 8.4, -28);
  sphinx.add(tail);
  box(sphinx, sphinxMat, 17.4, 15.8, 14.5, 0, 12.4, 33);
  box(sphinx, pale, 22, 3.2, 12.5, 0, 28.2, 33.4);
  box(sphinx, sphinxMat, 3.4, 12.2, 2.6, -8.6, 16, 34);
  box(sphinx, sphinxMat, 3.4, 12.2, 2.6, 8.6, 16, 34);
  const face = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 14), pale);
  face.scale.set(0.82, 1.08, 0.72);
  face.position.set(0, 24.2, 40.6);
  sphinx.add(face);
  box(sphinx, sphinxMat, 3.2, 4.2, 2.2, 0, 20.2, 42.4);
  cyl(sphinx, pale, 0.35, 0.45, 2.6, 0, 28.4, 39.2, 6);
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
  return t > 0.22 && t < 0.72;
}

/** 斗兽场：四层叠柱式、残缺南立面、分层看台与地宫。 */
export function createColosseum(kit: SurfaceKit) {
  const root = new THREE.Group();
  const travertine = mapped(kit.colosseum, {
    color: 0xf2e4c8,
    roughness: 0.84,
    metersPerTile: 4.2,
    bumpScale: 0.55,
  });
  const trim = mapped(kit.colosseum, { color: 0xe8d0a8, roughness: 0.86, metersPerTile: 4 });
  const seatMat = mapped(kit.colosseum, { color: 0xd7b892, roughness: 0.92, metersPerTile: 5 });
  const voidMat = stone(0x3a281c, 0.98);
  const sand = mapped(kit.arena, { roughness: 0.96, metersPerTile: 10, bumpScale: 0.18 });

  const a0 = 0.22 * Math.PI * 2;
  const a1 = 0.72 * Math.PI * 2;
  root.add(new THREE.Mesh(extrudeY(partialRing(96, 80, 88, 73, a0, a1, 52), 48.5), travertine));
  root.add(new THREE.Mesh(extrudeY(ring(88, 73, 62, 50, 56), 42), travertine));
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
      const z = Math.sin(a) * level.rz;
      dummy.position.set(x, level.y, z);
      dummy.lookAt(0, level.y, 0);
      dummy.updateMatrix();
      innerFacade.setMatrixAt(k++, dummy.matrix);
    }
  }
  root.add(innerFacade);

  const attic = new THREE.Mesh(extrudeY(partialRing(96.8, 80.8, 90, 74.5, a0, a1, 40), 8.2), trim);
  attic.position.y = 48.5;
  root.add(attic);

  for (const y of [13.2, 25.2, 37.2]) {
    const cornice = new THREE.Mesh(extrudeY(partialRing(97.2, 81.2, 95, 79, a0, a1, 40), 0.7), trim);
    cornice.position.y = y;
    root.add(cornice);
  }

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

  for (let ix = -4; ix <= 4; ix++) {
    box(root, voidMat, 0.7, 3.6, 46, ix * 6.4, 0, 0);
  }
  for (let iz = -3; iz <= 3; iz++) {
    box(root, voidMat, 58, 3.6, 0.7, 0, 0, iz * 6.2);
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48).scale(18, 12, 1), sand);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 1.4;
  root.add(floor);

  for (let i = 0; i < 8; i++) {
    const aisle = new THREE.Group();
    box(aisle, voidMat, 3.4, 3.2, 24, 0, 2.0, -48);
    box(aisle, trim, 0.65, 3.6, 24, -2.0, 2.0, -48);
    box(aisle, trim, 0.65, 3.6, 24, 2.0, 2.0, -48);
    aisle.rotation.y = (i * Math.PI) / 4;
    root.add(aisle);
  }

  const innerArch = archSlab(3.4, 6.2, 2.2, 0.8);
  const innerArches = new THREE.InstancedMesh(innerArch, voidMat, 28);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 36.2, 2.3, Math.sin(a) * 28.2);
    dummy.lookAt(0, 2.3, 0);
    dummy.updateMatrix();
    innerArches.setMatrixAt(i, dummy.matrix);
  }
  root.add(innerArches);

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
      const z = Math.sin(a) * level.rz;
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

  for (let i = 0; i < 40; i++) {
    if (!intactOuter(i, 40)) continue;
    const a = (i / 40) * Math.PI * 2;
    if (i % 2 === 0) {
      box(root, voidMat, 2.4, 3.4, 1.2, Math.cos(a) * 93.6, 50.2, Math.sin(a) * 77.6);
    } else {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.35, 16), trim);
      disc.rotation.z = Math.PI / 2;
      disc.position.set(Math.cos(a) * 96.2, 52.6, Math.sin(a) * 80.2);
      disc.lookAt(0, 52.6, 0);
      root.add(disc);
    }
  }

  const boxSeat = new THREE.Group();
  box(boxSeat, trim, 16, 7.2, 9, 0, 11.5, 54);
  box(boxSeat, voidMat, 8, 4.4, 1.4, 0, 13.2, 49.6);
  box(boxSeat, trim, 17.2, 1.1, 10.2, 0, 18.7, 54);
  root.add(boxSeat);

  for (let i = 0; i < 24; i++) {
    if (!intactOuter(i, 24)) continue;
    const a = (i / 24) * Math.PI * 2;
    cyl(root, trim, 0.32, 0.38, 8.5, Math.cos(a) * 94, 56.6, Math.sin(a) * 78, 8);
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

  box(root, marble, 108, 5.4, 108, 0, 0, 0);
  box(root, lawn, 36, 0.45, 36, -32, 5.4, -32);
  box(root, lawn, 36, 0.45, 36, 32, 5.4, -32);
  box(root, lawn, 36, 0.45, 36, -32, 5.4, 32);
  box(root, lawn, 36, 0.45, 36, 32, 5.4, 32);
  box(root, water, 7.2, 0.4, 108, 0, 5.45, 0);
  box(root, water, 108, 0.4, 7.2, 0, 5.45, 0);
  box(root, water, 14, 0.45, 56, 0, 5.48, -74);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 16), water);
  pool.position.set(0, 5.7, 0);
  root.add(pool);

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

  // 7. 头部雕塑与庄严面庞 (y = 35.0 ~ 39.5m)
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.1, 24, 20), soap);
  head.scale.set(0.9, 1.15, 0.85);
  head.position.set(0, 36.9, 0.35);
  root.add(head);

  // 披肩长发帽与垂肩长发
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(2.22, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
    soapDark,
  );
  hairCap.scale.set(1.02, 1.02, 0.98);
  hairCap.position.set(0, 37.5, 0.18);
  root.add(hairCap);

  for (const side of [-1, 1]) {
    // 垂向两侧肩头的浓密长发缕
    const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 3.2, 8, 12), soapDark);
    lock.position.set(side * 1.62, 35.6, 0.42);
    lock.rotation.z = side * -0.06;
    root.add(lock);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), soap);
    ear.scale.set(0.7, 1.0, 0.5);
    ear.position.set(side * 1.72, 36.9, 0.32);
    root.add(ear);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), dark);
    eye.scale.set(1.3, 0.6, 0.45);
    eye.position.set(side * 0.62, 37.15, 1.96);
    root.add(eye);

    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 1.05, 37.5, 1.75),
      new THREE.Vector3(side * 0.65, 37.58, 1.92),
      new THREE.Vector3(side * 0.3, 37.5, 1.96),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(browCurve, 8, 0.11, 6, false), soapDark));
  }

  // Art Deco 挺拔山根鼻梁
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.05, 7), soap);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 36.75, 2.1);
  root.add(nose);

  // 胡须与方正方颌胡子
  const moustache = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 8), soapDark);
  moustache.scale.set(1.3, 0.36, 0.36);
  moustache.position.set(0, 36.3, 1.92);
  root.add(moustache);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.92, 2.3, 10), soapDark);
  beard.rotation.z = Math.PI;
  beard.scale.set(0.92, 1.0, 0.65);
  beard.position.set(0, 35.2, 1.35);
  root.add(beard);

  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.38, 36.1, 1.9),
    new THREE.Vector3(0, 36.05, 1.98),
    new THREE.Vector3(0.38, 36.1, 1.9),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 8, 0.06, 5, false), shadow));

  // 头顶经典薄光环/芒带
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 24), soapDark);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 39.1, 0.25);
  root.add(halo);

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
};

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
};
