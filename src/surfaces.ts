import * as THREE from "three";

export type SurfaceKit = {
  pyramid: THREE.Texture
  wall: THREE.Texture
  petra: THREE.Texture
  colosseum: THREE.Texture
  chichen: THREE.Texture
  machu: THREE.Texture
  marble: THREE.Texture
  soapstone: THREE.Texture
  grass: THREE.Texture
  arena: THREE.Texture
  roofTile: THREE.Texture
  redSandstone: THREE.Texture
  desert: THREE.Texture
  thatch: THREE.Texture
  tura: THREE.Texture
};

const FILES: Record<keyof SurfaceKit, string> = {
  pyramid: "textures/pyramid-limestone.jpg",
  wall: "textures/wall-brick.jpg",
  petra: "textures/petra-sandstone.jpg",
  colosseum: "textures/colosseum-travertine.jpg",
  chichen: "textures/chichen-limestone.jpg",
  machu: "textures/machu-andesite.jpg",
  marble: "textures/taj-marble.jpg",
  soapstone: "textures/christ-soapstone.jpg",
  grass: "textures/andean-grass.jpg",
  arena: "textures/arena-sand.jpg",
  roofTile: "textures/wall-roof-tile.jpg",
  redSandstone: "textures/taj-sandstone.jpg",
  desert: "textures/desert-sand.jpg",
  thatch: "textures/thatch.jpg",
  tura: "textures/tura-limestone.jpg",
};

export type MappedOpts = {
  color?: number
  roughness?: number
  metalness?: number
  bumpScale?: number
  invertBump?: boolean
  metersPerTile?: number
  clearcoat?: number
  opacity?: number
};

const bumpCache = new WeakMap<THREE.Texture, { n?: THREE.Texture; i?: THREE.Texture }>();

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function prep(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function bumpFrom(source: THREE.Texture, invert: boolean) {
  let entry = bumpCache.get(source);
  if (!entry) {
    entry = {};
    bumpCache.set(source, entry);
  }
  const cached = invert ? entry.i : entry.n;
  if (cached) return cached;

  const img = source.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallback = source.clone();
    fallback.colorSpace = THREE.NoColorSpace;
    return fallback;
  }
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    let y = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    y = Math.min(255, Math.max(0, (y - 128) * 1.5 + 128));
    if (invert) y = 255 - y;
    px[i] = px[i + 1] = px[i + 2] = y;
  }
  ctx.putImageData(data, 0, 0);
  const bump = new THREE.CanvasTexture(canvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = 8;
  bump.needsUpdate = true;
  if (invert) entry.i = bump;
  else entry.n = bump;
  return bump;
}

export async function loadSurfaceKit(): Promise<SurfaceKit> {
  const loader = new THREE.TextureLoader();
  const entries = await Promise.all(
    (Object.keys(FILES) as (keyof SurfaceKit)[]).map(async (key) => {
      const texture = prep(await loader.loadAsync(assetUrl(FILES[key])));
      return [key, texture] as const;
    }),
  );
  return Object.fromEntries(entries) as SurfaceKit;
}

const CYLINDRICAL_TYPES = new Set([
  "CylinderGeometry",
  "CapsuleGeometry",
  "LatheGeometry",
  "SphereGeometry",
  "TorusGeometry",
]);

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _e1 = new THREE.Vector3();
const _e2 = new THREE.Vector3();
const _n = new THREE.Vector3();
const _uAxis = new THREE.Vector3();
const _vAxis = new THREE.Vector3();
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * 沿表面展开 UV（米制）。斜面用法线 × 上方向做面内正交基，
 * 避免把墙砖投影到世界轴平面后出现透视梯形。
 */
export function applyMeterUvs(geometry: THREE.BufferGeometry, metersPerTile = 7) {
  const cylindrical = CYLINDRICAL_TYPES.has(geometry.type);
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  if (cylindrical) applyCylindricalUvs(geo, metersPerTile);
  else applyFaceUvs(geo, metersPerTile);
  geo.computeVertexNormals();
  return geo;
}

function applyFaceUvs(geo: THREE.BufferGeometry, metersPerTile: number) {
  const pos = geo.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  const scale = 1 / metersPerTile;
  for (let i = 0; i < pos.count; i += 3) {
    _a.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    _b.set(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
    _c.set(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
    _e1.subVectors(_b, _a);
    _e2.subVectors(_c, _a);
    _n.crossVectors(_e1, _e2);
    if (_n.lengthSq() < 1e-12) {
      writeUv(uv, i, _a.x * scale, _a.z * scale);
      writeUv(uv, i + 1, _b.x * scale, _b.z * scale);
      writeUv(uv, i + 2, _c.x * scale, _c.z * scale);
      continue;
    }
    _n.normalize();

    if (Math.abs(_n.y) > 0.72) {
      writeUv(uv, i, _a.x * scale, _a.z * scale);
      writeUv(uv, i + 1, _b.x * scale, _b.z * scale);
      writeUv(uv, i + 2, _c.x * scale, _c.z * scale);
      continue;
    }

    _uAxis.crossVectors(_up, _n);
    if (_uAxis.lengthSq() < 1e-8) _uAxis.set(1, 0, 0);
    else _uAxis.normalize();
    _vAxis.crossVectors(_n, _uAxis).normalize();
    if (_vAxis.y < 0) {
      _vAxis.negate();
      _uAxis.negate();
    }

    for (let k = 0; k < 3; k++) {
      _p.set(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      writeUv(uv, i + k, _p.dot(_uAxis) * scale, _p.dot(_vAxis) * scale);
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function applyCylindricalUvs(geo: THREE.BufferGeometry, metersPerTile: number) {
  const pos = geo.getAttribute("position");
  let rSum = 0;
  for (let i = 0; i < pos.count; i++) {
    rSum += Math.hypot(pos.getX(i), pos.getZ(i));
  }
  const radius = rSum / Math.max(pos.count, 1) || 1;
  const uv = new Float32Array(pos.count * 2);
  const scale = 1 / metersPerTile;
  const thetas = [0, 0, 0];
  for (let i = 0; i < pos.count; i += 3) {
    const count = Math.min(3, pos.count - i);
    let minT = Infinity;
    let maxT = -Infinity;
    for (let k = 0; k < count; k++) {
      const t = Math.atan2(pos.getX(i + k), pos.getZ(i + k));
      thetas[k] = t;
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    const wrap = maxT - minT > Math.PI;
    for (let k = 0; k < count; k++) {
      let t = thetas[k];
      if (wrap && t < 0) t += Math.PI * 2;
      writeUv(uv, i + k, t * radius * scale, pos.getY(i + k) * scale);
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function writeUv(uv: Float32Array, vertex: number, u: number, v: number) {
  uv[vertex * 2] = u;
  uv[vertex * 2 + 1] = v;
}

export function finishSurfaces<T extends THREE.Object3D>(root: T, defaultMeters = 7): T {
  const seen = new WeakMap<THREE.BufferGeometry, number>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.keepUv) return;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const meters =
      (mesh.userData.metersPerTile as number | undefined) ??
      (mat?.userData?.metersPerTile as number | undefined) ??
      defaultMeters;
    const prev = seen.get(mesh.geometry);
    if (prev === meters) return;
    if (prev !== undefined) mesh.geometry = mesh.geometry.clone();
    mesh.geometry = applyMeterUvs(mesh.geometry, meters);
    seen.set(mesh.geometry, meters);
  });
  return root;
}

export function mapped(source: THREE.Texture, opts: MappedOpts = {}) {
  const roughness = opts.roughness ?? 0.88;
  const bump = bumpFrom(source, opts.invertBump ?? false);
  const bumpScale = opts.bumpScale ?? (roughness < 0.5 ? 0.1 : 0.38);
  const common = {
    map: source,
    bumpMap: bump,
    bumpScale,
    color: opts.color ?? 0xffffff,
    roughness,
    metalness: opts.metalness ?? 0.03,
  };
  const mat =
    opts.clearcoat != null
      ? new THREE.MeshPhysicalMaterial({
          ...common,
          clearcoat: opts.clearcoat,
          clearcoatRoughness: 0.32,
        })
      : new THREE.MeshStandardMaterial(common);
  if (opts.opacity != null && opts.opacity < 1) {
    mat.transparent = true;
    mat.opacity = opts.opacity;
  }
  mat.userData.metersPerTile = opts.metersPerTile ?? 7;
  return mat;
}
