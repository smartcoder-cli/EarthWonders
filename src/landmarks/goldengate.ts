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

