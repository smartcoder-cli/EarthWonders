import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  type Mat,
  box,
  cyl,
  frustumGeo,
  archSlab,
  trapWallGeo,
  squareParapet,
  hardGableHut,
} from "./_shared";

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
