import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";

function makePentagonWindowTexture(isNight: boolean): THREE.CanvasTexture {
  const floors = 5;
  const cols = 36;
  const cellW = 16;
  const cellH = 28;
  const w = cols * cellW;
  const h = floors * cellH;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  g.fillStyle = isNight ? "#2c3344" : "#c5bfb0";
  g.fillRect(0, 0, w, h);

  for (let f = 0; f < floors; f++) {
    const y0 = f * cellH;
    g.fillStyle = isNight ? "#1a2030" : "#a59e8e";
    g.fillRect(0, y0 + cellH - 4, w, 4);

    g.fillStyle = isNight ? "#3a4255" : "#b0a898";
    g.fillRect(0, y0 + 2, w, 2);

    for (let i = 0; i < cols; i++) {
      const x0 = i * cellW;
      const padX = 3;
      const padY = 6;
      const wx = x0 + padX;
      const wy = y0 + padY;
      const ww = cellW - padX * 2;
      const wh = cellH - padY - 8;

      g.fillStyle = isNight ? "#151a24" : "#6a6560";
      g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);

      if (isNight) {
        const lit = (i * 7 + f * 13) % 10 > 3;
        if (lit) {
          const warm = (i + f) % 3 !== 0;
          g.fillStyle = warm ? "#ffd478" : "#d0e4ff";
        } else {
          g.fillStyle = "#0d121c";
        }
      } else {
        const shade = 140 + ((i * 11 + f * 17) % 40);
        g.fillStyle = `rgb(${shade - 30},${shade},${shade + 25})`;
      }
      g.fillRect(wx, wy, ww, wh);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createPentagon(kit: SurfaceKit): THREE.Group {
  const group = new THREE.Group();
  group.name = "Pentagon";

  const SIN36 = Math.sin(Math.PI / 5);
  const OUTER_SIDE = 281;
  const COURT_SIDE = 110;
  const OUTER_R = OUTER_SIDE / (2 * SIN36); // ~238.9m
  const COURT_R = COURT_SIDE / (2 * SIN36); // ~93.5m
  const BUILDING_H = 23.5;
  const BASE_H = 1.5;
  const RING_COUNT = 5;
  const LIGHT_COURT = 6.5;
  const usable = OUTER_R - COURT_R - LIGHT_COURT * (RING_COUNT - 1);
  const RING_W = usable / RING_COUNT;

  const dayWinTex = makePentagonWindowTexture(false);
  const nightWinTex = makePentagonWindowTexture(true);

  const wallMatDay = new THREE.MeshStandardMaterial({
    map: dayWinTex,
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const wallMatNight = new THREE.MeshStandardMaterial({
    map: nightWinTex,
    emissive: new THREE.Color(0xffd285),
    emissiveMap: nightWinTex,
    emissiveIntensity: 0.95,
    roughness: 0.65,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x6e756c,
    roughness: 0.92,
    metalness: 0.04,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xbfb9ac,
    roughness: 0.88,
  });
  const lawnMat = mapped(kit.grass, { color: 0x3d6635, roughness: 0.95, metersPerTile: 12 });

  const ROT0 = -Math.PI / 2;
  function pXZ(radius: number, rotation = ROT0) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
      const a = rotation + (i * 2 * Math.PI) / 5;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }

  // Pentagon base slab
  function addTrapezoidSlab(
    o0: THREE.Vector3,
    o1: THREE.Vector3,
    i1: THREE.Vector3,
    i0: THREE.Vector3,
    yBottom: number,
    thickness: number,
    material: THREE.Material,
  ) {
    const y0 = yBottom;
    const y1 = yBottom + thickness;
    const verts = new Float32Array([
      o0.x, y0, o0.z, o1.x, y0, o1.z, i1.x, y0, i1.z, i0.x, y0, i0.z,
      o0.x, y1, o0.z, o1.x, y1, o1.z, i1.x, y1, i1.z, i0.x, y1, i0.z,
    ]);
    const idx = [
      0, 2, 1, 0, 3, 2, // bottom
      4, 6, 5, 4, 7, 6, // top
      0, 1, 5, 0, 5, 4, // outer
      3, 7, 6, 3, 6, 2, // inner
      0, 4, 7, 0, 7, 3, // side
      1, 2, 6, 1, 6, 5, // side
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function addPentagonRingSlabs(
    outerR: number,
    innerR: number,
    yBottom: number,
    thickness: number,
    material: THREE.Material,
  ) {
    const outerPts = pXZ(outerR);
    const innerPts = pXZ(innerR);
    for (let s = 0; s < 5; s++) {
      const n = (s + 1) % 5;
      addTrapezoidSlab(outerPts[s], outerPts[n], innerPts[n], innerPts[s], yBottom, thickness, material);
    }
  }

  // Base platform
  addPentagonRingSlabs(OUTER_R + 6, COURT_R - 6, 0.2, BASE_H, concreteMat);

  // Courtyard lawn
  const courtLawn = new THREE.Mesh(new THREE.CircleGeometry(COURT_R - 8, 5), lawnMat);
  courtLawn.rotation.x = -Math.PI / 2;
  courtLawn.rotation.z = Math.PI / 10;
  courtLawn.position.y = BASE_H + 0.3;
  group.add(courtLawn);

  // Central pavilion in courtyard
  const centerPavilion = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 6, 5), concreteMat);
  centerPavilion.position.set(0, BASE_H + 3, 0);
  centerPavilion.rotation.y = Math.PI;
  group.add(centerPavilion);

  function addFacadeWall(
    a: THREE.Vector3,
    b: THREE.Vector3,
    y0: number,
    height: number,
    outward: number,
    uRepeat: number,
  ) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const edge = new THREE.Vector3().subVectors(b, a);
    const len = edge.length();
    const dir = edge.clone().normalize();
    let normal = new THREE.Vector3(-dir.z, 0, dir.x);
    const radial = new THREE.Vector3(mid.x, 0, mid.z).normalize();
    if (normal.dot(radial) < 0) normal.negate();
    if (outward < 0) normal.negate();

    mid.addScaledVector(normal, 0.12);

    const geo = new THREE.PlaneGeometry(len, height, 1, 1);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uv.getX(i) * uRepeat);
    }
    uv.needsUpdate = true;

    const mesh = new THREE.Mesh(geo, wallMatDay);
    mesh.userData.isWall = true;
    mesh.userData.keepUv = true;
    mesh.userData.wallMatDay = wallMatDay;
    mesh.userData.wallMatNight = wallMatNight;
    mesh.position.set(mid.x, y0 + height / 2, mid.z);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // 5 Rings
  for (let r = 0; r < RING_COUNT; r++) {
    const outer = OUTER_R - r * (RING_W + LIGHT_COURT);
    const inner = outer - RING_W;

    // Roof & Floor slabs
    addPentagonRingSlabs(outer - 0.1, inner + 0.1, BASE_H + BUILDING_H, 0.6, roofMat);
    addPentagonRingSlabs(outer, inner, BASE_H, 0.4, concreteMat);

    const outPts = pXZ(outer);
    const inPts = pXZ(inner);
    const uOut = (outer * 2 * Math.sin(Math.PI / 5)) / 22;
    const uIn = (inner * 2 * Math.sin(Math.PI / 5)) / 22;

    for (let s = 0; s < 5; s++) {
      const n = (s + 1) % 5;
      // Outer facade
      addFacadeWall(outPts[s], outPts[n], BASE_H, BUILDING_H, 1, uOut);
      // Inner facade
      addFacadeWall(inPts[n], inPts[s], BASE_H, BUILDING_H, -1, uIn);
    }
  }

  // 10 Radial Corridors linking rings
  const corridorMat = concreteMat;
  for (let s = 0; s < 5; s++) {
    // 5 corner corridors
    const a = ROT0 + (s * 2 * Math.PI) / 5;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const span = OUTER_R - COURT_R;
    const midDist = (OUTER_R + COURT_R) / 2;
    const pos = dir.clone().multiplyScalar(midDist);

    const corr = new THREE.Mesh(new THREE.BoxGeometry(7, BUILDING_H * 0.9, span), corridorMat);
    corr.position.set(pos.x, BASE_H + (BUILDING_H * 0.9) / 2, pos.z);
    corr.lookAt(0, corr.position.y, 0);
    group.add(corr);

    // 5 edge midpoint corridors
    const midA = a + Math.PI / 5;
    const midDir = new THREE.Vector3(Math.cos(midA), 0, Math.sin(midA));
    const mDist = midDist * Math.cos(Math.PI / 5);
    const mPos = midDir.clone().multiplyScalar(mDist);
    const mSpan = (OUTER_R - COURT_R) * Math.cos(Math.PI / 5);
    const corrMid = new THREE.Mesh(new THREE.BoxGeometry(6, BUILDING_H * 0.9, mSpan), corridorMat);
    corrMid.position.set(mPos.x, BASE_H + (BUILDING_H * 0.9) / 2, mPos.z);
    corrMid.lookAt(0, corrMid.position.y, 0);
    group.add(corrMid);
  }

  group.userData.hasInspection = true;
  group.userData.setNightMode = (night: boolean) => {
    group.traverse((c) => {
      if ((c as THREE.Mesh).userData?.isWall) {
        (c as THREE.Mesh).material = night ? wallMatNight : wallMatDay;
      }
    });
  };

  return group;
}

