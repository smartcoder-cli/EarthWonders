import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  cyl,
} from "./_shared";

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
  const abacusGeo = new THREE.BoxGeometry(2.1, 0.3, 2.1);
  const echinusGeo = new THREE.CylinderGeometry(1.08, 0.74, 0.3, 20);

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

  // 右手系下向中心微倾收敛：+x 倾 -x 需绕 Z 正旋，+z 倾 -z 需绕 X 负旋
  for (const [cx, cz] of colPositions) {
    const col = new THREE.Mesh(colGeo, marbleDay);
    col.position.set(cx, colBaseY + colHeight / 2, cz);
    col.rotation.z = cx * 0.0006;
    col.rotation.x = -cz * 0.0006;
    root.add(col);
    marbleMeshes.push(col);

    const echinus = new THREE.Mesh(echinusGeo, marbleDay);
    echinus.position.set(cx, colBaseY + colHeight + 0.15, cz);
    root.add(echinus);
    marbleMeshes.push(echinus);

    const abacus = new THREE.Mesh(abacusGeo, marbleDay);
    abacus.position.set(cx, colBaseY + colHeight + 0.45, cz);
    root.add(abacus);
    marbleMeshes.push(abacus);
  }

  // 4. 楣梁与多立克排档三进饰中楣 (总高控制贴近实景 ~15.5m 以上柱廊台面)
  box(root, marbleDay, 67.5, 1.05, 2.0, 0, 17.65, -spanZ / 2);
  box(root, marbleDay, 67.5, 1.05, 2.0, 0, 17.65, spanZ / 2);
  box(root, marbleDay, 2.0, 1.05, 28.5, -spanX / 2, 17.65, 0);
  box(root, marbleDay, 2.0, 1.05, 28.5, spanX / 2, 17.65, 0);

  const friezeY = 18.7;
  const friezeLong = box(root, marbleDay, 67.5, 1.05, 1.8, 0, friezeY, -spanZ / 2);
  const friezeLong2 = box(root, marbleDay, 67.5, 1.05, 1.8, 0, friezeY, spanZ / 2);
  const friezeShort1 = box(root, marbleDay, 1.8, 1.05, 28.5, -spanX / 2, friezeY, 0);
  const friezeShort2 = box(root, marbleDay, 1.8, 1.05, 28.5, spanX / 2, friezeY, 0);
  marbleMeshes.push(friezeLong, friezeLong2, friezeShort1, friezeShort2);

  // 东西长边 + 南北短边四面完整三进饰排档块 (92 块 Metopes 对应分布)
  for (let ix = 0; ix < 31; ix++) {
    const tx = -spanX / 2 + (ix / 30) * spanX;
    box(root, stone(0x78350f, 0.9, 0.1), 0.52, 1.0, 0.2, tx, friezeY, -spanZ / 2 - 0.95);
    box(root, stone(0x78350f, 0.9, 0.1), 0.52, 1.0, 0.2, tx, friezeY, spanZ / 2 + 0.95);
  }
  for (let iz = 0; iz < 15; iz++) {
    const tz = -spanZ / 2 + (iz / 14) * spanZ;
    box(root, stone(0x78350f, 0.9, 0.1), 0.2, 1.0, 0.52, -spanX / 2 - 0.95, friezeY, tz);
    box(root, stone(0x78350f, 0.9, 0.1), 0.2, 1.0, 0.52, spanX / 2 + 0.95, friezeY, tz);
  }

  // 5. 东西三角楣山花 (y = 19.75 ~ 23.1m)
  for (const sx of [-spanX / 2, spanX / 2]) {
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-15.4, 0);
    pedShape.lineTo(15.4, 0);
    pedShape.lineTo(0, 3.2);
    pedShape.closePath();

    const pedGeo = new THREE.ExtrudeGeometry(pedShape, {
      depth: 2.0,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.3,
    });
    pedGeo.center();
    const pedMesh = new THREE.Mesh(pedGeo, marbleDay);
    pedMesh.rotation.y = Math.PI / 2;
    pedMesh.position.set(sx, 21.35, 0);
    root.add(pedMesh);
    marbleMeshes.push(pedMesh);

    for (const oz of [-9, -4.5, 0, 4.5, 9]) {
      const statueH = 2.7 - Math.abs(oz) * 0.18;
      const statue = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.42, statueH, 8),
        marbleDay
      );
      statue.position.set(sx + (sx > 0 ? 0.9 : -0.9), 19.8 + statueH / 2, oz);
      root.add(statue);
      marbleMeshes.push(statue);
    }
  }

  // 6. 大理石双坡屋顶
  const roofShape = new THREE.Shape();
  const eaveZ = 16.0;
  const ridgeY = 23.2;
  const eaveY = 19.9;
  const slabThick = 0.5;

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
  roofMesh.position.set(0, 21.45, 0);
  root.add(roofMesh);
  marbleMeshes.push(roofMesh);

  const ridgeBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 68.5, 8),
    marbleDay,
  );
  ridgeBeam.position.set(0, 23.35, 0);
  ridgeBeam.rotation.z = Math.PI / 2;
  root.add(ridgeBeam);
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

// 连续光滑三维非对称环面参数化几何体 (Continuous 3D Asymmetrical Parametric Torus Geometry)
