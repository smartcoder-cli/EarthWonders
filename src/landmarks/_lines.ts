import * as THREE from "three";

interface LandmarkLinePalette {
  color: number;
  opacity: number;
  thresholdAngle: number;
  minDiagonal?: number;
}

const LANDMARK_LINE_PALETTES: Record<string, LandmarkLinePalette> = {
  giza: {
    color: 0x3d2b1a, // 埃及暖赭石深影缝隙色
    opacity: 0.88,
    thresholdAngle: 24,
    minDiagonal: 0.8,
  },
  wall: {
    color: 0x221e1a, // 明长城灰砖青苔勾缝深色
    opacity: 0.84,
    thresholdAngle: 22,
    minDiagonal: 0.7,
  },
  petra: {
    color: 0x381812, // 佩特拉纳巴泰红砂岩深渊裂谷暗红深色
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.6,
  },
  colosseum: {
    color: 0x34291c, // 罗马白灰华石千年风化阴影线
    opacity: 0.82,
    thresholdAngle: 24,
    minDiagonal: 0.8,
  },
  chichen: {
    color: 0x2c271e, // 玛雅雨林石灰岩苍老刻线
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.7,
  },
  machu: {
    color: 0x222629, // 安第斯山脉花岗岩玄武岩冷深刻线
    opacity: 0.84,
    thresholdAngle: 22,
    minDiagonal: 0.6,
  },
  taj: {
    color: 0x3e4950, // 莫卧儿白色大理石雕凿清冷灰蓝阴影线
    opacity: 0.72,
    thresholdAngle: 24,
    minDiagonal: 0.8,
  },
  christ: {
    color: 0x30383d, // 里约基督像滑石马赛克折纸风立体衣褶线
    opacity: 0.78,
    thresholdAngle: 24,
    minDiagonal: 0.6,
  },
  pentagon: {
    color: 0x243248, // 五角大楼混凝土分格线
    opacity: 0.8,
    thresholdAngle: 25,
    minDiagonal: 1.0,
  },
  fast: {
    color: 0x1f3c55, // 中国天眼钢结构圈梁与桁架线
    opacity: 0.75,
    thresholdAngle: 20,
    minDiagonal: 1.0,
  },
  burj: {
    color: 0x334155, // 哈利法塔竖向幕墙棱线
    opacity: 0.8,
    thresholdAngle: 22,
    minDiagonal: 1.5,
  },
  apple: {
    color: 0x1e293b, // 苹果总部极简主义深色幕墙与纯白悬挑水平线
    opacity: 0.75,
    thresholdAngle: 24,
    minDiagonal: 1.0,
  },
  sydney: {
    color: 0x334155, // 悉尼歌剧院建筑素描深板岩素雅轮廓线
    opacity: 0.72,
    thresholdAngle: 25,
    minDiagonal: 0.8,
  },
  globalcenter: {
    color: 0x0369a1, // 成都环球中心海鸥波浪挑檐与幕墙分格锐利深蓝轮廓线
    opacity: 0.85,
    thresholdAngle: 22,
    minDiagonal: 1.0,
  },
  hzmb: {
    color: 0x1e293b, // 港珠澳大桥斜拉索塔与人工岛外围护岸轮廓线
    opacity: 0.85,
    thresholdAngle: 20,
    minDiagonal: 1.0,
  },
  goldengate: {
    color: 0x7c2d12, // 金门大桥国际橘钢桁架与主缆深影轮廓线
    opacity: 0.88,
    thresholdAngle: 22,
    minDiagonal: 1.0,
  },
  svalbard: {
    color: 0x0f172a, // 斯瓦尔巴末日种子库混凝土入口巨石楔形棱角与极地岩层锐利刻线
    opacity: 0.92,
    thresholdAngle: 18,
    minDiagonal: 0.4,
  },
  liberty: {
    color: 0x164e3f, // 自由女神像氧化铜绿折线与古典星形要塞深影轮廓线
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.5,
  },
  defense: {
    color: 0x1e293b, // 拉德芳斯新凯旋门超立方体白色大理石边线与幕墙分格锐线
    opacity: 0.88,
    thresholdAngle: 20,
    minDiagonal: 0.8,
  },
  eiffel: {
    color: 0x5c4218, // 埃菲尔铁塔熟铁格构与三层观景台深影轮廓线
    opacity: 0.88,
    thresholdAngle: 20,
    minDiagonal: 0.6,
  },
  parthenon: {
    color: 0x573b18, // 雅典帕特农神庙多立克柱凹槽与三角楣大理石轮廓线
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.5,
  },
  futuremuseum: {
    color: 0x0f172a, // 迪拜未来博物馆不锈钢曲面分格与斜撑桁架锐线
    opacity: 0.90,
    thresholdAngle: 18,
    minDiagonal: 0.6,
  },
  sagrada: {
    color: 0x452306, // 圣家堂蜂巢钟楼、自然主义立面与树状柱分枝深影线条
    opacity: 0.88,
    thresholdAngle: 20,
    minDiagonal: 0.5,
  },
  himeji: {
    color: 0x1e242d, // 姬路城黑瓦当瓦垄与纯白漆喰反曲飞檐深影轮廓线
    opacity: 0.86,
    thresholdAngle: 22,
    minDiagonal: 0.5,
  },
};


const _lineMaterialCache = new Map<string, THREE.LineBasicMaterial>();

function getLineMaterial(color: number, opacity: number): THREE.LineBasicMaterial {
  const key = `${color}_${opacity}`;
  let mat = _lineMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.LineBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
    });
    _lineMaterialCache.set(key, mat);
  }
  return mat;
}

const _calcBox = new THREE.Box3();
const _calcSize = new THREE.Vector3();

export function attachLandmarkLines(root: THREE.Group, wonderId: string) {
  const palette = LANDMARK_LINE_PALETTES[wonderId];
  if (!palette) return root;

  const lineMat = getLineMaterial(palette.color, palette.opacity);
  const minDiag = palette.minDiagonal ?? 0.6;
  const threshold = palette.thresholdAngle;

  const candidates: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return;
    if (mesh.userData?.skipLines) return;
    candidates.push(mesh);
  });

  for (const mesh of candidates) {
    const geo = mesh.geometry;
    if (!geo || !geo.getAttribute("position")) continue;

    _calcBox.setFromBufferAttribute(geo.getAttribute("position") as THREE.BufferAttribute);
    _calcBox.getSize(_calcSize);
    if (_calcSize.length() < minDiag) continue;

    if (!geo.userData) geo.userData = {};
    let edgesGeo = geo.userData._edgesGeo as THREE.EdgesGeometry | undefined;
    if (!edgesGeo) {
      edgesGeo = new THREE.EdgesGeometry(geo, threshold);
      geo.userData._edgesGeo = edgesGeo;
    }

    if (edgesGeo.getAttribute("position") && edgesGeo.getAttribute("position").count > 0) {
      const line = new THREE.LineSegments(edgesGeo, lineMat);
      line.renderOrder = 1;
      mesh.add(line);
    }
  }

  return root;
}
