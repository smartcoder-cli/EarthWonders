import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  cyl,
} from "./_shared";

/**
 * 圣家堂彩绘玻璃程序纹理 (Stained Glass Windows)
 * 东侧诞生立面清晨：深蓝、天青、翡翠绿、青金石蓝 (Dawn cool tones)
 * 西侧受难立面落日：琥珀金、橘红、深绯红、暖黄 (Sunset warm tones)
 */
function makeSagradaStainedGlassTexture(isEastDawn: boolean): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#161616";
  ctx.fillRect(0, 0, size, size);

  const coldColors = ["#0284c7", "#06b6d4", "#0d9488", "#10b981", "#3b82f6", "#6366f1", "#0369a1"];
  const warmColors = ["#ea580c", "#f97316", "#eab308", "#ef4444", "#b91c1c", "#f59e0b", "#d97706"];
  const palette = isEastDawn ? coldColors : warmColors;

  const cols = 8;
  const rows = 12;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = palette[(c * 3 + r * 7) % palette.length];
      ctx.fillRect(c * cellW + 3, r * cellH + 3, cellW - 6, cellH - 6);
    }
  }

  // 仿高迪玫瑰花窗多曲率铅条分割线
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, size);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(size, r * cellH);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * 高迪标志性威尼斯碎瓷马赛克拼贴纹理 (Trencadís Mosaic Texture)
 * 产生多边形碎瓷拼嵌与白灰泥填缝的高光釉面质感
 */
function makeTrencadisTexture(primaryColor: string, accentColors: string[]): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, 0, size, size);

  const allColors = [primaryColor, ...accentColors];
  const grid = 16;
  const step = size / grid;

  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const px = gx * step + (Math.random() * 4 - 2);
      const py = gy * step + (Math.random() * 4 - 2);
      const color = allColors[Math.floor(Math.random() * allColors.length)];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 2);
      ctx.lineTo(px + step - 2 + (Math.random() * 2), py + 3);
      ctx.lineTo(px + step - 2, py + step - 2 + (Math.random() * 2));
      ctx.lineTo(px + 3, py + step - 2);
      ctx.closePath();
      ctx.fill();

      // 瓷面高光釉点
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fillRect(px + 4, py + 4, step * 0.35, 2.5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createSagradaFamilia(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "sagrada";

  // ==========================================
  // 1. 材质与着色器系统 (Materials System)
  // ==========================================
  // A. 加泰罗尼亚蒙特惠奇砂岩 (Montjuïc Sandstone)
  const stoneDay = stone(0xc8a87d, 0.85, 0.05); // 主色暖金黄砂岩
  const stoneNight = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.65,
    metalness: 0.1,
    emissive: 0x92400e,
    emissiveIntensity: 0.5,
  });

  const stoneTraceries = stone(0xb08d62, 0.88, 0.05); // 雕饰与窗棂石料
  const stoneDark = stone(0x785e3e, 0.92, 0.02); // 暗部基座与阴影石料
  const granitePillarMat = stone(0x57534e, 0.72, 0.08); // 内部双扭线花岗岩大立柱

  // B. 威尼斯碎瓷马赛克 (Trencadís Mosaics) 陶瓷材质
  const texTrencadisGold = makeTrencadisTexture("#f59e0b", ["#fbbf24", "#d97706", "#ffffff", "#ef4444"]);
  const texTrencadisRed = makeTrencadisTexture("#dc2626", ["#f97316", "#ef4444", "#fbbf24", "#ffffff"]);
  const texTrencadisBlue = makeTrencadisTexture("#2563eb", ["#38bdf8", "#1d4ed8", "#ffffff", "#10b981"]);

  const mosaicGold = new THREE.MeshStandardMaterial({
    map: texTrencadisGold,
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.5,
  });
  const mosaicRed = new THREE.MeshStandardMaterial({
    map: texTrencadisRed,
    color: 0xffffff,
    roughness: 0.24,
    metalness: 0.45,
  });
  const mosaicBlue = new THREE.MeshStandardMaterial({
    map: texTrencadisBlue,
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.52,
  });
  const mosaicGreen = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.3,
    metalness: 0.35,
  });

  // C. 基督四臂大十字架与四福音雕像纯白卡拉拉大理石 (Carrara Pure White Marble)
  const crossWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.25,
    emissive: 0xffffff,
    emissiveIntensity: 0.5,
  });

  // D. 圣母玛利亚之塔顶 Stella Matutina 十二芒星水晶 (Luminous Crystal Star)
  const starCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.08,
    metalness: 0.2,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.4,
  });

  // E. 彩绘玻璃材质（东西双向冷暖色调）
  const texEast = makeSagradaStainedGlassTexture(true);
  const texWest = makeSagradaStainedGlassTexture(false);
  const glassEastDay = new THREE.MeshStandardMaterial({
    map: texEast,
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  const glassEastNight = new THREE.MeshStandardMaterial({
    map: texEast,
    color: 0xffffff,
    emissiveMap: texEast,
    emissive: 0xffffff,
    emissiveIntensity: 2.2,
  });
  const glassWestDay = new THREE.MeshStandardMaterial({
    map: texWest,
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  const glassWestNight = new THREE.MeshStandardMaterial({
    map: texWest,
    color: 0xffffff,
    emissiveMap: texWest,
    emissive: 0xffffff,
    emissiveIntensity: 2.2,
  });

  const stoneMeshes: THREE.Mesh[] = [];
  const glassEastMeshes: THREE.Mesh[] = [];
  const glassWestMeshes: THREE.Mesh[] = [];

  function addStone(mesh: THREE.Mesh) {
    root.add(mesh);
    stoneMeshes.push(mesh);
    return mesh;
  }

  // ==========================================
  // 2. 基座台阶与礼仪地坪 (Plinth, y = 0 ~ 4.0m)
  // ==========================================
  // 拉丁十字平面基座：长轴 Z = -45m ~ +45m (90m), 横轴 X = -35m ~ +35m (70m)
  const basePlinth = box(root, stoneDark, 72, 4.0, 94, 0, 0, 0);
  basePlinth.userData.skipLines = true;
  stoneMeshes.push(basePlinth);

  // 四周连续的基底护栏与多边形角柱
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const isX = (rotY === 0 || rotY === Math.PI);
    const rail = box(
      root,
      stoneTraceries,
      isX ? 70 : 1.6,
      1.4,
      isX ? 1.6 : 92,
      0,
      4.0,
      rotY === 0 ? 46.5 : rotY === Math.PI ? -46.5 : 0
    );
    if (!isX) rail.position.set(rotY > 0 ? 35.5 : -35.5, 4.0, 0);
    stoneMeshes.push(rail);
  }

  // ==========================================
  // 3. 巴西利卡中殿、侧廊与飞扶壁群 (Nave, Aisles & Buttresses)
  // 真实几何：主中殿沿 Z 轴延伸 (Z = -20m ~ +42m, 宽 X = -15m ~ +15m)
  // 耳堂沿 X 轴延伸 (X = -30m ~ +30m, 进深 Z = -13m ~ +13m)
  // ==========================================
  // A. 南侧主中殿 (Main South Nave, Z = 13m ~ 42m, y = 4 ~ 45m, 宽 22m)
  const naveBody = box(root, stoneDay, 22, 38, 29, 0, 4, 27.5);
  stoneMeshes.push(naveBody);

  const naveRoof = box(root, stoneDark, 23.5, 2.2, 30, 0, 42.5, 27.5);
  stoneMeshes.push(naveRoof);

  // 中殿正脊连续的金色十字与多面体瓷釉山花饰
  for (let z = 14; z <= 41; z += 4.5) {
    box(root, mosaicGold, 0.7, 2.4, 0.7, 0, 44.7, z);
    box(root, mosaicGold, 1.6, 0.6, 0.6, 0, 45.5, z);
  }

  // B. 主中殿外侧低侧廊 (South Nave Low Aisles, 宽 6m, 高 24m)
  const naveAisleEast = box(root, stoneDay, 6.0, 22, 28, 14, 4, 27.5);
  const naveAisleWest = box(root, stoneDay, 6.0, 22, 28, -14, 4, 27.5);
  stoneMeshes.push(naveAisleEast, naveAisleWest);

  // 侧廊坡屋顶
  for (const sign of [-1, 1]) {
    const roofShed = box(root, stoneDark, 6.5, 1.6, 28.5, sign * 14, 26, 27.5);
    roofShed.rotation.z = sign * 0.18;
    stoneMeshes.push(roofShed);
  }

  // 侧廊外侧壁柱与顶端立体高迪碎瓷水果花篮尖塔 (Fruit Basket Pinnacles)
  for (let z = 15; z <= 40; z += 8.2) {
    for (const sign of [-1, 1]) {
      const pier = box(root, stoneTraceries, 1.8, 26, 1.8, sign * 17.5, 4, z);
      stoneMeshes.push(pier);

      const pinShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 6.5, 8), stoneTraceries);
      pinShaft.position.set(sign * 17.5, 30 + 3.25, z);
      addStone(pinShaft);

      const fruitMat = (Math.abs(z) % 16 < 8) ? mosaicRed : (sign > 0 ? mosaicGold : mosaicGreen);
      const fruitBasket = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), fruitMat);
      fruitBasket.position.set(sign * 17.5, 37.5, z);
      root.add(fruitBasket);

      for (const dth of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), (fruitMat === mosaicRed ? mosaicGold : mosaicRed));
        berry.position.set(sign * 17.5 + Math.sin(dth) * 0.65, 38.6, z + Math.cos(dth) * 0.65);
        root.add(berry);
      }

      // 飞扶壁弧形拱券连结至主中殿高墙
      const archLen = Math.hypot(6.5, 8.5);
      const archAng = Math.atan2(8.5, 6.5);
      const arch = new THREE.Mesh(new THREE.BoxGeometry(archLen, 0.7, 0.9), stoneTraceries);
      arch.position.set(sign * 14.5, 33, z);
      arch.rotation.z = sign * archAng;
      addStone(arch);
    }
  }

  // C. 耳堂主体横翼 (Transept Crossing Body, 宽跨 60m: X = -30m ~ +30m, 进深 26m: Z = -13m ~ +13m)
  const transeptBody = box(root, stoneDay, 58, 38, 26, 0, 4, 0);
  stoneMeshes.push(transeptBody);

  const transeptRoof = box(root, stoneDark, 60, 2.2, 27.5, 0, 42.5, 0);
  stoneMeshes.push(transeptRoof);

  // 耳堂正脊连续十字花饰
  for (let x = -26; x <= 26; x += 5.2) {
    box(root, mosaicGold, 0.7, 2.4, 0.7, x, 44.7, 0);
    box(root, mosaicGold, 1.6, 0.6, 0.6, x, 45.5, 0);
  }

  // D. 北侧半圆后殿与放射状礼拜堂群 (Apse & Radiating Chapels, Z = -13m ~ -42m)
  const apseHall = box(root, stoneDay, 22, 38, 16, 0, 4, -21);
  stoneMeshes.push(apseHall);

  for (let a = 0; a <= 6; a++) {
    const angle = (a / 6) * Math.PI - Math.PI;
    const rad = 17;
    const cx = Math.sin(angle) * rad;
    const cz = -20 + Math.cos(angle) * rad;
    const chapel = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.4, 24, 8), stoneDay);
    chapel.position.set(cx, 4 + 12, cz);
    addStone(chapel);

    const chapelSpire = new THREE.Mesh(new THREE.ConeGeometry(3.8, 7.5, 8), stoneTraceries);
    chapelSpire.position.set(cx, 28 + 3.75, cz);
    addStone(chapelSpire);

    const gargoyle = box(root, stoneDark, 0.6, 0.6, 2.2, cx * 1.12, 28.5, cz * 1.12);
    stoneMeshes.push(gargoyle);
  }

  // E. 大采光高侧窗彩绘玻璃 (Stained Glass Lancets)
  // 东侧诞生向（清晨冷色彩绘玻璃，X = +11.2m & +17.2m）
  for (let z = 15; z <= 39; z += 8) {
    const winLower = new THREE.Mesh(new THREE.BoxGeometry(0.4, 13, 5.0), glassEastDay);
    winLower.position.set(17.2, 16, z);
    winLower.userData.keepUv = true;
    root.add(winLower);
    glassEastMeshes.push(winLower);

    const winUpper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 14, 4.8), glassEastDay);
    winUpper.position.set(11.2, 32, z);
    winUpper.userData.keepUv = true;
    root.add(winUpper);
    glassEastMeshes.push(winUpper);
  }
  // 西侧受难向（日落暖色琥珀彩绘玻璃，X = -11.2m & -17.2m）
  for (let z = 15; z <= 39; z += 8) {
    const winLower = new THREE.Mesh(new THREE.BoxGeometry(0.4, 13, 5.0), glassWestDay);
    winLower.position.set(-17.2, 16, z);
    winLower.userData.keepUv = true;
    root.add(winLower);
    glassWestMeshes.push(winLower);

    const winUpper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 14, 4.8), glassWestDay);
    winUpper.position.set(-11.2, 32, z);
    winUpper.userData.keepUv = true;
    root.add(winUpper);
    glassWestMeshes.push(winUpper);
  }

  // ==========================================
  // 4. 东侧诞生立面与生命之树 (Nativity Façade & Tree of Life, X = +28m ~ +36m)
  // ==========================================
  // A. 三重深邃钟乳石溶洞折线门洞 (Portals of Faith, Hope & Charity)
  // 信仰之门 (Portal of Faith, Z = +11.5m)
  const portFaith = box(root, stoneDay, 5.5, 17, 9.5, 29.5, 4, 11.5);
  const archFaith = new THREE.Mesh(new THREE.ConeGeometry(5.0, 11, 4), stoneTraceries);
  archFaith.position.set(29.5, 21 + 5.5, 11.5);
  archFaith.rotation.y = Math.PI / 4;
  addStone(portFaith);
  addStone(archFaith);

  // 希望之门 (Portal of Hope, Z = -11.5m)
  const portHope = box(root, stoneDay, 5.5, 17, 9.5, 29.5, 4, -11.5);
  const archHope = new THREE.Mesh(new THREE.ConeGeometry(5.0, 11, 4), stoneTraceries);
  archHope.position.set(29.5, 21 + 5.5, -11.5);
  archHope.rotation.y = Math.PI / 4;
  addStone(portHope);
  addStone(archHope);

  // 博爱之门 (Portal of Charity, 中央最宏伟门洞, Z = 0)
  const portCharity = box(root, stoneDay, 7.5, 24, 13.5, 30.5, 4, 0);
  const archCharity = new THREE.Mesh(new THREE.ConeGeometry(7.0, 15, 4), stoneTraceries);
  archCharity.position.set(30.5, 28 + 7.5, 0);
  archCharity.rotation.y = Math.PI / 4;
  addStone(portCharity);
  addStone(archCharity);

  // 中央柱身所罗门双扭线壁龛雕塑 (Trumeau & Statuary Niche)
  cyl(root, stoneTraceries, 0.8, 1.0, 15, 34.2, 4, 0, 8);
  const nicheGroup = box(root, stoneTraceries, 1.8, 4.5, 2.5, 34.0, 13.5, 0);
  stoneMeshes.push(nicheGroup);

  // 门楣繁复的加泰罗尼亚钟乳石与藤蔓石雕瀑布 (Stalactite & Foliage Carvings)
  for (let z = -17; z <= 17; z += 2.8) {
    const stal = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.8, 6), stoneTraceries);
    stal.position.set(32.8, 22.5, z);
    stal.rotation.x = Math.PI;
    addStone(stal);
  }

  // B. 诞生立面灵魂锚点：生命之树与白鸽群 (The Tree of Life / El Árbol de la Vida)
  // 紧贴爱德之门拱脊上方拔起 (X = 31.5m, y = 35m ~ 64m)
  const treeLevels = [
    { y: 35, rBottom: 4.4, rTop: 3.2, h: 6.5 },
    { y: 41.5, rBottom: 3.2, rTop: 2.0, h: 6.5 },
    { y: 48, rBottom: 2.0, rTop: 0.9, h: 6.5 },
    { y: 54.5, rBottom: 0.9, rTop: 0.1, h: 4.5 },
  ];
  const treeMat = stone(0x156534, 0.88, 0.05);

  for (const lvl of treeLevels) {
    const treeMesh = new THREE.Mesh(new THREE.CylinderGeometry(lvl.rTop, lvl.rBottom, lvl.h, 10), treeMat);
    treeMesh.position.set(32.5, lvl.y + lvl.h / 2, 0);
    root.add(treeMesh);
  }

  // 树身环绕飞掠的纯白和平鸽群
  for (let d = 0; d < 14; d++) {
    const dy = 38 + (d / 14) * 18;
    const dang = (d * 1.55);
    const drad = 2.2 - (d / 14) * 1.4;
    const dove = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), crossWhiteMat);
    dove.position.set(32.5 + Math.sin(dang) * drad, dy, Math.cos(dang) * drad);
    root.add(dove);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.8), crossWhiteMat);
    wing.position.set(dove.position.x, dove.position.y + 0.15, dove.position.z);
    wing.rotation.y = dang;
    root.add(wing);
  }

  // 柏树顶端加泰罗尼亚金色 Tau 十字与纯白信鸽圣球 (y = 60 ~ 64m)
  box(root, mosaicGold, 1.0, 4.0, 0.5, 32.5, 59.5, 0);
  box(root, mosaicGold, 3.0, 0.8, 0.5, 32.5, 61.0, 0);
  const topPelican = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), crossWhiteMat);
  topPelican.position.set(32.5, 63.8, 0);
  root.add(topPelican);

  // ==========================================
  // 5. 西侧受难立面骨状倾斜柱廊 (Passion Façade Skeletal Portico, X = -28m ~ -36m)
  // ==========================================
  // A. 6 根向外倾斜的巨大骨骼仿生立柱 (Six Leaning Bone Columns)
  for (const z of [-16, -9.6, -3.2, 3.2, 9.6, 16]) {
    const colGroup = new THREE.Group();
    colGroup.position.set(-30, 4, z);
    colGroup.rotation.z = 0.18; // 强烈的前倾支撑张力

    const lowerBone = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.35, 13, 10), stoneTraceries);
    lowerBone.position.y = 6.5;
    colGroup.add(lowerBone);
    stoneMeshes.push(lowerBone);

    const jointRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.35, 8, 16), stoneDark);
    jointRing.rotation.x = Math.PI / 2;
    jointRing.position.y = 13;
    colGroup.add(jointRing);
    stoneMeshes.push(jointRing);

    const upperBone = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.95, 11, 10), stoneTraceries);
    upperBone.position.y = 18.5;
    colGroup.add(upperBone);
    stoneMeshes.push(upperBone);

    root.add(colGroup);
  }

  // B. 18 根倾斜肋骨金字塔山花 (Cryptoporticus Bone-Ribbed Pediment)
  const passionPediment = box(root, stoneDay, 7.5, 4.0, 40, -31.5, 27, 0);
  stoneMeshes.push(passionPediment);

  for (let z = -18; z <= 18; z += 2.2) {
    const ribLen = Math.hypot(7.0, 15.0);
    const ribAng = Math.atan2(15.0, 7.0);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, ribLen), stoneDark);
    rib.position.set(-29.5, 34.5, z);
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = -ribAng;
    addStone(rib);
  }

  // 受难立面上方青铜荆棘冠与受难十字 (Crown of Thorns & Subirachs Cross)
  const thornRing = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.4, 8, 24), stone(0x78350f, 0.6, 0.4));
  thornRing.position.set(-33.5, 35, 0);
  root.add(thornRing);

  // ==========================================
  // 6. 诞生与受难立面八座双曲蜂巢钟楼 (Eight Apostles Hyperboloid Bell Towers)
  // ==========================================
  // 诞生立面 (东侧 X = +28m)；受难立面 (西侧 X = -28m)
  const facadePositions = [
    { x: 28, isNativity: true },
    { x: -28, isNativity: false },
  ];

  for (const fp of facadePositions) {
    const towersData = [
      { z: -17.5, hShaft: 50, topY: 104, hasMitreRed: true },
      { z: -5.8,  hShaft: 56, topY: 110, hasMitreRed: false },
      { z: 5.8,   hShaft: 56, topY: 110, hasMitreRed: false },
      { z: 17.5,  hShaft: 50, topY: 104, hasMitreRed: true },
    ];

    for (let i = 0; i < towersData.length; i++) {
      const td = towersData[i];
      const towerGroup = new THREE.Group();
      towerGroup.position.set(fp.x, 0, td.z);

      // A. 八角形过渡过渡基座 (Transition Pedestal, y = 35 ~ 50m)
      const basePed = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.6, 15, 8), stoneDay);
      basePed.position.y = 35 + 7.5;
      towerGroup.add(basePed);
      stoneMeshes.push(basePed);

      for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const arch = box(towerGroup, stoneDark, 1.8, 7.5, 0.4, 0, 42, 3.8);
        arch.rotation.y = rotY;
        stoneMeshes.push(arch);
      }

      // B. 高迪最具代表性的双曲收分蜂巢镂空钟楼柱身 (Hyperboloid Fluted Shaft with Louvres)
      const seg1H = td.hShaft * 0.4;
      const seg2H = td.hShaft * 0.35;
      const seg3H = td.hShaft * 0.25;

      const shaft1 = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, seg1H, 12), stoneDay);
      shaft1.position.y = 50 + seg1H / 2;
      towerGroup.add(shaft1);
      stoneMeshes.push(shaft1);

      const shaft2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, seg2H, 12), stoneDay);
      shaft2.position.y = 50 + seg1H + seg2H / 2;
      towerGroup.add(shaft2);
      stoneMeshes.push(shaft2);

      const shaft3 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, seg3H, 12), stoneDay);
      shaft3.position.y = 50 + seg1H + seg2H + seg3H / 2;
      towerGroup.add(shaft3);
      stoneMeshes.push(shaft3);

      // 竖向 8 根贯穿全塔的结构加劲石肋 (Vertical Hyperbolic Ribs)
      for (let r = 0; r < 8; r++) {
        const ang = (r / 8) * Math.PI * 2;
        const rib = box(
          towerGroup,
          stoneTraceries,
          0.45,
          td.hShaft,
          0.65,
          Math.sin(ang) * 3.2,
          50,
          Math.cos(ang) * 3.2
        );
        rib.rotation.y = ang;
        stoneMeshes.push(rib);
      }

      // 沿高度螺旋交错排列的真实石制声音百叶窗槽 (Acoustic Louvres/Lamellae Slots)
      const numSlots = 10;
      for (let lvl = 0; lvl < numSlots; lvl++) {
        const ly = 52 + (lvl / numSlots) * (td.hShaft - 4);
        const lradius = 3.5 - (lvl / numSlots) * 1.1;
        const lang = lvl * 0.85;

        const slot = box(towerGroup, stoneDark, 1.7, 2.7, 0.45, Math.sin(lang) * lradius, ly, Math.cos(lang) * lradius);
        slot.rotation.y = lang;
        stoneMeshes.push(slot);

        const slat = box(towerGroup, stoneTraceries, 1.9, 0.35, 0.75, Math.sin(lang) * (lradius + 0.25), ly + 0.8, Math.cos(lang) * (lradius + 0.25));
        slat.rotation.y = lang;
        slat.rotation.x = 0.35;
        stoneMeshes.push(slat);
      }

      // C. 钟楼顶部开放式立柱观景灯阁 (Openwork Lantern Gallery)
      const lanternY = 50 + td.hShaft;
      const lanternBase = box(towerGroup, stoneTraceries, 5.2, 1.3, 5.2, 0, lanternY, 0);
      stoneMeshes.push(lanternBase);

      for (let c = 0; c < 8; c++) {
        const cang = (c / 8) * Math.PI * 2;
        const col = cyl(towerGroup, stoneTraceries, 0.32, 0.32, 6.5, Math.sin(cang) * 2.1, lanternY + 1.3, Math.cos(cang) * 2.1, 6);
        stoneMeshes.push(col);
      }

      // D. 威尼斯彩色碎瓷马赛克立体几何塔尖石冠 (Trencadís Mosaic Pináculos)
      const pinY = lanternY + 7.8;

      // 1. 八角形收分多面体主教冠柱台 (Mitre Lantern Shaft)
      const mitreMat = td.hasMitreRed ? mosaicRed : mosaicGold;
      const mitreShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.4, 6.2, 8), mitreMat);
      mitreShaft.position.y = pinY + 3.1;
      towerGroup.add(mitreShaft);

      // 2. 几何多面体碎瓷拼贴金冠 (Polyhedral Mosaic Corona)
      const coronaMat = td.hasMitreRed ? mosaicGold : mosaicBlue;
      const corona = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 1), coronaMat);
      corona.position.y = pinY + 7.2;
      towerGroup.add(corona);

      // 3. 圣餐金球风向仪与彩色釉面圣果 (Eucharistic Orb & Finial)
      const orbMat = td.hasMitreRed ? mosaicRed : mosaicGold;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), orbMat);
      orb.position.y = pinY + 10.0;
      towerGroup.add(orb);

      // 4. 塔冠顶端立体纯白卡拉拉大理石四臂十字架与圣麦穗 (Four-Armed Cross & Wheat Finials)
      const crossBaseY = pinY + 11.5;
      box(towerGroup, crossWhiteMat, 3.0, 0.6, 0.6, 0, crossBaseY + 1.8, 0);
      box(towerGroup, crossWhiteMat, 0.6, 4.0, 0.6, 0, crossBaseY, 0);
      box(towerGroup, crossWhiteMat, 0.6, 0.6, 3.0, 0, crossBaseY + 1.8, 0);

      root.add(towerGroup);
    }

    // 双塔之间悬空人行天桥 (Transverse Skybridges connecting twin spires, y = 68m & y = 85m)
    for (const by of [68, 85]) {
      const bridgeInner = box(root, stoneTraceries, 2.0, 2.4, 11.6, fp.x, by, 0);
      box(root, mosaicGold, 1.4, 0.8, 11.6, fp.x, by + 1.6, 0);
      stoneMeshes.push(bridgeInner);

      const bridgeNorth = box(root, stoneTraceries, 2.0, 2.2, 11.7, fp.x, by - 4, -11.6);
      const bridgeSouth = box(root, stoneTraceries, 2.0, 2.2, 11.7, fp.x, by - 4, 11.6);
      stoneMeshes.push(bridgeNorth, bridgeSouth);
    }
  }

  // ==========================================
  // 7. 中央六座核心天际圣塔 (Central Spires: Christ, Mary & 4 Evangelists)
  // ==========================================
  // A. 中央耶稣基督之塔 (Tower of Jesus Christ, 全殿最高核心, 规划总高 172.5m)
  const christBaseY = 44;
  const christTopY = 154;
  const christH = christTopY - christBaseY; // 110m

  // 12 边形双曲双扭线收分主塔柱 (12-Sided Hyperbolic Main Shaft)
  const christTower = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 11.5, christH, 12), stoneDay);
  christTower.position.set(0, christBaseY + christH / 2, 0);
  addStone(christTower);

  // 基督塔 8 层环向细长采光石窗与加劲飞肋 (8 Tiers of Lancet Slits & Hyperbolic Ribs)
  for (let lvl = 0; lvl < 8; lvl++) {
    const ly = christBaseY + 8 + lvl * 12.5;
    const w = 11.5 - (lvl / 8) * 5.9;
    for (let r = 0; r < 4; r++) {
      const rang = (r / 4) * Math.PI * 2;
      const winSlot = box(root, stoneDark, 1.3, 7.5, 0.5, Math.sin(rang) * (w + 0.2), ly, Math.cos(rang) * (w + 0.2));
      winSlot.rotation.y = rang;
      stoneMeshes.push(winSlot);
    }
    box(root, mosaicGold, w * 2 + 1.2, 0.8, w * 2 + 1.2, 0, ly + 4.5, 0);
  }

  // 基督塔观景石廊阁楼 (Upper Lantern Gallery, y = 154m ~ 163m)
  const christLantern = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.6, 9.0, 12), stoneTraceries);
  christLantern.position.set(0, 158.5, 0);
  addStone(christLantern);

  // 基督塔顶 17.5 米纯白卡拉拉大理石立体四臂十字架 (Monumental 17.5m Cross of Four Arms)
  // 底部严丝合缝扎在 y = 163m 的观景阁楼顶面上！
  const crossGroup = new THREE.Group();
  crossGroup.position.set(0, 163, 0);

  // 垂直立柱十字臂 (底面 y=0, 顶面 y=17.5, 中心 y=8.75)
  box(crossGroup, crossWhiteMat, 2.6, 17.5, 2.6, 0, 0, 0);

  // 水平十字臂中心高度在 y = 11.0m (底面 y = 11.0 - 1.3 = 9.7m)
  box(crossGroup, crossWhiteMat, 12.0, 2.6, 2.6, 0, 9.7, 0);
  box(crossGroup, crossWhiteMat, 2.6, 2.6, 12.0, 0, 9.7, 0);

  // 四臂十字架端头的钟形立体扩口构件 (中心全部对齐 y = 11.0m)
  for (const dx of [-6.0, 6.0]) {
    const bellCap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.4, 8), crossWhiteMat);
    bellCap.position.set(dx, 11.0, 0);
    bellCap.rotation.z = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
    crossGroup.add(bellCap);
  }
  for (const dz of [-6.0, 6.0]) {
    const bellCap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.4, 8), crossWhiteMat);
    bellCap.position.set(0, 11.0, dz);
    bellCap.rotation.x = dz > 0 ? Math.PI / 2 : -Math.PI / 2;
    crossGroup.add(bellCap);
  }

  // 十字核心发光圣心金环 (Golden Heart Aura, 对齐 y = 11.0m)
  const crossAura = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.5, 8, 24), mosaicGold);
  crossAura.position.set(0, 11.0, 0);
  crossGroup.add(crossAura);

  root.add(crossGroup);

  // B. 圣母玛利亚之塔 (Tower of the Virgin Mary, 138m, 位于半圆后殿 X = 0, Z = -20m)
  const maryBaseY = 44;
  const maryH = 84; // y = 44 ~ 128m
  const maryTower = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 7.5, maryH, 10), stoneDay);
  maryTower.position.set(0, maryBaseY + maryH / 2, -20);
  addStone(maryTower);

  // 圣母塔双曲镂空石冠 (Hyperbolic Openwork Crown, y = 128m ~ 134m)
  const maryCrown = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 3.8, 6.0, 10), stoneTraceries);
  maryCrown.position.set(0, 131, -20);
  addStone(maryCrown);

  // 圣母塔顶举世闻名的 Stella Matutina 十二芒星水晶 (12-Pointed Luminous Star of the Morning)
  const maryStarCore = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), starCrystalMat);
  maryStarCore.position.set(0, 137.5, -20);
  root.add(maryStarCore);

  // 12 根放射状星芒凸棱水晶椎体 (12-Pointed Stellar Crystal Prisms)
  for (let s = 0; s < 12; s++) {
    const phi = Math.acos(-1 + (2 * s) / 12);
    const theta = Math.sqrt(12 * Math.PI) * phi;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.0, 6), starCrystalMat);
    const rx = Math.sin(phi) * Math.cos(theta);
    const ry = Math.cos(phi);
    const rz = Math.sin(phi) * Math.sin(theta);
    ray.position.set(rx * 2.6, 137.5 + ry * 2.6, -20 + rz * 2.6);
    ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(rx, ry, rz));
    root.add(ray);
  }

  // C. 四福音传教士之塔 (Four Evangelists Towers, 135m, 环绕基督塔四周)
  const evangelists = [
    { x: -10.5, z: -10.5, name: "Luke / Ox (路加/公牛)", symbolMat: crossWhiteMat },
    { x: 10.5,  z: -10.5, name: "Mark / Lion (马可/雄狮)", symbolMat: crossWhiteMat },
    { x: 10.5,  z: 10.5,  name: "John / Eagle (约翰/飞鹰)", symbolMat: crossWhiteMat },
    { x: -10.5, z: 10.5,  name: "Matthew / Angel (马太/天使)", symbolMat: crossWhiteMat },
  ];

  for (const ev of evangelists) {
    const evH = 82; // y = 44 ~ 126m
    const evTower = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.8, evH, 8), stoneDay);
    evTower.position.set(ev.x, 44 + evH / 2, ev.z);
    addStone(evTower);

    // 塔顶福音书石台与四活物象征雕像 (Tetramorph Sculptures & Marble Books, y = 126m ~ 135m)
    const bookPed = box(root, stoneTraceries, 3.6, 2.2, 3.6, ev.x, 126.5, ev.z);
    stoneMeshes.push(bookPed);

    const tetraStatue = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), ev.symbolMat);
    tetraStatue.position.set(ev.x, 130.5, ev.z);
    root.add(tetraStatue);

    // 展翅纯白双翼与福音巨卷 (Sculpted Wings & Open Gospel)
    box(root, crossWhiteMat, 0.45, 2.4, 2.2, ev.x, 132.5, ev.z);
    box(root, crossWhiteMat, 3.2, 0.4, 1.8, ev.x, 131.5, ev.z);
  }

  // ==========================================
  // 8. 圣殿内部仿生树状分叉双扭线石柱森林 (Arborescent Tree Columns inside Nave)
  // ==========================================
  for (let z = 16; z <= 36; z += 10) {
    for (const x of [-6, 6]) {
      const trunk = cyl(root, granitePillarMat, 0.85, 1.25, 22, x, 4, z, 8);
      stoneMeshes.push(trunk);

      for (const rotX of [-0.32, 0.32]) {
        for (const rotZ of [-0.32, 0.32]) {
          const bough = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.7, 9, 6), granitePillarMat);
          bough.position.set(x + rotZ * 4.5, 26 + 3.5, z + rotX * 4.5);
          bough.rotation.x = rotX;
          bough.rotation.z = rotZ;
          addStone(bough);
        }
      }
    }
  }

  // ==========================================
  // 9. 夜间多光谱多角度泛光照明系统 (Night Multi-Spectrum Lighting System)
  // ==========================================
  const spotNativity = new THREE.PointLight(0xf59e0b, 0, 95, 1.8);
  spotNativity.position.set(50, 30, 0);
  root.add(spotNativity);

  const spotPassion = new THREE.PointLight(0xf59e0b, 0, 95, 1.8);
  spotPassion.position.set(-50, 30, 0);
  root.add(spotPassion);

  const spotChristCross = new THREE.PointLight(0xffffff, 0, 70, 1.5);
  spotChristCross.position.set(0, 172, 0);
  root.add(spotChristCross);

  const spotMaryStar = new THREE.PointLight(0x38bdf8, 0, 60, 2.0);
  spotMaryStar.position.set(0, 138, -20);
  root.add(spotMaryStar);

  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    for (const sm of stoneMeshes) {
      sm.material = night ? stoneNight : stoneDay;
    }
    for (const gm of glassEastMeshes) {
      gm.material = night ? glassEastNight : glassEastDay;
    }
    for (const gm of glassWestMeshes) {
      gm.material = night ? glassWestNight : glassWestDay;
    }
    spotNativity.intensity = night ? 3.8 : 0;
    spotPassion.intensity = night ? 3.8 : 0;
    spotChristCross.intensity = night ? 3.2 : 0;
    spotMaryStar.intensity = night ? 2.8 : 0;
  };

  return root;
}
