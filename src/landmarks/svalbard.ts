import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";

function makeSvalbardConcreteTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  // 极地北欧清水混凝土基底色 (Cool Nordic Exposed Architectural Concrete)
  g.fillStyle = "#cbd5e1";
  g.fillRect(0, 0, w, h);

  // 细微水泥骨料杂色颗粒
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const alpha = Math.random() * 0.08;
    g.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(30, 41, 59, ${alpha})`;
    g.fillRect(rx, ry, 1.5, 1.5);
  }

  // 8 块主要水平木模板浇筑拼缝 (Horizontal Timber Formwork Lines)
  const rows = 8;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    // 阴影与高光缝线
    g.fillStyle = "rgba(71, 85, 105, 0.45)";
    g.fillRect(0, y, w, 2);
    g.fillStyle = "rgba(255, 255, 255, 0.55)";
    g.fillRect(0, y + 2, w, 1);

    // 对拉螺栓孔位锚印 (Tie-Rod Anchor Indents)
    for (let x = 32; x < w; x += 64) {
      g.beginPath();
      g.arc(x, y + rh / 2, 3.5, 0, Math.PI * 2);
      g.fillStyle = "rgba(51, 65, 85, 0.6)";
      g.fill();
      g.beginPath();
      g.arc(x, y + rh / 2, 1.5, 0, Math.PI * 2);
      g.fillStyle = "rgba(15, 23, 42, 0.85)";
      g.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 3.0);
  return tex;
}

// --- 17. 斯瓦尔巴全球种子库 (Svalbard Seed Vault) 标志性建筑精细化重构 ---
export function createSvalbardSeedVault(_kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "SvalbardSeedVault";

  const concreteTex = makeSvalbardConcreteTexture();

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.88,
    metalness: 0.02,
    emissive: new THREE.Color(0x1e293b),
    emissiveIntensity: 0.35,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.88,
    metalness: 0.08,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    color: 0xc8d1dc,
    roughness: 0.78,
    metalness: 0.12,
    emissive: new THREE.Color(0x1e293b),
    emissiveIntensity: 0.18,
  });

  const prismMatDay = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.12,
    metalness: 0.75,
  });
  const prismMatNight = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: new THREE.Color(0x06b6d4),
    emissiveIntensity: 2.2,
    roughness: 0.12,
    metalness: 0.85,
  });

  // 1. 标志性破雪而出梯形混凝土入口巨石棱柱 (Platåberget Monolithic Wedge Portal)
  // 尺寸：宽 6.8m (X: -3.4 到 +3.4)，进深 36m (Z: -21 到 +15)，前高 15.5m，后高 6.0m
  const portalW = 6.8;
  const halfW = portalW / 2; // 3.4
  const frontZ = 15.0;
  const frontTopZ = 13.8;
  const backZ = -21.0;
  const frontH = 15.5;
  const rearH = 6.0;
  const lengthZ = frontTopZ - backZ; // 34.8
  const slopeAngle = Math.atan2(frontH - rearH, lengthZ); // 倾斜角
  const slopeLen = Math.hypot(lengthZ, frontH - rearH);
  const midY = (frontH + rearH) / 2; // 10.75
  const midZ = (frontTopZ + backZ) / 2; // -3.6

  // 左右两侧主要厚重混凝土剪力侧墙 (Thick Concrete Flank Walls)
  const wallThick = 0.65;
  const flankShape = new THREE.Shape();
  flankShape.moveTo(frontZ, 0);
  flankShape.lineTo(frontTopZ, frontH);
  flankShape.lineTo(backZ, rearH);
  flankShape.lineTo(backZ, 0);
  flankShape.lineTo(frontZ, 0);

  const flankExtrude: THREE.ExtrudeGeometryOptions = {
    depth: wallThick,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 1,
  };
  const leftFlankGeo = new THREE.ExtrudeGeometry(flankShape, flankExtrude);
  leftFlankGeo.rotateY(-Math.PI / 2);
  leftFlankGeo.translate(-halfW + wallThick, 0, 0);
  const leftFlank = new THREE.Mesh(leftFlankGeo, concreteMat);
  group.add(leftFlank);

  const rightFlankGeo = leftFlankGeo.clone();
  rightFlankGeo.translate(portalW - wallThick, 0, 0);
  const rightFlank = new THREE.Mesh(rightFlankGeo, concreteMat);
  group.add(rightFlank);

  // 后部山体穿透封口墙 (Rear Penetration Wall)
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(portalW, rearH, wallThick), concreteMat);
  rearWall.position.set(0, rearH / 2, backZ + wallThick / 2);
  group.add(rearWall);

  // 顶部主要倾斜混凝土结构顶板 (Sloping Concrete Roof Slab)
  const roofSlabGeo = new THREE.BoxGeometry(portalW, 0.45, slopeLen);
  roofSlabGeo.rotateX(-slopeAngle);
  const roofSlab = new THREE.Mesh(roofSlabGeo, concreteMat);
  roofSlab.position.set(0, midY, midZ);
  group.add(roofSlab);

  // 顶边左右保护封边条 (Parapet Trims)
  const trimGeo = new THREE.BoxGeometry(0.25, 0.35, slopeLen);
  trimGeo.rotateX(-slopeAngle);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65, metalness: 0.15 });
  const leftTrim = new THREE.Mesh(trimGeo, trimMat);
  leftTrim.position.set(-halfW + wallThick / 2, midY + 0.28, midZ);
  const rightTrim = new THREE.Mesh(trimGeo, trimMat);
  rightTrim.position.set(halfW - wallThick / 2, midY + 0.28, midZ);
  group.add(leftTrim, rightTrim);

  // 2. 「永久回响」极光反射水晶多面棱镜艺术屋顶 (Dyveke Sanne's Perpetual Repercussion)
  const artRoofGeo = new THREE.BoxGeometry(portalW - 0.4, 0.35, slopeLen);
  artRoofGeo.rotateX(-slopeAngle);
  const artRoof = new THREE.Mesh(artRoofGeo, prismMatDay);
  artRoof.position.set(0, midY + 0.32, midZ);
  artRoof.userData.isAurora = true;
  group.add(artRoof);

  // 前立面上半部艺术棱镜立面 (Upper Facade Prism Cladding, Y from 5.6 to frontH)
  const alcoveH = 5.6;
  const facadeArtH = frontH - alcoveH;
  const facadeArtGeo = new THREE.BoxGeometry(portalW - 0.4, facadeArtH, 0.35);
  const frontTiltAngle = Math.atan2(frontZ - frontTopZ, frontH);
  facadeArtGeo.rotateX(-frontTiltAngle);
  const facadeArt = new THREE.Mesh(facadeArtGeo, prismMatDay);
  const midFacadeY = (alcoveH + frontH) / 2;
  const midFacadeZ = frontZ - (midFacadeY / frontH) * (frontZ - frontTopZ) - 0.15;
  facadeArt.position.set(0, midFacadeY, midFacadeZ);
  facadeArt.userData.isAurora = true;
  group.add(facadeArt);

  // 屋面立体晶莹高反光三角尖棱晶簇 (Prismatic Facet Crystal Shards)
  const shardMatDay = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.9,
  });
  for (let s = 0; s < 18; s++) {
    const frac = (s + 0.5) / 18;
    const sz = (frontTopZ - 1.2) - frac * (lengthZ - 2.4);
    const sy = frontH - frac * (frontH - rearH) + 0.45;
    const sx = ((s % 3) - 1) * 1.8 + ((s % 2) - 0.5) * 0.3;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.95, 3), shardMatDay);
    shard.position.set(sx, sy, sz);
    shard.rotation.x = -slopeAngle;
    shard.rotation.y = s * 1.1;
    group.add(shard);
  }

  // 3. 深入式重型防爆气密安全门斗 (Recessed Airlock Portal, Inset into Front)
  const alcoveW = portalW - wallThick * 2; // 5.5m
  const alcoveDepth = 2.2;
  const doorZ = frontZ - alcoveDepth; // 12.8

  // 门斗侧面与顶部金属衬板 (Airlock Metal Lining)
  const liningMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.8,
  });
  const alcoveCeiling = new THREE.Mesh(new THREE.BoxGeometry(alcoveW, 0.35, alcoveDepth), liningMat);
  alcoveCeiling.position.set(0, alcoveH, frontZ - alcoveDepth / 2);
  group.add(alcoveCeiling);

  // 重型工业防爆气密双开钢门 (Blast-Proof Double Steel Doors)
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    metalness: 0.92,
    roughness: 0.22,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(alcoveW - 0.4, alcoveH - 0.4, 0.4), doorMat);
  door.position.set(0, alcoveH / 2, doorZ + 0.2);
  group.add(door);

  // 门面中缝密封条与警示黄黑警戒线 (Safety Seal & Hazard Stripes)
  const sealMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    metalness: 0.2,
  });
  const doorSeal = new THREE.Mesh(new THREE.BoxGeometry(0.12, alcoveH - 0.4, 0.45), sealMat);
  doorSeal.position.set(0, alcoveH / 2, doorZ + 0.2);
  group.add(doorSeal);

  // 门楣"SVALBARD GLOBAL SEED VAULT" 发光铭牌 (Illuminated Signage Plaque)
  const signPlateMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(alcoveW - 0.8, 0.65, 0.2), signPlateMat);
  signPlate.position.set(0, alcoveH + 0.45, frontZ - 0.6);
  group.add(signPlate);

  // 门头大功率极地泛光安全照明灯 (Polar Safety Floodlights)
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xfef08a),
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  for (const lx of [-1.6, 1.6]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.35, 12), lampMat);
    lamp.rotation.x = Math.PI / 4;
    lamp.position.set(lx, alcoveH + 1.1, frontZ - 0.5);
    group.add(lamp);
  }

  // 4. 柏拉图山永久冻土山体斜坡与北极雪原地貌 (Platåberget Mountain Slope & Arctic Snow Mantle)
  // 宽 130m，纵深 140m (Z: +45 到 -95)，真实复现末日方舟嵌入北极极地冻土山脉破雪而出的雄伟全貌
  const mountainWidth = 130;
  const mountainDepth = 140;
  const segsX = 48;
  const segsZ = 44;

  function createMountainSlope() {
    const geo = new THREE.PlaneGeometry(mountainWidth, mountainDepth, segsX, segsZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const x = v.x;
      // PlaneGeometry 原点在中心，Z 范围 -70 到 +70
      // 沿 Z 平移，使实际世界坐标 worldZ 覆盖 +45 (引道前端雪原) 到 -95 (柏拉图山平顶台地)
      const worldZ = v.z - 25;

      const isBoundary =
        Math.abs(x) > mountainWidth / 2 - 0.2 ||
        worldZ > 44.5 ||
        worldZ < -94.5;

      if (isBoundary) {
        v.y = -2.0;
      } else {
        let h = 0;
        if (worldZ >= 14) {
          // 前方平缓进场北极雪原区 (Flatter polar apron along access road)
          if (Math.abs(x) < 4.8) {
            h = 0; // 引道中轴完全平整
          } else {
            h = Math.min(1.6, (Math.abs(x) - 4.8) * 0.08);
          }
        } else if (worldZ >= 4) {
          // 门头前部微隆雪坡过渡区，引道与门斗净空开敞
          if (Math.abs(x) < 4.5) {
            h = 0;
          } else {
            h = Math.min(2.5, (Math.abs(x) - 4.5) * 0.14);
          }
        } else if (worldZ >= -21) {
          // 门厅两侧紧贴混凝土侧壁的平滑积雪护坡 (Smooth Flanking Snow Berms)
          const bermProgress = (4 - worldZ) / 25; // 0 到 1
          const maxBermH = 1.0 + bermProgress * 6.2;
          if (Math.abs(x) <= 3.5) {
            // 建筑下方与后部自然垫高连续，杜绝网格断崖伪影
            h = maxBermH * 0.95;
          } else if (Math.abs(x) <= 12) {
            const lateral = (Math.abs(x) - 3.5) / 8.5;
            h = maxBermH * (1.0 - lateral * 0.65);
          } else {
            h = 1.8 + bermProgress * 5.2 + Math.min(8, (Math.abs(x) - 12) * 0.16);
          }
        } else if (worldZ >= -68) {
          // 柏拉图山主坡段向后急剧升高切入冻土岩层 (Main Platåberget Ascending Slope)
          const slopeProgress = (-21 - worldZ) / 47;
          h = 7.2 + 25.0 * Math.pow(slopeProgress, 0.85);
          h += (1.0 - Math.pow(x / 65, 2)) * 3.5;
          h += Math.sin(worldZ * 0.26) * 0.7 + Math.cos(x * 0.16) * 0.5;
        } else {
          // 柏拉图山顶标志性平顶高原台地 (Iconic Flat Summit Mesa of Platåberget)
          h = 32.2 + Math.sin(x * 0.09) * 0.7 + Math.cos(worldZ * 0.14) * 0.4;
        }
        v.y = Math.max(0, h);
      }
      pos.setXYZ(i, v.x, v.y, worldZ);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const mountainGeo = createMountainSlope();
  const mountainSnowMesh = new THREE.Mesh(mountainGeo, snowMat);
  mountainSnowMesh.userData.skipLines = true;
  group.add(mountainSnowMesh);

  // 柏拉图山标志性沉积岩层露头阶地 (Sedimentary Rock Strata Bands)
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.92,
    metalness: 0.06,
  });
  for (const bz of [-38, -62]) {
    const bandMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 2.2, 4.0), bandMat);
    const by = bz === -38 ? 14.5 : 26.5;
    bandMesh.position.set(0, by, bz);
    bandMesh.userData.skipLines = true;
    group.add(bandMesh);
  }

  // 出露的深色玄武岩碎石碎屑 (Basalt Scree Boulders along snow berms)
  for (const side of [-1, 1]) {
    for (let r = 0; r < 5; r++) {
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 + (r % 2) * 0.6, 1), rockMat);
      boulder.position.set(side * (7.2 + r * 2.2), 0.7 + (r % 2) * 0.3, frontZ - 4 - r * 5.2);
      boulder.userData.skipLines = true;
      group.add(boulder);
    }
  }

  // 5. 进场砂石引道与安全护桩 (Raised Access Causeway & Security Bollards)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.9,
    metalness: 0.05,
  });
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 42), roadMat);
  causeway.position.set(0, 0.3, frontZ + 21);
  causeway.userData.skipLines = true;
  group.add(causeway);
  group.add(causeway);

  // 两侧不锈钢安全护柱与警示指示灯 (Security Bollards with Top LED Rings)
  const bollardMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.25,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 1.5,
  });
  for (let bz = frontZ + 4; bz <= frontZ + 40; bz += 8) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.3, 12), bollardMat);
      post.position.set(side * 4.2, 0.95, bz);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 12), ledMat);
      ring.position.set(side * 4.2, 1.45, bz);
      group.add(post, ring);
    }
  }

  // 气象与卫星通信塔 (Polar Telemetry Mast)
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const commMast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 16, 8), mastMat);
  commMast.position.set(16, 11, backZ + 8);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), mastMat);
  dish.rotation.x = -Math.PI / 3;
  dish.position.set(16, 17, backZ + 8);
  group.add(commMast, dish);

  // 6. 昼夜模式切换 (Dynamic Aurora Repercussion Lighting)
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.userData?.isAurora) {
        mesh.material = night ? prismMatNight : prismMatDay;
      }
    });
  };

  return group;
}

// ─────────────────────────────────────────────────────────
// 18. 纽约自由女神像 (Statue of Liberty)
// 伍德堡十一角星形要塞、亨特花岗岩基座、埃菲尔熟铁弹性骨架与自洁氧化铜绿神像
// ─────────────────────────────────────────────────────────
