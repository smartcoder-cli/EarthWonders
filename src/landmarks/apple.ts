import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";

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

export function createApplePark(_kit: SurfaceKit): THREE.Group {
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


  // 1. 主环形飞船外圈与内圈玻璃立面
  const outerCylGeo = new THREE.CylinderGeometry(OUTER_R, OUTER_R, BUILDING_H, 128, 1, true);
  const outerWall = new THREE.Mesh(outerCylGeo, wallMatDay);
  outerWall.position.y = BUILDING_H / 2;
  outerWall.userData.isWall = true;
  outerWall.userData.keepUv = true;
  group.add(outerWall);

  const innerCylGeo = new THREE.CylinderGeometry(INNER_R, INNER_R, BUILDING_H, 128, 1, true);
  const innerWall = new THREE.Mesh(innerCylGeo, wallMatDay);
  innerWall.position.y = BUILDING_H / 2;
  innerWall.userData.isWall = true;
  innerWall.userData.keepUv = true;
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
  roof.userData.keepUv = true;
  group.add(roof);

  // 4. 乔布斯剧院丘陵植被材质（移除与地球贴合的 0 厚度庭院薄膜，保留真实卫星庭院步道与水池）
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b35,
    roughness: 0.92,
    metalness: 0.02,
  });

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
    tree.position.set(tx, 0, tz);
    group.add(tree);
  }

  // 6. 史蒂夫·乔布斯剧院 (实景位于主环东南方向：Tellux heading=0 下 -X 为东，-Z 为南)
  const theaterGroup = new THREE.Group();
  theaterGroup.position.set(-106, 0, -377);

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

  // 无柱大堂：仅设通往下沉礼堂的地面石材楼梯矮护栏（高 1.0m，屋顶全无中柱支撑）
  const stairRingGeo = new THREE.CylinderGeometry(6.5, 6.5, 1.0, 24, 1, true);
  const stairRingMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const stairRing = new THREE.Mesh(stairRingGeo, stairRingMat);
  stairRing.position.y = 3.8 + 0.5;
  theaterGroup.add(stairRing);

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
