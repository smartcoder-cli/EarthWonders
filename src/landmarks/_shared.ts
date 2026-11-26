import * as THREE from "three";

export type Mat = THREE.Material;

export function stone(color: number, roughness = 0.9, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function gold() {
  return new THREE.MeshStandardMaterial({
    color: 0xc9a84c,
    roughness: 0.28,
    metalness: 0.86,
  });
}

export function box(
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

export function cyl(
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

export function pyramidGeo(base: number, height: number) {
  const geometry = new THREE.ConeGeometry(base / Math.SQRT2, height, 4, 1, false);
  geometry.rotateY(Math.PI / 4);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

export function frustumGeo(base: number, top: number, height: number) {
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

export function onionLathe(radius: number, height: number, segments = 24) {
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

export function pointedArchShape(width: number, height: number) {
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

export function roundArchShape(width: number, height: number) {
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

export function archSlab(
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

export function trapWallGeo(length: number, height: number, baseW: number, topW: number) {
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

export function chamferPrism(width: number, height: number, chamfer: number) {
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

export function gableRoofGeo(w: number, d: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geometry.translate(0, 0, -d / 2);
  return geometry;
}

export function ellipseShape(rx: number, rz: number, segments = 64) {
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

export function ring(outerX: number, outerZ: number, innerX: number, innerZ: number, segments = 56) {
  const shape = ellipseShape(outerX, outerZ, segments);
  shape.holes.push(ellipseShape(innerX, innerZ, Math.max(24, segments - 8)));
  return shape;
}

export function partialRing(
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

export function extrudeY(shape: THREE.Shape, height: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function column(
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

export function squareBattlements(
  parent: THREE.Object3D,
  material: Mat,
  size: number,
  y: number,
  count = 5,
  merlon = 1.08,
  height = 1.55,
  sizeZ = size,
) {
  const halfX = size / 2 - merlon * 0.28;
  const halfZ = sizeZ / 2 - merlon * 0.28;
  const spanX = size - merlon;
  const spanZ = sizeZ - merlon;
  for (let side = 0; side < 4; side++) {
    const yaw = (side * Math.PI) / 2;
    const isXEdge = side % 2 === 0;
    const half = isXEdge ? halfX : halfZ;
    const span = isXEdge ? spanZ : spanX;
    for (let i = 0; i < count; i++) {
      const along = (i / Math.max(count - 1, 1) - 0.5) * span;
      const x = Math.cos(yaw) * half - Math.sin(yaw) * along;
      const z = Math.sin(yaw) * half + Math.cos(yaw) * along;
      box(parent, material, merlon, height, merlon, x, y, z);
    }
  }
}

export function squareParapet(
  parent: THREE.Object3D,
  material: Mat,
  size: number,
  y: number,
  thick = 0.72,
  wallH = 0.95,
  merlonH = 1.5,
  sizeZ = size,
) {
  const innerZ = sizeZ - thick * 2;
  box(parent, material, size, wallH, thick, 0, y, -(sizeZ / 2) + thick / 2);
  box(parent, material, size, wallH, thick, 0, y, sizeZ / 2 - thick / 2);
  box(parent, material, thick, wallH, innerZ, -(size / 2) + thick / 2, y, 0);
  box(parent, material, thick, wallH, innerZ, size / 2 - thick / 2, y, 0);
  squareBattlements(parent, material, size, y + wallH, 5, 1.08, merlonH, sizeZ);
}

export function hardGableHut(
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

export function trapDoorGeo(wBottom: number, wTop: number, h: number, depth: number) {
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

export function incaHouse(
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
  y = 0,
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
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
}

export function templeCourt(
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
export function addPyramidArrisFeatures(
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

export function coursedPyramid(
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

export function serpentHead(parent: THREE.Object3D, material: Mat, x: number, z: number, yaw = 0) {
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
  head.rotation.y = yaw;
  parent.add(head);
}

/** 吉萨：分层砌石、哈夫拉顶层塔拉灰岩、狮身人面像与堤道。 */
