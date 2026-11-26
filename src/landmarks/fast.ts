import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";

export function createFastTelescope(kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "FAST";

  const dishRadius = 250;
  const rimHeight = 95;
  const dishBottom = 15; // 凹面反射面中心高程 15m，圈梁高程 95m（净凹深 80m）

  // 1. 圈梁底盘（收窄至与 250m 口径圈梁柱脚对齐，避免在真实喀斯特山体外部产生多余的“大锅底”）
  const basinFloor = new THREE.Mesh(
    new THREE.CircleGeometry(dishRadius + 2, 48),
    mapped(kit.machu, { color: 0x2d3b2e, roughness: 0.95, metersPerTile: 12 }),
  );
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.position.set(0, 1.0, 0);
  basinFloor.receiveShadow = true;
  group.add(basinFloor);

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

  // 4. Six Feed-Cabin Support Towers (6 馈源支撑塔：基础承台落地至 y=0，上部塔身至 y=205m)
  const towerCount = 6;
  const towerRadius = dishRadius + 22;
  const towerH = 110;
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

    const legBase = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 11.5, ty, 4), pierMat);
    legBase.rotation.y = a;
    legBase.position.set(tx, ty / 2, tz);
    legBase.castShadow = true;
    group.add(legBase);

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
  const cabinPos = new THREE.Vector3(0, rimHeight + 50, 0);
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

