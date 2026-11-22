import * as THREE from "three";
import { finishSurfaces, type SurfaceKit } from "../surfaces";
import { attachLandmarkLines } from "./_lines";

export { attachLandmarkLines } from "./_lines";
export * from "./_shared";

export type LandmarkBuilder = (kit: SurfaceKit) => THREE.Group;

export function withMeterUvs(id: string, build: (kit: SurfaceKit) => THREE.Group): LandmarkBuilder {
  return (kit: SurfaceKit) => {
    const group = build(kit);
    finishSurfaces(group, 7);
    attachLandmarkLines(group, id);
    return group;
  };
}

/**
 * 23 座地标的动态 import 加载器定义。
 * 每一个地标均为独立代码块（Chunk），按需下载并执行。
 */
export const LANDMARK_LOADERS: Record<string, () => Promise<LandmarkBuilder>> = {
  giza: async () => withMeterUvs("giza", (await import("./giza")).createGiza),
  wall: async () => withMeterUvs("wall", (await import("./wall")).createGreatWall),
  petra: async () => withMeterUvs("petra", (await import("./petra")).createPetra),
  colosseum: async () => withMeterUvs("colosseum", (await import("./colosseum")).createColosseum),
  chichen: async () => withMeterUvs("chichen", (await import("./chichen")).createChichenItza),
  machu: async () => withMeterUvs("machu", (await import("./machu")).createMachuPicchu),
  taj: async () => withMeterUvs("taj", (await import("./taj")).createTajMahal),
  christ: async () => withMeterUvs("christ", (await import("./christ")).createChrist),
  pentagon: async () => withMeterUvs("pentagon", (await import("./pentagon")).createPentagon),
  fast: async () => withMeterUvs("fast", (await import("./fast")).createFastTelescope),
  burj: async () => withMeterUvs("burj", (await import("./burj")).createBurjKhalifa),
  apple: async () => withMeterUvs("apple", (await import("./apple")).createApplePark),
  sydney: async () => withMeterUvs("sydney", (await import("./sydney")).createSydneyOperaHouse),
  globalcenter: async () => withMeterUvs("globalcenter", (await import("./globalcenter")).createChengduGlobalCenter),
  hzmb: async () => withMeterUvs("hzmb", (await import("./hzmb")).createHZMB),
  goldengate: async () => withMeterUvs("goldengate", (await import("./goldengate")).createGoldenGateBridge),
  svalbard: async () => withMeterUvs("svalbard", (await import("./svalbard")).createSvalbardSeedVault),
  liberty: async () => withMeterUvs("liberty", (await import("./liberty")).createStatueOfLiberty),
  defense: async () => withMeterUvs("defense", (await import("./defense")).createGrandeArche),
  eiffel: async () => withMeterUvs("eiffel", (await import("./eiffel")).createEiffelTower),
  parthenon: async () => withMeterUvs("parthenon", (await import("./parthenon")).createParthenon),
  futuremuseum: async () => withMeterUvs("futuremuseum", (await import("./futuremuseum")).createMuseumOfTheFuture),
  sagrada: async () => withMeterUvs("sagrada", (await import("./sagrada")).createSagradaFamilia),
  himeji: async () => withMeterUvs("himeji", (await import("./himeji")).createHimeji),
};

const _builderCache = new Map<string, LandmarkBuilder>();

/**
 * 异步按需加载单个地标的构建器（带内存缓存）
 */
export async function loadLandmarkBuilder(id: string): Promise<LandmarkBuilder | undefined> {
  if (_builderCache.has(id)) {
    return _builderCache.get(id);
  }
  const loader = LANDMARK_LOADERS[id];
  if (!loader) return undefined;
  const builder = await loader();
  _builderCache.set(id, builder);
  return builder;
}

/**
 * 预加载所有地标模块
 */
export async function preloadAllLandmarks(): Promise<void> {
  const ids = Object.keys(LANDMARK_LOADERS);
  await Promise.all(ids.map((id) => loadLandmarkBuilder(id)));
}
