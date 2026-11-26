import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";

export function createGoldenGateBridge(_kit: SurfaceKit): THREE.Group {
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

  // 1. 金门海峡水面基座（真实 1:1 尺度，全长 2737m，主跨 1280m，塔高 227m，净空 67m）
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 3400), waterMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  group.add(sea);

  // 2. 桥梁加劲钢桁架路面板
  const DECK_Y = 67;
  const DECK_LEN = 2737;
  const DECK_W = 27;

  // 沥青行车道路面
  const roadDeck = new THREE.Mesh(new THREE.BoxGeometry(DECK_W - 2, 1.4, DECK_LEN), roadSurfaceMat);
  roadDeck.position.set(0, DECK_Y + 3.4, 0);
  group.add(roadDeck);

  // 桥身左右加劲钢桁架梁 (Warren Truss Side Girders)
  for (let side = -1; side <= 1; side += 2) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8.0, DECK_LEN), deckMat);
    truss.position.set(side * (DECK_W / 2 - 0.8), DECK_Y, 0);
    group.add(truss);
  }

  // 3. Art Deco 双塔（南塔 z = -640m，北塔 z = +640m，主跨 1280m，水面以上 227m）
  const towerZs = [-640, 640];
  const TOWER_TOP_Y = 227;

  towerZs.forEach((tz) => {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(50, 24, 34),
      new THREE.MeshStandardMaterial({ color: 0x827b70, roughness: 0.92 })
    );
    pier.position.set(0, 12, tz);
    group.add(pier);

    // 左右塔肢（X 间距 25m，在 x = ±12.5）
    for (let side = -1; side <= 1; side += 2) {
      const tx = side * 12.5;
      const tiers = [
        { w: 13.5, d: 12.0, h: 52, y: 24 + 26 },
        { w: 12.0, d: 10.8, h: 51, y: 76 + 25.5 },
        { w: 10.6, d: 9.6, h: 50, y: 127 + 25 },
        { w: 9.2, d: 8.6, h: 50, y: 177 + 25 },
      ];
      tiers.forEach((tier) => {
        const tMesh = new THREE.Mesh(new THREE.BoxGeometry(tier.w, tier.h, tier.d), towerMat);
        tMesh.position.set(tx, tier.y, tz);
        group.add(tMesh);
      });
    }

    for (let side = -1; side <= 1; side += 2) {
      const finial = new THREE.Mesh(new THREE.BoxGeometry(7.2, 6.0, 7.2), towerMat);
      finial.position.set(side * 12.5, TOWER_TOP_Y + 3.0, tz);
      group.add(finial);
    }

    const portalStrutsY = [84, 134, 180, 216];
    portalStrutsY.forEach((sy) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(24, 7.8, 9.0), towerMat);
      strut.position.set(0, sy, tz);
      group.add(strut);
    });
  });

  // 4. 悬索主缆 (3D Main Cables, 直径 ~0.91m，适配远距可见尺度)
  for (let side = -1; side <= 1; side += 2) {
    const cx = side * 12.5;
    const cablePts = [
      new THREE.Vector3(cx, 24, -1280),
      new THREE.Vector3(cx, 125, -960),
      new THREE.Vector3(cx, TOWER_TOP_Y, -640),
      new THREE.Vector3(cx, 110, -320),
      new THREE.Vector3(cx, DECK_Y + 4.2, 0),
      new THREE.Vector3(cx, 110, 320),
      new THREE.Vector3(cx, TOWER_TOP_Y, 640),
      new THREE.Vector3(cx, 125, 960),
      new THREE.Vector3(cx, 24, 1280),
    ];
    const curve = new THREE.CatmullRomCurve3(cablePts);
    const cableGeo = new THREE.TubeGeometry(curve, 96, 0.9, 8, false);
    const cableMesh = new THREE.Mesh(cableGeo, deckMat);
    group.add(cableMesh);
  }

  // 垂直吊索阵列
  const suspLines: number[] = [];
  for (let z = -1224; z <= 1224; z += 36) {
    if (Math.abs(Math.abs(z) - 640) < 28) continue;
    let cy = DECK_Y + 4.2;
    if (Math.abs(z) <= 640) {
      const u = z / 640;
      cy = DECK_Y + 4.2 + u * u * (TOWER_TOP_Y - (DECK_Y + 4.2));
    } else {
      const u = (Math.abs(z) - 640) / 640;
      cy = TOWER_TOP_Y - u * (TOWER_TOP_Y - 24);
    }

    for (let side = -1; side <= 1; side += 2) {
      const cx = side * 12.5;
      suspLines.push(cx, cy, z, cx, DECK_Y + 4.2, z);
    }
  }

  const suspGeo = new THREE.BufferGeometry();
  suspGeo.setAttribute("position", new THREE.Float32BufferAttribute(suspLines, 3));
  const suspMesh = new THREE.LineSegments(
    suspGeo,
    new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.75 })
  );
  group.add(suspMesh);

  // 5. 南北两端重力式锚碇座
  const anchorMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
  const southAnchor = new THREE.Mesh(new THREE.BoxGeometry(56, 36, 60), anchorMat);
  southAnchor.position.set(0, 18, -1280);
  const northAnchor = new THREE.Mesh(new THREE.BoxGeometry(56, 36, 60), anchorMat);
  northAnchor.position.set(0, 18, 1280);
  group.add(southAnchor, northAnchor);

  return group;
}

