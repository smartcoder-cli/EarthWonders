import * as THREE from "three";
import { type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
} from "./_shared";

export function createEiffelTower(_kit: SurfaceKit): THREE.Group {
  const root = new THREE.Group();
  root.name = "eiffel";

  // 熟铁骨架日间材质 (Wrought Iron Puddled Antique Bronze)
  const ironDay = new THREE.MeshStandardMaterial({
    color: 0x4a3c2c,
    roughness: 0.65,
    metalness: 0.75,
  });
  // 熟铁骨架夜间香槟金泛光材质 (Golden Floodlit Champagne Glow)
  const ironNight = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.45,
    metalness: 0.6,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
  });
  const masonryMat = stone(0xbdb29a, 0.9, 0.05);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x3d352b,
    roughness: 0.75,
    metalness: 0.4,
  });
  const goldSpireMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    metalness: 0.85,
  });
  const glassDay = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.55,
  });
  const glassNight = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.85,
  });

  const ironMeshes: THREE.Mesh[] = [];
  const glassMeshes: THREE.Mesh[] = [];

  // 1. 战神广场绿荫台基 (真实塔基占宽 ~125x125m)
  const parkBase = box(root, stone(0x27361b, 0.95, 0.0), 190, 1.2, 190, 0, 0, 0);
  parkBase.userData.skipLines = true;

  // 2. 四足倾斜熟铁桁架巨柱 (底座外缘 ±62m ≈ 124m 见方，精准对应实景 125x125m)
  const legPositions = [
    { x: -51, z: -51, tx: -23, tz: -23 }, // N / Corner
    { x: 51, z: -51, tx: 23, tz: -23 },
    { x: 51, z: 51, tx: 23, tz: 23 },
    { x: -51, z: 51, tx: -23, tz: 23 },
  ];

  for (const lp of legPositions) {
    // 双层花岗岩减震基墩
    const ped1 = box(root, masonryMat, 22, 2.5, 22, lp.x, 0.6, lp.z);
    ped1.userData.skipLines = true;
    const ped2 = box(root, masonryMat, 17, 2.5, 17, lp.x, 3.1, lp.z);
    ped2.userData.skipLines = true;

    const legDx = lp.tx - lp.x;
    const legDz = lp.tz - lp.z;
    const legLen = Math.hypot(legDx, 57, legDz);
    const slopeQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(legDx, 57, legDz).normalize()
    );

    // 每条腿作为一个实体的倾斜格构空间桁架组
    const legGroup = new THREE.Group();
    legGroup.position.set((lp.x + lp.tx) / 2, 57 / 2, (lp.z + lp.tz) / 2);
    legGroup.quaternion.copy(slopeQuat);

    // 内部倾斜电梯轨道井核心 (Elevator Core Spine inside each leg)
    const elevatorTrack = box(legGroup, ironDay, 2.8, legLen, 2.8, 0, -legLen / 2, 0);
    ironMeshes.push(elevatorTrack);

    // 四根粗壮主角钢弦杆 (Corner Chords, 1.5m 见方柱)
    const halfBase = 5.2;
    const halfTop = 3.6;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const chord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 1.25, legLen, 4),
          ironDay
        );
        chord.position.set(sx * (halfBase + halfTop) / 2, 0, sz * (halfBase + halfTop) / 2);
        chord.rotation.y = Math.PI / 4;
        legGroup.add(chord);
        ironMeshes.push(chord);
      }
    }

    // 沿腿身分布的密布横梁与 X 型对角交叉桁架腹杆 (Dense X-Truss Webs on all 4 faces)
    const stages = 6;
    for (let s = 0; s < stages; s++) {
      const frac1 = s / stages - 0.5;
      const frac2 = (s + 1) / stages - 0.5;
      const y1 = frac1 * legLen;
      const y2 = frac2 * legLen;
      const midY = (y1 + y2) / 2;
      const segH = y2 - y1;
      const curW = (halfBase + halfTop) + (s / stages) * (halfTop - halfBase) * 2;

      // 4 面环形水平腰箍梁
      for (const side of [0, 1, 2, 3]) {
        const isX = (side % 2 === 0);
        const sign = side < 2 ? 1 : -1;
        const ring = box(
          legGroup,
          ironDay,
          isX ? curW : 0.8,
          0.85,
          isX ? 0.8 : curW,
          isX ? 0 : sign * (curW / 2),
          y1 - 0.4,
          isX ? sign * (curW / 2) : 0
        );
        ironMeshes.push(ring);

        // X 型交叉斜撑对角腹杆 (Crossed Diagonal Struts)
        const diagLen = Math.hypot(curW, segH);
        const diagAng = Math.atan2(segH, curW);

        const d1 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.65, 0.65), ironDay);
        d1.position.set(
          isX ? 0 : sign * (curW / 2),
          midY,
          isX ? sign * (curW / 2) : 0
        );
        if (isX) {
          d1.rotation.z = diagAng;
        } else {
          d1.rotation.y = Math.PI / 2;
          d1.rotation.x = diagAng;
        }
        legGroup.add(d1);
        ironMeshes.push(d1);

        const d2 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.65, 0.65), ironDay);
        d2.position.set(
          isX ? 0 : sign * (curW / 2),
          midY,
          isX ? sign * (curW / 2) : 0
        );
        if (isX) {
          d2.rotation.z = -diagAng;
        } else {
          d2.rotation.y = Math.PI / 2;
          d2.rotation.x = -diagAng;
        }
        legGroup.add(d2);
        ironMeshes.push(d2);
      }
    }

    root.add(legGroup);
  }

  // 3. 四面深邃宏伟的抛物线大拱券 (Monumental Base Arches, y = 0 ~ 39m)
  // 拱券深度加厚至 14 米，拥有双层上下弧梁与辐射状腹杆
  const archConfigs = [
    { x: 0, z: -41.5, rotY: 0 },
    { x: 41.5, z: 0, rotY: Math.PI / 2 },
    { x: 0, z: 41.5, rotY: 0 },
    { x: -41.5, z: 0, rotY: Math.PI / 2 },
  ];
  for (const ac of archConfigs) {
    const archGroup = new THREE.Group();
    archGroup.position.set(ac.x, 0, ac.z);
    archGroup.rotation.y = ac.rotY;

    const ptsCount = 20;
    const archSpan = 74;
    const archPeak = 39;
    const archDepth = 14.0; // 深度加厚至 14 米，完全填满两腿间距！

    // 上下双层抛物线拱圈截面
    const archShape = new THREE.Shape();
    archShape.moveTo(-archSpan / 2, 0);
    for (let i = 0; i <= ptsCount; i++) {
      const t = (i / ptsCount) * 2 - 1;
      const y = archPeak * (1 - t * t);
      const x = t * (archSpan / 2);
      archShape.lineTo(x, y);
    }
    for (let i = ptsCount; i >= 0; i--) {
      const t = (i / ptsCount) * 2 - 1;
      const y = Math.max(0, (archPeak - 4.5) * (1 - t * t));
      const x = t * ((archSpan - 6) / 2);
      archShape.lineTo(x, y);
    }
    archShape.closePath();

    const extrudeGeom = new THREE.ExtrudeGeometry(archShape, {
      depth: archDepth,
      bevelEnabled: true,
      bevelThickness: 0.6,
      bevelSize: 0.5,
      bevelSegments: 2,
    });
    extrudeGeom.center();
    const archMesh = new THREE.Mesh(extrudeGeom, ironDay);
    archMesh.position.set(0, archPeak / 2, 0);
    archGroup.add(archMesh);
    ironMeshes.push(archMesh);

    // 拱腹辐射状工字钢支柱花饰
    for (let i = 1; i < ptsCount; i++) {
      const t = (i / ptsCount) * 2 - 1;
      const y = (archPeak - 2.2) * (1 - t * t);
      const x = t * (archSpan / 2);
      for (const oz of [-5, 0, 5]) {
        const strut = box(archGroup, ironDay, 0.7, 4.2, 0.7, x, y - 2.1, oz);
        ironMeshes.push(strut);
      }
    }

    // 拱顶中央装饰金徽章圆环
    const rosette = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, archDepth + 0.5, 16),
      goldSpireMat
    );
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(0, archPeak - 2.2, 0);
    archGroup.add(rosette);

    root.add(archGroup);
  }

  // 4. 一层宏伟双层大观景台 (Platform 1, y = 57m, 72m x 72m)
  const p1Outer = box(root, deckMat, 72, 4.2, 72, 0, 57, 0);
  p1Outer.userData.skipLines = true;

  // 外围 72 位法国科学家金色雕刻铭文楣饰 (包覆平台四面)
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const fg = new THREE.Group();
    box(fg, goldSpireMat, 66, 2.2, 0.6, 0, 59.5, 36.1);
    fg.rotation.y = rotY;
    root.add(fg);
  }

  const p1Rim = box(root, ironDay, 73.5, 1.8, 73.5, 0, 60.5, 0);
  ironMeshes.push(p1Rim);

  // 四座大型全景玻璃展厅与餐厅
  for (const sx of [-22, 22]) {
    for (const sz of [-22, 22]) {
      const pav = box(root, glassDay, 13, 5.2, 13, sx, 61.5, sz);
      pav.userData.keepUv = true;
      glassMeshes.push(pav);
      box(root, ironDay, 14, 0.8, 14, sx, 66.5, sz);
    }
  }

  // 中庭强化玻璃镂空透空漫步区
  box(root, deckMat, 28, 0.6, 28, 0, 59.2, 0);

  // 5. 一至二层斜向收拢段 (Platform 1 to Platform 2, y = 57m ~ 115m)
  // 腿身从 (±23, 57, ±23) 收拢至 (±13.5, 115, ±13.5)
  for (const lp of legPositions) {
    const startX = lp.tx;
    const startZ = lp.tz;
    const endX = (lp.tx > 0 ? 1 : -1) * 13.5;
    const endZ = (lp.tz > 0 ? 1 : -1) * 13.5;
    const legDx = endX - startX;
    const legDz = endZ - startZ;
    const legLen = Math.hypot(legDx, 58, legDz);
    const slopeQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(legDx, 58, legDz).normalize()
    );

    const midLegGroup = new THREE.Group();
    midLegGroup.position.set((startX + endX) / 2, 57 + 58 / 2, (startZ + endZ) / 2);
    midLegGroup.quaternion.copy(slopeQuat);

    // 4 根加粗主角柱 (1.1m)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const chord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.95, legLen, 4),
          ironDay
        );
        chord.position.set(sx * 2.8, 0, sz * 2.8);
        chord.rotation.y = Math.PI / 4;
        midLegGroup.add(chord);
        ironMeshes.push(chord);
      }
    }

    // 4 级 X 型交叉桁架
    for (let s = 0; s < 4; s++) {
      const frac = (s + 0.5) / 4 - 0.5;
      const my = frac * legLen;
      const diagLen = Math.hypot(5.6, legLen / 4);
      const ang = Math.atan2(legLen / 4, 5.6);
      for (const isX of [true, false]) {
        for (const sgn of [-1, 1]) {
          const d1 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.55, 0.55), ironDay);
          d1.position.set(isX ? 0 : sgn * 2.8, my, isX ? sgn * 2.8 : 0);
          if (isX) d1.rotation.z = ang;
          else { d1.rotation.y = Math.PI / 2; d1.rotation.x = ang; }
          midLegGroup.add(d1);
          ironMeshes.push(d1);

          const d2 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.55, 0.55), ironDay);
          d2.position.set(isX ? 0 : sgn * 2.8, my, isX ? sgn * 2.8 : 0);
          if (isX) d2.rotation.z = -ang;
          else { d2.rotation.y = Math.PI / 2; d2.rotation.x = -ang; }
          midLegGroup.add(d2);
          ironMeshes.push(d2);
        }
      }
    }

    root.add(midLegGroup);
  }

  // 四腿中部重型加劲连系横梁 (y = 86m & y = 102m)
  for (const hy of [86, 102]) {
    const w = hy === 86 ? 38 : 31;
    const off = hy === 86 ? 19 : 15.5;
    box(root, ironDay, w, 2.2, 1.8, 0, hy, -off);
    box(root, ironDay, w, 2.2, 1.8, 0, hy, off);
    box(root, ironDay, 1.8, 2.2, w, -off, hy, 0);
    box(root, ironDay, 1.8, 2.2, w, off, hy, 0);
  }

  // 6. 二层双层观景平台与儒勒·凡尔纳餐厅 (Platform 2, y = 115m ~ 124m, 44m x 44m)
  const p2Outer = box(root, deckMat, 44, 3.6, 44, 0, 115, 0);
  p2Outer.userData.skipLines = true;
  const p2Rim = box(root, ironDay, 45.5, 1.4, 45.5, 0, 117.0, 0);
  ironMeshes.push(p2Rim);

  // 四角斜向外挑承托牛腿 (Cantilever Knee Braces under Platform 2)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.5, 1.2), ironDay);
      brace.position.set(sx * 17.5, 111, sz * 17.5);
      brace.rotation.z = sx * 0.45;
      brace.rotation.x = -sz * 0.45;
      root.add(brace);
      ironMeshes.push(brace);
    }
  }

  // 凡尔纳米其林全景餐厅核心 (Jules Verne Restaurant, y = 117.5m ~ 123.5m)
  const p2Core = box(root, glassDay, 28, 5.0, 28, 0, 119.5, 0);
  p2Core.userData.keepUv = true;
  glassMeshes.push(p2Core);

  // 二层露天观景天台与金色雕花护栏 (Upper Deck & Railing, y = 122.5m)
  box(root, deckMat, 32, 1.2, 32, 0, 122.5, 0);
  box(root, goldSpireMat, 32.5, 1.0, 32.5, 0, 123.6, 0);

  // 6.5. 【平滑无缝衔接】：二层至三层汇聚段四腿平滑收分与过渡拱券 (Smooth Transition Zone, y = 115m ~ 138m)
  // 腿柱从 (±13.5, 115, ±13.5) 优雅平滑内倾收拢至 (±6.5, 138, ±6.5)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tLen = Math.hypot(7.0, 23.0, 7.0);
      const tLegQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-sx * 7.0, 23.0, -sz * 7.0).normalize()
      );
      const transLeg = new THREE.Group();
      transLeg.position.set(sx * 10.0, 115 + 11.5, sz * 10.0);
      transLeg.quaternion.copy(tLegQuat);

      // 4 根渐变弦杆
      for (const cx of [-1, 1]) {
        for (const cz of [-1, 1]) {
          const chord = new THREE.Mesh(
            new THREE.CylinderGeometry(0.65, 0.85, tLen, 4),
            ironDay
          );
          chord.position.set(cx * 1.6, 0, cz * 1.6);
          chord.rotation.y = Math.PI / 4;
          transLeg.add(chord);
          ironMeshes.push(chord);
        }
      }

      // 2 级 X 型交叉桁架
      for (let s = 0; s < 2; s++) {
        const frac = (s + 0.5) / 2 - 0.5;
        const my = frac * tLen;
        const dLen = Math.hypot(3.2, tLen / 2);
        const ang = Math.atan2(tLen / 2, 3.2);
        for (const isX of [true, false]) {
          for (const sgn of [-1, 1]) {
            const d1 = new THREE.Mesh(new THREE.BoxGeometry(dLen, 0.45, 0.45), ironDay);
            d1.position.set(isX ? 0 : sgn * 1.6, my, isX ? sgn * 1.6 : 0);
            if (isX) d1.rotation.z = ang;
            else { d1.rotation.y = Math.PI / 2; d1.rotation.x = ang; }
            transLeg.add(d1);
            ironMeshes.push(d1);

            const d2 = new THREE.Mesh(new THREE.BoxGeometry(dLen, 0.45, 0.45), ironDay);
            d2.position.set(isX ? 0 : sgn * 1.6, my, isX ? sgn * 1.6 : 0);
            if (isX) d2.rotation.z = -ang;
            else { d2.rotation.y = Math.PI / 2; d2.rotation.x = -ang; }
            transLeg.add(d2);
            ironMeshes.push(d2);
          }
        }
      }
      root.add(transLeg);
    }
  }

  // 四面二层上方优雅过渡抛物线拱券 (Upper Transition Arches, y = 116m ~ 132m)
  for (const rotY of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const upArchGroup = new THREE.Group();
    upArchGroup.rotation.y = rotY;

    const uSpan = 21.0;
    const uPeak = 14.0;
    const uPts = 12;
    const uShape = new THREE.Shape();
    uShape.moveTo(-uSpan / 2, 0);
    for (let i = 0; i <= uPts; i++) {
      const t = (i / uPts) * 2 - 1;
      const x = (t * uSpan) / 2;
      const y = uPeak * (1 - t * t);
      uShape.lineTo(x, y);
    }
    uShape.lineTo(uSpan / 2, uPeak + 2.0);
    uShape.lineTo(-uSpan / 2, uPeak + 2.0);
    uShape.closePath();

    const uGeom = new THREE.ExtrudeGeometry(uShape, {
      depth: 3.2,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 0.3,
      bevelSegments: 2,
    });
    uGeom.center();
    const uMesh = new THREE.Mesh(uGeom, ironDay);
    uMesh.position.set(0, 116 + uPeak / 2, 10.0);
    upArchGroup.add(uMesh);
    ironMeshes.push(uMesh);

    root.add(upArchGroup);
  }

  // 汇聚过渡环梁平台 (Convergence Collar Balcony, y = 136m ~ 138m)
  const collar1 = box(root, ironDay, 16.8, 1.2, 16.8, 0, 136.5, 0);
  box(root, deckMat, 15.6, 1.0, 15.6, 0, 137.6, 0);
  box(root, goldSpireMat, 16.0, 0.8, 16.0, 0, 138.4, 0);
  ironMeshes.push(collar1);

  // 7. 二层至三层汇聚为一的主塔身巨柱 (Main Tower Spire Column, y = 138m ~ 276m)
  // 自 14.5m 见方无缝平滑匀称收拢至 8.0m 见方，全高 138 米！
  const spireH = 138;
  const spireBaseY = 138;
  const spireStepsCount = 14; // 14 级密集 X 格构节段！

  // 中央重型垂直电梯井核心 (Solid Elevator Core)
  const centralSpine = box(root, ironDay, 4.2, spireH + 23, 4.2, 0, 115, 0);
  centralSpine.position.y = 115 + (spireH + 23) / 2;
  ironMeshes.push(centralSpine);

  // 4 根随塔身斜向均匀收分的主塔角柱（底部 ±7.25m 连续收拢至顶部 ±4.0m）
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const bOff = 7.25;
      const tOff = 4.0;
      const dx = sx * (tOff - bOff);
      const dz = sz * (tOff - bOff);
      const colLen = Math.hypot(dx, spireH, dz);
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.70, 1.15, colLen, 6),
        ironDay
      );
      col.position.set(sx * ((bOff + tOff) / 2), spireBaseY + spireH / 2, sz * ((bOff + tOff) / 2));
      col.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(dx, spireH, dz).normalize()
      );
      root.add(col);
      ironMeshes.push(col);
    }
  }

  // 14 级密集分布的水平围梁与 4 面交叉 X 型桁架腹杆 (Dense Façade X-Trusses)
  for (let s = 0; s < spireStepsCount; s++) {
    const frac1 = s / spireStepsCount;
    const frac2 = (s + 1) / spireStepsCount;
    const y1 = spireBaseY + frac1 * spireH;
    const y2 = spireBaseY + frac2 * spireH;
    const midY = (y1 + y2) / 2;
    const segH = y2 - y1;
    const w1 = 14.5 - frac1 * 6.5;
    const w2 = 14.5 - frac2 * 6.5;
    const curW = (w1 + w2) / 2;

    // 四面闭合水平环梁
    for (const side of [0, 1, 2, 3]) {
      const isX = (side % 2 === 0);
      const sign = side < 2 ? 1 : -1;
      const ring = box(
        root,
        ironDay,
        isX ? curW : 0.8,
        0.8,
        isX ? 0.8 : curW,
        isX ? 0 : sign * (curW / 2),
        y1,
        isX ? sign * (curW / 2) : 0
      );
      ironMeshes.push(ring);

      // 双向对角 X 撑
      const diagLen = Math.hypot(curW, segH);
      const ang = Math.atan2(segH, curW);

      const d1 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.52, 0.52), ironDay);
      d1.position.set(isX ? 0 : sign * (curW / 2), midY, isX ? sign * (curW / 2) : 0);
      if (isX) d1.rotation.z = ang;
      else { d1.rotation.y = Math.PI / 2; d1.rotation.x = ang; }
      root.add(d1);
      ironMeshes.push(d1);

      const d2 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.52, 0.52), ironDay);
      d2.position.set(isX ? 0 : sign * (curW / 2), midY, isX ? sign * (curW / 2) : 0);
      if (isX) d2.rotation.z = -ang;
      else { d2.rotation.y = Math.PI / 2; d2.rotation.x = -ang; }
      root.add(d2);
      ironMeshes.push(d2);
    }

    // 中途标志性外悬挑检修兼观景环廊 (Balconies at y=175m, 215m, 250m)
    if (s === 4 || s === 8 || s === 11) {
      const bPlat = box(root, ironDay, curW + 2.2, 0.9, curW + 2.2, 0, y1, 0);
      ironMeshes.push(bPlat);
    }
  }

  // 8. 三层顶层观景台与埃菲尔私人公寓 (Platform 3, y = 276m ~ 295m)
  const p3Lower = new THREE.Mesh(
    new THREE.CylinderGeometry(8.0, 8.5, 6.5, 18),
    glassDay
  );
  p3Lower.position.set(0, 276 + 6.5 / 2, 0);
  p3Lower.userData.keepUv = true;
  root.add(p3Lower);
  glassMeshes.push(p3Lower);

  const p3Deck = new THREE.Mesh(
    new THREE.CylinderGeometry(9.0, 9.0, 1.4, 18),
    deckMat
  );
  p3Deck.position.set(0, 283.5, 0);
  root.add(p3Deck);

  const p3Upper = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.8, 8.0, 16),
    ironDay
  );
  p3Upper.position.set(0, 287.5, 0);
  root.add(p3Upper);
  ironMeshes.push(p3Upper);

  // 9. 镀金穹顶、旋转灯塔与广播发射桅杆 (严密衔接 P3Upper y=291.5m 无断层)
  const cupola = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    goldSpireMat
  );
  cupola.position.set(0, 291.5, 0);
  root.add(cupola);

  const beaconGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 2.2,
  });
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.6, 6.5, 14),
    beaconGlassMat
  );
  lantern.position.set(0, 298.5, 0);
  root.add(lantern);

  const mastLower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 2.4, 16, 8),
    goldSpireMat
  );
  mastLower.position.set(0, 309.5, 0);
  root.add(mastLower);

  const mastPinnacle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.2, 13, 8),
    goldSpireMat
  );
  mastPinnacle.position.set(0, 323.5, 0);
  root.add(mastPinnacle);

  for (const ay of [305, 311, 317, 323]) {
    box(root, goldSpireMat, 5.2, 0.3, 0.3, 0, ay, 0);
    box(root, goldSpireMat, 0.3, 0.3, 5.2, 0, ay, 0);
  }

  const redBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0044 })
  );
  redBeacon.position.set(0, 330, 0);
  root.add(redBeacon);

  // 10. 360° 双光束旋转探照灯 (Lighthouse Beacon)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 298.5, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const sign of [-1, 1]) {
    const beamGeo = new THREE.ConeGeometry(10.0, 90, 16, 1, true);
    beamGeo.rotateZ(sign * Math.PI / 2);
    beamGeo.translate(sign * 45, 0, 0);
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beaconGroup.add(beamMesh);
  }
  root.add(beaconGroup);

  // 11. 夜间建筑泛光照明
  const flood1 = new THREE.PointLight(0xf59e0b, 0, 130, 1.6);
  flood1.position.set(0, 42, 0);
  root.add(flood1);

  const flood2 = new THREE.PointLight(0xfbbf24, 0, 110, 1.5);
  flood2.position.set(0, 118, 0);
  root.add(flood2);

  const flood3 = new THREE.PointLight(0xfef08a, 0, 90, 1.5);
  flood3.position.set(0, 278, 0);
  root.add(flood3);

  // 昼夜模式切换
  root.userData.hasInspection = true;
  root.userData.setNightMode = (night: boolean) => {
    for (const mesh of ironMeshes) {
      mesh.material = night ? ironNight : ironDay;
    }
    for (const gm of glassMeshes) {
      gm.material = night ? glassNight : glassDay;
    }
    beamMat.opacity = night ? 0.38 : 0.0;
    flood1.intensity = night ? 3.8 : 0;
    flood2.intensity = night ? 2.8 : 0;
    flood3.intensity = night ? 2.4 : 0;
  };

  return root;
}

// ─────────────────────────────────────────────────────────
// 希腊雅典帕特农神庙 (Parthenon, Acropolis of Athens)
// ─────────────────────────────────────────────────────────

