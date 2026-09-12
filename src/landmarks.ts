import * as THREE from "three";
import { finishSurfaces, mapped, type SurfaceKit } from "./surfaces";

function stone(color: number, roughness = 0.9, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: false,
  });
}

function box(
  parent: THREE.Object3D,
  material: THREE.Material,
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
  material: THREE.Material,
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
  const idx = [
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
    4, 5, 6, 4, 6, 7,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(idx);
  const uvs = new Float32Array(8 * 2);
  for (let i = 0; i < 8; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    uvs[i * 2] = (x + hb) / Math.max(base, 1);
    uvs[i * 2 + 1] = y / Math.max(height, 1);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function onionLathe(radius: number, height: number, segments = 24) {
  const pts = [
    [0.02, 0],
    [radius * 0.42, height * 0.06],
    [radius, height * 0.32],
    [radius * 0.92, height * 0.58],
    [radius * 0.38, height * 0.86],
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
  shape.quadraticCurveTo(-hw * 0.15, height * 0.92, 0, height);
  shape.quadraticCurveTo(hw * 0.15, height * 0.92, hw, spring);
  shape.lineTo(hw, 0);
  shape.closePath();
  return shape;
}

function archSlab(width: number, height: number, depth: number, thickness: number) {
  const outer = new THREE.Shape();
  const ow = width / 2 + thickness;
  outer.moveTo(-ow, 0);
  outer.lineTo(-ow, height + thickness);
  outer.lineTo(ow, height + thickness);
  outer.lineTo(ow, 0);
  outer.closePath();
  const hole = pointedArchShape(width, height);
  outer.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function column(
  parent: THREE.Object3D,
  material: THREE.Material,
  height: number,
  radius: number,
  x: number,
  y: number,
  z: number,
) {
  cyl(parent, material, radius * 1.35, radius * 1.4, height * 0.08, x, y, z, 12);
  cyl(parent, material, radius * 0.92, radius, height * 0.82, x, y + height * 0.08, z, 14);
  box(parent, material, radius * 3.1, height * 0.07, radius * 3.1, x, y + height * 0.9, z);
}

function chineseRoof(
  parent: THREE.Object3D,
  material: THREE.Material,
  w: number,
  d: number,
  y: number,
  rise = 3.2,
) {
  box(parent, material, w + 1.8, 0.55, d + 1.8, 0, y, 0);
  const roof = new THREE.Mesh(pyramidGeo(Math.max(w, d) + 3.2, rise), material);
  roof.position.set(0, y + 0.55, 0);
  roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  parent.add(roof);
}

function house(
  parent: THREE.Object3D,
  wall: THREE.Material,
  roof: THREE.Material,
  dark: THREE.Material,
  w: number,
  d: number,
  h: number,
  x: number,
  z: number,
  rotY = 0,
) {
  const g = new THREE.Group();
  box(g, wall, w, h, d, 0, 0, 0);
  box(g, dark, w * 0.22, h * 0.55, 0.4, 0, 0, -d / 2 + 0.15);
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.55, 4), roof);
  roofMesh.rotateY(Math.PI / 4);
  roofMesh.position.set(0, h + h * 0.28, 0);
  g.add(roofMesh);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
}

function templeCourt(
  parent: THREE.Object3D,
  wall: THREE.Material,
  floor: THREE.Material,
  w: number,
  d: number,
  x: number,
  z: number,
) {
  box(parent, floor, w, 1.2, d, x, 0, z);
  box(parent, wall, w, 4.2, 1.6, x, 1.2, z - d / 2 + 0.8);
  box(parent, wall, w, 4.2, 1.6, x, 1.2, z + d / 2 - 0.8);
  box(parent, wall, 1.6, 4.2, d - 2, x - w / 2 + 0.8, 1.2, z);
  box(parent, wall, 1.6, 4.2, d - 2, x + w / 2 - 0.8, 1.2, z);
}

/** 吉萨：按实测间距布置胡夫 / 哈夫拉 / 孟卡拉，狮身人面像在东南、面朝东。 */
export function createGiza(kit: SurfaceKit) {
  const root = new THREE.Group();
  const lime = mapped(kit.pyramid, 18, 14, { roughness: 0.86 });
  const aged = mapped(kit.pyramid, 16, 12, { color: 0xe8c080, roughness: 0.9 });
  const pale = mapped(kit.pyramid, 4, 3, { color: 0xfff3d2, roughness: 0.72 });
  const sand = mapped(kit.pyramid, 10, 6, { color: 0xe0c080, roughness: 0.92 });
  const sphinxMat = mapped(kit.pyramid, 8, 6, { color: 0xe2c070, roughness: 0.86 });
  const khafreMat = mapped(kit.pyramid, 16, 13, { color: 0xf0d090, roughness: 0.86 });
  const menkaureMat = mapped(kit.pyramid, 10, 8, { color: 0xe8c070, roughness: 0.88 });

  root.add(new THREE.Mesh(pyramidGeo(230.3, 138.8), lime));
  templeCourt(root, aged, sand, 52, 40, 138, 0);

  const khafreX = -325;
  const khafreZ = -344;
  const khafreBase = new THREE.Mesh(new THREE.BoxGeometry(215.3, 10, 215.3), aged);
  khafreBase.position.set(khafreX, 5, khafreZ);
  root.add(khafreBase);
  const khafre = new THREE.Mesh(pyramidGeo(215.3, 136.4), khafreMat);
  khafre.position.set(khafreX, 10, khafreZ);
  root.add(khafre);
  const khafreCap = new THREE.Mesh(pyramidGeo(36, 22), pale);
  khafreCap.position.set(khafreX, 10 + 136.4 - 11, khafreZ);
  root.add(khafreCap);

  const menkaureX = -566;
  const menkaureZ = -746;
  const menkaure = new THREE.Mesh(pyramidGeo(102.2, 65), menkaureMat);
  menkaure.position.set(menkaureX, 0, menkaureZ);
  root.add(menkaure);
  for (const [dx, s] of [
    [-32, 31.5],
    [2, 31.2],
    [36, 21.7],
  ] as const) {
    const q = new THREE.Mesh(pyramidGeo(s, s * 0.62), aged);
    q.position.set(menkaureX + dx, 0, menkaureZ - 78);
    root.add(q);
  }

  for (const [x, s] of [
    [-18, 45.5],
    [29, 47.4],
    [76, 43.7],
  ] as const) {
    const q = new THREE.Mesh(pyramidGeo(s, s * 0.62), aged);
    q.position.set(x, 0, -148);
    root.add(q);
  }

  const sphinx = new THREE.Group();
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(11.5, 14, 10), sphinxMat);
  haunch.scale.set(1.2, 0.78, 1.45);
  haunch.position.set(0, 10.5, -18);
  sphinx.add(haunch);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(9.6, 32, 8, 14), sphinxMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 10.8, 2);
  sphinx.add(body);
  box(sphinx, sphinxMat, 8.8, 5.4, 24, -7, 0, 24);
  box(sphinx, sphinxMat, 8.8, 5.4, 24, 7, 0, 24);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(8.5, 1.2, 8, 12, Math.PI * 0.7), sphinxMat);
  tail.rotation.set(Math.PI / 2, 0, Math.PI / 6);
  tail.position.set(8, 8.2, -28);
  sphinx.add(tail);
  box(sphinx, sphinxMat, 18, 16.5, 15, 0, 12.2, 32);
  box(sphinx, sphinxMat, 23, 3.5, 3.4, 0, 28, 32);
  box(sphinx, sphinxMat, 6.4, 11.5, 2.5, -11, 16.2, 32);
  box(sphinx, sphinxMat, 6.4, 11.5, 2.5, 11, 16.2, 32);
  const face = new THREE.Mesh(new THREE.SphereGeometry(5.8, 16, 12), pale);
  face.position.set(0, 24.8, 38.5);
  sphinx.add(face);
  box(sphinx, sphinxMat, 3.5, 4.4, 2.3, 0, 20.6, 40.8);
  sphinx.position.set(345, 0, -436);
  sphinx.rotation.y = Math.PI / 2;
  root.add(sphinx);
  templeCourt(root, aged, sand, 36, 28, 410, -436);
  return root;
}

/** 长城：梯形墙身、双侧垛口、歇山顶敌楼。 */
export function createGreatWall(kit: SurfaceKit) {
  const root = new THREE.Group();
  const brick = mapped(kit.wall, 6, 4, { roughness: 0.94 });
  const brickDark = mapped(kit.wall, 5, 3, { color: 0xc08060, roughness: 0.95 });
  const tile = mapped(kit.wall, 4, 3, { color: 0x8a5040, roughness: 0.82 });
  const length = 640;
  const segments = 32;
  const wallH = 9.2;
  const dummy = new THREE.Object3D();
  const merlonGeo = new THREE.BoxGeometry(1.15, 1.8, 1.5);
  const merlons = new THREE.InstancedMesh(merlonGeo, brickDark, segments * 4);
  let merlonIndex = 0;

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const z0 = -length / 2 + t0 * length;
    const z1 = -length / 2 + t1 * length;
    const x0 = Math.sin(t0 * Math.PI * 1.55) * 26;
    const x1 = Math.sin(t1 * Math.PI * 1.55) * 26;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const seg = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(7.4, wallH, seg), brick);
    mesh.position.set((x0 + x1) / 2, wallH / 2, (z0 + z1) / 2);
    mesh.rotation.y = yaw;
    root.add(mesh);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, seg), brickDark);
    walk.position.set((x0 + x1) / 2, wallH + 0.15, (z0 + z1) / 2);
    walk.rotation.y = yaw;
    root.add(walk);

    for (const side of [-2.8, 2.8]) {
      dummy.position.set(
        (x0 + x1) / 2 + Math.cos(yaw) * side,
        wallH + 0.95,
        (z0 + z1) / 2 - Math.sin(yaw) * side,
      );
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      merlons.setMatrixAt(merlonIndex++, dummy.matrix);
    }

    if (i % 5 === 0) {
      const tower = new THREE.Group();
      box(tower, brick, 15, 17, 15, 0, 0, 0);
      box(tower, brickDark, 4.2, 3.6, 1.2, 0, 8, -7.2);
      box(tower, brickDark, 4.2, 3.6, 1.2, 0, 8, 7.2);
      chineseRoof(tower, tile, 17.5, 17.5, 17, 4.4);
      tower.position.set(x0, 0, z0);
      tower.rotation.y = yaw;
      root.add(tower);
    }
  }
  merlons.count = merlonIndex;
  merlons.instanceMatrix.needsUpdate = true;
  root.add(merlons);
  return root;
}

/** 佩特拉宝库：六柱下层、破山花、圆形神龛与顶上瓮饰。 */
export function createPetra(kit: SurfaceKit) {
  const root = new THREE.Group();
  const cliff = mapped(kit.petra, 8, 6, { color: 0xc07060, roughness: 0.97 });
  const sand = mapped(kit.petra, 6, 5, { roughness: 0.88 });
  const sandLight = mapped(kit.petra, 5, 4, { color: 0xffc8b0, roughness: 0.84 });
  const dark = mapped(kit.petra, 3, 3, { color: 0x6a3028, roughness: 0.93 });

  box(root, cliff, 108, 72, 28, 0, 0, 12);
  for (const [x, h] of [
    [-46, 64],
    [-28, 78],
    [0, 70],
    [30, 76],
    [48, 62],
  ] as const) {
    box(root, cliff, 18, h - 58, 10, x, 58, 14);
  }

  box(root, sand, 46, 26, 7, 0, 0, -3);
  for (let i = 0; i < 6; i++) {
    column(root, sandLight, 20, 1.05, -17.5 + i * 7, 2.2, -6.4);
  }
  box(root, sand, 44, 2.2, 6.5, 0, 22.2, -4.2);
  box(root, sand, 44, 1.1, 6.2, 0, 24.4, -4.2);
  box(root, dark, 7.2, 12.5, 2.4, 0, 2.4, -7);
  const doorPed = new THREE.Mesh(pyramidGeo(9.5, 3.2), sand);
  doorPed.position.set(0, 15.2, -6.6);
  doorPed.scale.set(1, 1, 0.18);
  root.add(doorPed);
  box(root, dark, 4.4, 8, 1.6, -12.5, 3, -6.8);
  box(root, dark, 4.4, 8, 1.6, 12.5, 3, -6.8);

  box(root, sand, 18, 14, 6, -16, 26, -3.6);
  box(root, sand, 18, 14, 6, 16, 26, -3.6);
  const leftPed = new THREE.Mesh(pyramidGeo(18, 6), sand);
  leftPed.position.set(-16, 40, -3.6);
  leftPed.scale.set(1, 1, 0.2);
  root.add(leftPed);
  const rightPed = new THREE.Mesh(pyramidGeo(18, 6), sand);
  rightPed.position.set(16, 40, -3.6);
  rightPed.scale.set(1, 1, 0.2);
  root.add(rightPed);

  column(root, sandLight, 12, 0.9, -6.2, 26, -6.2);
  column(root, sandLight, 12, 0.9, 6.2, 26, -6.2);
  cyl(root, sand, 5.8, 5.8, 12, 0, 26, -5.2, 20);
  const tholos = new THREE.Mesh(onionLathe(6.2, 9.5, 20), sandLight);
  tholos.position.set(0, 38, -5.2);
  root.add(tholos);
  cyl(root, sandLight, 0.7, 1.1, 3.4, 0, 47.2, -5.2, 8);
  const urn = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 10), sandLight);
  urn.position.set(0, 51.4, -5.2);
  root.add(urn);
  return root;
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

function extrudeY(shape: THREE.Shape, height: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** 斗兽场：外立面拱券 + 分层看台、围墙、地宫格网、放射通道。 */
export function createColosseum(kit: SurfaceKit) {
  const root = new THREE.Group();
  const travertine = mapped(kit.colosseum, { roughness: 0.88 });
  const trim = mapped(kit.colosseum, { color: 0xe8d0a8, roughness: 0.9 });
  const seatMat = mapped(kit.colosseum, { color: 0xd7b892, roughness: 0.93 });
  const voidMat = stone(0x3a281c, 0.98);
  const sand = mapped(kit.arena, { roughness: 0.96 });

  root.add(new THREE.Mesh(extrudeY(ring(96, 80, 63, 51), 50), travertine));

  const attic = new THREE.Mesh(extrudeY(ring(96.6, 80.6, 90, 74.5), 7.5), trim);
  attic.position.y = 50;
  root.add(attic);

  const podium = new THREE.Mesh(extrudeY(ring(36, 28, 32.4, 25.2, 48), 4.6), trim);
  podium.position.y = 1.6;
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

  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 56).scale(32, 24, 1), sand);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 1.55;
  root.add(floor);

  for (let ix = -3; ix <= 3; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      if (ix === 0 && iz === 0) continue;
      box(root, voidMat, 5.6, 0.45, 3.8, ix * 7.6, 1.55, iz * 6.2);
    }
  }
  box(root, voidMat, 28, 0.35, 0.7, 0, 1.55, 0);
  box(root, voidMat, 0.7, 0.35, 20, 0, 1.55, 0);

  for (let i = 0; i < 8; i++) {
    const aisle = new THREE.Group();
    box(aisle, voidMat, 3.6, 3.4, 26, 0, 2.1, -48);
    box(aisle, trim, 0.7, 3.8, 26, -2.1, 2.1, -48);
    box(aisle, trim, 0.7, 3.8, 26, 2.1, 2.1, -48);
    aisle.rotation.y = (i * Math.PI) / 4;
    root.add(aisle);
  }

  const innerArch = archSlab(3.6, 6.4, 2.4, 0.85);
  const innerArches = new THREE.InstancedMesh(innerArch, voidMat, 28);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 36.4, 2.4, Math.sin(a) * 28.4);
    dummy.lookAt(0, 2.4, 0);
    dummy.updateMatrix();
    innerArches.setMatrixAt(i, dummy.matrix);
  }
  root.add(innerArches);

  const archGeo = archSlab(4.4, 8.8, 3.4, 1.05);
  const levels = [
    { y: 2.2, count: 80, rx: 95.4, rz: 79.4 },
    { y: 16.2, count: 80, rx: 95.4, rz: 79.4 },
    { y: 30.4, count: 76, rx: 95.2, rz: 79.2 },
  ];
  let total = 0;
  for (const level of levels) total += level.count;
  const arches = new THREE.InstancedMesh(archGeo, voidMat, total);
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 12, 0.7), trim, total);
  let n = 0;
  for (const level of levels) {
    for (let i = 0; i < level.count; i++) {
      const a = (i / level.count) * Math.PI * 2;
      const x = Math.cos(a) * level.rx;
      const z = Math.sin(a) * level.rz;
      dummy.position.set(x, level.y, z);
      dummy.lookAt(x * 1.2, level.y, z * 1.2);
      dummy.updateMatrix();
      arches.setMatrixAt(n, dummy.matrix);
      dummy.position.set(x * 0.992, level.y + 6, z * 0.992);
      dummy.updateMatrix();
      frames.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
  }
  root.add(arches);
  root.add(frames);

  const boxSeat = new THREE.Group();
  box(boxSeat, trim, 16, 7.2, 9, 0, 11.5, 54);
  box(boxSeat, voidMat, 8, 4.4, 1.4, 0, 13.2, 49.6);
  box(boxSeat, trim, 17.2, 1.1, 10.2, 0, 18.7, 54);
  root.add(boxSeat);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    cyl(root, trim, 0.38, 0.42, 9, Math.cos(a) * 93.5, 57, Math.sin(a) * 77.5, 8);
  }
  return root;
}

function serpentHead(parent: THREE.Object3D, material: THREE.Material, x: number, z: number) {
  const head = new THREE.Group();
  box(head, material, 2.6, 2.2, 5.4, 0, 0.2, 0);
  box(head, material, 2.2, 1.1, 3.4, 0, 2.2, 0.4);
  box(head, material, 0.7, 0.7, 2.8, -1.3, 1.4, 2.2);
  box(head, material, 0.7, 0.7, 2.8, 1.3, 1.4, 2.2);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), stone(0x2b2118, 0.6));
  eyeL.position.set(-0.85, 2.6, 1.6);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.85;
  head.add(eyeL, eyeR);
  head.position.set(x, 0, z);
  parent.add(head);
}

/** 奇琴伊察：库库尔坎九层塔、羽蛇栏杆、旁侧圆形天文台。 */
export function createChichenItza(kit: SurfaceKit) {
  const root = new THREE.Group();
  const lime = mapped(kit.chichen, 8, 6, { roughness: 0.92 });
  const dark = mapped(kit.chichen, 6, 4, { color: 0xb08050, roughness: 0.9 });
  const accent = mapped(kit.chichen, 5, 4, { color: 0xe8c890, roughness: 0.88 });
  const comb = mapped(kit.chichen, 4, 3, { color: 0xd4a060, roughness: 0.9 });
  let y = 0;
  let size = 55.3;
  for (let i = 0; i < 9; i++) {
    const next = size - 4.35;
    const layer = new THREE.Mesh(frustumGeo(size, next + 0.5, 2.65), i % 2 ? accent : lime);
    layer.position.y = y;
    root.add(layer);
    y += 2.65;
    size = next;
  }
  box(root, lime, 14.2, 6.8, 14.2, 0, y, 0);
  box(root, comb, 16.4, 4.6, 2.2, 0, y + 6.8, 0);
  for (let i = 0; i < 7; i++) {
    box(root, comb, 1.3, 3.4, 1.6, -6 + i * 2, y + 11.2, 0);
  }
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const g = new THREE.Group();
    box(g, dark, 3.8, 5.2, 1.4, 0, y + 0.6, -6.8);
    g.rotation.y = yaw;
    root.add(g);
  }

  for (const dir of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const stair = new THREE.Group();
    for (let i = 0; i < 20; i++) {
      box(stair, dark, 8.6, 0.78, 1.85, 0, i * 1.2, -29.2 + i * 1.42);
    }
    box(stair, accent, 1.25, 22, 1.25, -4.9, 0, -16);
    box(stair, accent, 1.25, 22, 1.25, 4.9, 0, -16);
    serpentHead(stair, dark, -4.8, -30.4);
    serpentHead(stair, dark, 4.8, -30.4);
    stair.rotation.y = dir;
    root.add(stair);
  }

  const caracol = new THREE.Group();
  box(caracol, lime, 28, 3.2, 28, 0, 0, 0);
  cyl(caracol, accent, 9.4, 10.2, 14, 0, 3.2, 0, 20);
  cyl(caracol, lime, 7.2, 7.6, 8, 0, 17.2, 0, 18);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7.6, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), lime);
  dome.position.set(0, 25.6, 0);
  caracol.add(dome);
  box(caracol, dark, 3.2, 4.4, 1.2, 0, 5.5, -10);
  box(caracol, dark, 2.2, 2.6, 1.1, 3.4, 19, -6.6);
  caracol.position.set(-218, 0, -411);
  root.add(caracol);
  return root;
}

function terraceBand(
  parent: THREE.Object3D,
  material: THREE.Material,
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
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.8, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, y, z);
  parent.add(mesh);
}

/** 马丘比丘：北向梯田、中央广场、石屋区、太阳神庙与瓦伊纳皮克丘。 */
export function createMachuPicchu(kit: SurfaceKit) {
  const root = new THREE.Group();
  const grass = mapped(kit.grass, 8, 5, { roughness: 0.98 });
  const grass2 = mapped(kit.grass, 7, 4, { color: 0xc8e0a0, roughness: 0.97 });
  const rock = mapped(kit.machu, 6, 4, { roughness: 0.93 });
  const roof = mapped(kit.machu, 4, 3, { color: 0x8a7048, roughness: 0.88 });
  const dark = mapped(kit.machu, 3, 2, { color: 0x505040, roughness: 0.96 });
  const peak = mapped(kit.machu, 10, 8, { color: 0x90a080, roughness: 0.96 });

  for (let i = 0; i < 7; i++) {
    terraceBand(
      root,
      i % 2 === 0 ? grass : grass2,
      108 - i * 7,
      18,
      i * 2.9,
      38 - i * 5.2,
      8 - i,
    );
  }
  box(root, grass, 42, 1.1, 28, 2, 18.4, 4);

  house(root, rock, roof, dark, 15, 11, 7.2, -24, 10, 0.12);
  house(root, rock, roof, dark, 12, 10, 6.4, -8, 16, -0.18);
  house(root, rock, roof, dark, 18, 12, 8, 16, 12, 0.22);
  house(root, rock, roof, dark, 11, 9, 6, 32, 18, -0.28);
  house(root, rock, roof, dark, 13, 10, 6.8, 8, -2, 0.08);
  house(root, rock, roof, dark, 10, 8, 5.6, -32, 22, 0.4);
  house(root, rock, roof, dark, 14, 11, 7, -16, -8, -0.12);
  house(root, rock, roof, dark, 9, 8, 5.2, 28, -6, 0.3);

  box(root, rock, 22, 6.5, 16, -6, 19.2, -18);
  box(root, dark, 4.6, 4.2, 1.1, -6, 19.6, -25.6);
  box(root, dark, 3.2, 3.6, 1.1, -12, 19.6, -25.6);
  box(root, dark, 3.2, 3.6, 1.1, 0, 19.6, -25.6);
  const templeRoof = new THREE.Mesh(new THREE.ConeGeometry(12, 6.5, 4), roof);
  templeRoof.rotateY(Math.PI / 4);
  templeRoof.position.set(-6, 28.8, -18);
  root.add(templeRoof);

  box(root, rock, 6, 1.4, 6, 10, 19.2, -8);
  cyl(root, rock, 0.9, 1.3, 4.2, 10, 20.6, -8, 8);

  const huayna = new THREE.Group();
  huayna.add(new THREE.Mesh(new THREE.ConeGeometry(36, 96, 7), peak));
  const shoulder = new THREE.Mesh(
    new THREE.ConeGeometry(22, 48, 6),
    mapped(kit.machu, 6, 8, { color: 0x7a8a70, roughness: 0.96 }),
  );
  shoulder.position.set(-18, -8, 10);
  huayna.add(shoulder);
  const knoll = new THREE.Mesh(new THREE.SphereGeometry(16, 10, 8), peak);
  knoll.scale.set(1.4, 0.55, 1);
  knoll.position.set(12, -28, 8);
  huayna.add(knoll);
  huayna.position.set(10, 58, -92);
  root.add(huayna);
  return root;
}

function iwan(parent: THREE.Object3D, marble: THREE.Material, dark: THREE.Material, yaw: number) {
  const g = new THREE.Group();
  const frame = archSlab(16, 22, 4.5, 2.4);
  const mesh = new THREE.Mesh(frame, marble);
  mesh.position.set(0, 6, -26.2);
  g.add(mesh);
  const inner = new THREE.Mesh(archSlab(12.5, 18, 1.2, 0.2), dark);
  inner.position.set(0, 6.6, -28.2);
  g.add(inner);
  g.rotation.y = yaw;
  parent.add(g);
}

/** 泰姬陵：四向伊旺、洋葱穹顶、带阳台的宣礼塔、十字水渠。 */
export function createTajMahal(kit: SurfaceKit) {
  const root = new THREE.Group();
  const marble = mapped(kit.marble, 8, 6, { roughness: 0.42, metalness: 0.08 });
  const inlay = mapped(kit.marble, 5, 4, { color: 0xf0e6d8, roughness: 0.5, metalness: 0.06 });
  const dark = mapped(kit.marble, 3, 3, { color: 0x6a5a50, roughness: 0.9 });
  const water = new THREE.MeshStandardMaterial({
    color: 0x6eafd4,
    roughness: 0.12,
    metalness: 0.28,
  });
  const lawn = mapped(kit.grass, 6, 6, { roughness: 0.98 });

  box(root, marble, 108, 5, 108, 0, 0, 0);
  box(root, lawn, 36, 0.5, 36, -32, 5, -32);
  box(root, lawn, 36, 0.5, 36, 32, 5, -32);
  box(root, lawn, 36, 0.5, 36, -32, 5, 32);
  box(root, lawn, 36, 0.5, 36, 32, 5, 32);
  box(root, water, 8, 0.45, 108, 0, 5.05, 0);
  box(root, water, 108, 0.45, 8, 0, 5.05, 0);
  box(root, water, 14, 0.5, 52, 0, 5.08, -70);

  box(root, marble, 58, 32, 58, 0, 5, 0);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    iwan(root, marble, dark, yaw);
  }
  for (const [x, z] of [
    [-22, -22],
    [22, -22],
    [-22, 22],
    [22, 22],
  ] as const) {
    box(root, marble, 10, 8, 10, x, 37, z);
    const chhatri = new THREE.Mesh(onionLathe(5.2, 7.4, 16), marble);
    chhatri.position.set(x, 45, z);
    root.add(chhatri);
    cyl(root, marble, 0.35, 0.45, 3.2, x, 52.2, z, 8);
  }

  cyl(root, inlay, 15.5, 16.5, 12, 0, 37, 0, 28);
  const dome = new THREE.Mesh(onionLathe(18.5, 26, 28), marble);
  dome.position.set(0, 49, 0);
  root.add(dome);
  cyl(root, marble, 0.55, 0.8, 8, 0, 75, 0, 8);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), marble);
  ball.position.set(0, 84, 0);
  root.add(ball);

  for (const [x, z] of [
    [-46, -46],
    [46, -46],
    [-46, 46],
    [46, 46],
  ] as const) {
    cyl(root, marble, 2.05, 2.55, 18, x, 5, z, 14);
    box(root, inlay, 6.2, 1.1, 6.2, x, 23, z);
    cyl(root, marble, 1.7, 2.05, 12, x, 24.1, z, 14);
    box(root, inlay, 5.4, 1.0, 5.4, x, 36.1, z);
    cyl(root, marble, 1.25, 1.7, 10, x, 37.1, z, 14);
    const cap = new THREE.Mesh(onionLathe(3.4, 5.2, 14), marble);
    cap.position.set(x, 47.2, z);
    root.add(cap);
  }
  return root;
}

/** 基督像：装饰艺术基座、袍形身躯、平举双臂。 */
export function createChrist(kit: SurfaceKit) {
  const root = new THREE.Group();
  const soap = mapped(kit.soapstone, 4, 6, { roughness: 0.62, metalness: 0.04 });
  const soapDark = mapped(kit.soapstone, 3, 4, { color: 0xe0d8c8, roughness: 0.7 });
  const rock = mapped(kit.machu, 5, 3, { color: 0xa09888, roughness: 0.92 });

  box(root, rock, 18, 6, 18, 0, 0, 0);
  box(root, rock, 14, 5, 14, 0, 6, 0);
  box(root, soapDark, 10, 4, 10, 0, 11, 0);
  for (const x of [-6, 6]) {
    box(root, rock, 1.1, 14, 1.1, x, 1, -8.2);
    box(root, rock, 1.1, 14, 1.1, x, 1, 8.2);
  }

  const robe = new THREE.LatheGeometry(
    [
      [2.35, 0],
      [2.7, 1.2],
      [2.2, 6],
      [1.85, 11],
      [1.7, 15.5],
      [1.15, 17.2],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    20,
  );
  const body = new THREE.Mesh(robe, soap);
  body.position.y = 15;
  root.add(body);

  const armGeo = new THREE.CapsuleGeometry(1.15, 11.5, 6, 10);
  const left = new THREE.Mesh(armGeo, soap);
  left.rotation.z = Math.PI / 2;
  left.position.set(-8.2, 29.4, 0);
  const right = left.clone();
  right.position.x = 8.2;
  root.add(left, right);
  box(root, soap, 2.4, 0.7, 1.5, -15.6, 28.8, 0);
  box(root, soap, 2.4, 0.7, 1.5, 15.6, 28.8, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(2.15, 16, 14), soap);
  head.position.set(0, 34.6, 0.35);
  root.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(2.25, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), soapDark);
  hair.position.set(0, 35.1, 0.15);
  root.add(hair);
  return root;
}

function withMeterUvs(build: (kit: SurfaceKit) => THREE.Group) {
  return (kit: SurfaceKit) => finishSurfaces(build(kit), 7);
}

export const LANDMARK_BUILDERS: Record<string, (kit: SurfaceKit) => THREE.Group> = {
  giza: withMeterUvs(createGiza),
  wall: withMeterUvs(createGreatWall),
  petra: withMeterUvs(createPetra),
  colosseum: withMeterUvs(createColosseum),
  chichen: withMeterUvs(createChichenItza),
  machu: withMeterUvs(createMachuPicchu),
  taj: withMeterUvs(createTajMahal),
  christ: withMeterUvs(createChrist),
};
