import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";

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

export function createBurjKhalifa(_kit: SurfaceKit): THREE.Group {
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

  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0xb5aba0,
    roughness: 0.85,
  });

  // 1. Plaza Podium (直接与真实哈利法塔人工湖地形衔接，避免大半径平面水面闪烁)
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
      // 严密契合沙漠之花灵感的 26 级顺时针螺旋退台收分，保留经典纤细阶梯轮廓
      const setbackStep = Math.floor((t * 3 + w) / 2);
      const wingLen =
        setbackStep <= 11
          ? 76 - setbackStep * 5.2
          : Math.max(18.8 - (setbackStep - 11) * 0.9, 6.5);
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

  // 3. Spire & Pinnacle (核心筒 593m 接续至精确 828m 塔尖)
  const spireLower = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 13.5, 107, 6), spireMat);
  spireLower.position.y = 593 + 107 / 2;
  spireLower.castShadow = true;
  group.add(spireLower);

  const pinnacle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 5.5, 128, 8), spireMat);
  pinnacle.position.y = 700 + 128 / 2;
  pinnacle.castShadow = true;
  group.add(pinnacle);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
  beacon.position.set(0, 829, 0);
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

