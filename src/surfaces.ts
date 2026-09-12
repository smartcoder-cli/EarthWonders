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
};

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

/**
 * 按米为单位投影 UV，避免锥体 / 挤出面把砖缝拉成梯形。
 * 几何先转非索引，再按主法线做平面投影。
 */
export function applyMeterUvs(geometry: THREE.BufferGeometry, metersPerTile = 7) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  geo.computeVertexNormals();
  const pos = geo.getAttribute("position");
  const nrm = geo.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  const scale = 1 / metersPerTile;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    const nz = Math.abs(nrm.getZ(i));
    if (ny >= nx && ny >= nz) {
      uv[i * 2] = x * scale;
      uv[i * 2 + 1] = z * scale;
    } else if (nx >= nz) {
      uv[i * 2] = z * scale;
      uv[i * 2 + 1] = y * scale;
    } else {
      uv[i * 2] = x * scale;
      uv[i * 2 + 1] = y * scale;
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

export function finishSurfaces<T extends THREE.Object3D>(root: T, metersPerTile = 7): T {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = applyMeterUvs(mesh.geometry, metersPerTile);
  });
  return root;
}

export function mapped(
  source: THREE.Texture,
  _repeatX: number | { color?: number; roughness?: number; metalness?: number } = 1,
  _repeatY?: number,
  options?: { color?: number; roughness?: number; metalness?: number },
) {
  const opts = typeof _repeatX === "object" ? _repeatX : (options ?? {});
  const map = source.clone();
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(1, 1);
  map.anisotropy = 8;
  map.needsUpdate = true;
  const roughness = opts.roughness ?? 0.88;
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: roughness < 0.55 ? 0.12 : 0.42,
    color: opts.color ?? 0xffffff,
    roughness,
    metalness: opts.metalness ?? 0.03,
  });
}
