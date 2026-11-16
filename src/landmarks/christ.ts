import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  archSlab,
} from "./_shared";

export function createChrist(kit: SurfaceKit) {
  const root = new THREE.Group();
  const soap = mapped(kit.soapstone, {
    roughness: 0.58,
    metalness: 0.04,
    metersPerTile: 2.4,
    bumpScale: 0.32,
  });
  const soapDark = mapped(kit.soapstone, {
    color: 0xd8d2c4,
    roughness: 0.64,
    metersPerTile: 2.2,
    bumpScale: 0.28,
  });
  const shadow = stone(0xaaa396, 0.86);
  const rock = mapped(kit.machu, { color: 0xa09888, roughness: 0.92, metersPerTile: 5 });
  const dark = stone(0x3a342c, 0.9);

  // 1. Art Deco 礼拜堂基座与八角阶梯台基 (y = 0 ~ 14.5m)
  box(root, rock, 30, 1.2, 24, 0, 0, 0);
  box(root, rock, 28, 2.2, 22, 0, 1.2, 0);
  box(root, soapDark, 19, 1.0, 17, 0, 3.4, 0);
  box(root, soapDark, 15, 0.55, 15, 0, 4.4, 0);
  box(root, soapDark, 12.5, 7.4, 12.5, 0, 4.95, 0);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const arch = new THREE.Group();
    const opening = new THREE.Mesh(archSlab(3.6, 5.2, 1.4, 0.55), dark);
    opening.position.set(0, 5.65, -6.3);
    arch.add(opening);
    arch.rotation.y = yaw;
    root.add(arch);
  }
  for (const x of [-7.4, 7.4]) {
    box(root, soapDark, 0.85, 10.4, 0.85, x, 1.2, -7.8);
    box(root, soapDark, 0.85, 10.4, 0.85, x, 1.2, 7.8);
  }
  box(root, soapDark, 19, 0.65, 15, 0, 12.35, 0);
  box(root, soap, 17.5, 0.45, 13.8, 0, 13.0, 0);

  // 雕像脚下阶梯石阶台座
  box(root, soapDark, 11.2, 0.6, 9.6, 0, 13.45, 0);
  box(root, soapDark, 9.2, 0.5, 8.0, 0, 14.05, 0);

  // 2. 雄浑雕塑感长袍躯干 (y = 14.55 ~ 33.6m)
  // 按照人体与袍服黄金比例放宽胸膛与胯部，形成挺拔稳固的巨型石像体量
  const robePoints = [
    new THREE.Vector2(3.6, 0),     // 裙摆 y = 14.55, 宽达 8.5m
    new THREE.Vector2(3.45, 1.5),  // y = 16.05
    new THREE.Vector2(3.2, 4.8),   // y = 19.35
    new THREE.Vector2(2.95, 8.5),  // y = 23.05
    new THREE.Vector2(2.72, 12.2), // y = 26.75 (腰围)
    new THREE.Vector2(2.55, 15.6), // y = 30.15 (胸围)
    new THREE.Vector2(2.38, 18.2), // y = 32.75 (肩胛)
    new THREE.Vector2(1.85, 19.1), // y = 33.65 (颈根)
  ];
  const robe = new THREE.LatheGeometry(robePoints, 32);
  const body = new THREE.Mesh(robe, soap);
  body.scale.set(1.18, 1.0, 0.88);
  body.position.y = 14.55;
  root.add(body);

  // 袍身立体垂直褶皱（正面 6 道深影褶线，背面 5 道褶线）
  const frontFolds = [
    [[-2.4, 15.2, 2.7], [-1.9, 21.0, 2.8], [-1.3, 27.0, 2.5], [-0.85, 32.5, 2.0]],
    [[-1.5, 15.0, 3.2], [-1.2, 21.0, 3.1], [-0.7, 27.0, 2.7], [-0.35, 32.8, 2.1]],
    [[-0.5, 14.9, 3.3], [-0.35, 21.2, 3.2], [-0.15, 27.2, 2.75], [0.0, 33.0, 2.15]],
    [[0.5, 14.9, 3.3], [0.35, 21.2, 3.2], [0.15, 27.2, 2.75], [0.0, 33.0, 2.15]],
    [[1.5, 15.0, 3.2], [1.2, 21.0, 3.1], [0.7, 27.0, 2.7], [0.35, 32.8, 2.1]],
    [[2.4, 15.2, 2.7], [1.9, 21.0, 2.8], [1.3, 27.0, 2.5], [0.85, 32.5, 2.0]],
  ];
  for (const points of frontFolds) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.15, 6, false), shadow));
  }
  const backFolds = [
    [[-2.2, 15.2, -2.7], [-1.7, 21.0, -2.8], [-1.1, 27.0, -2.5], [-0.7, 32.5, -2.0]],
    [[-1.2, 15.0, -3.1], [-0.9, 21.0, -3.0], [-0.5, 27.0, -2.65], [-0.25, 32.8, -2.1]],
    [[0.0, 14.9, -3.2], [0.0, 21.2, -3.1], [0.0, 27.2, -2.7], [0.0, 33.0, -2.15]],
    [[1.2, 15.0, -3.1], [0.9, 21.0, -3.0], [0.5, 27.0, -2.65], [0.25, 32.8, -2.1]],
    [[2.2, 15.2, -2.7], [1.7, 21.0, -2.8], [1.1, 27.0, -2.5], [0.7, 32.5, -2.0]],
  ];
  for (const points of backFolds) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.13, 6, false), shadow));
  }

  // 胸前斜披斗篷折痕（经典圣像对角披帛线条）
  const mantleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.2, 33.2, 1.4),
    new THREE.Vector3(-1.2, 31.2, 2.0),
    new THREE.Vector3(0.0, 29.2, 2.35),
    new THREE.Vector3(1.2, 27.2, 2.45),
    new THREE.Vector3(2.3, 25.5, 2.3),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(mantleCurve, 20, 0.22, 8, false), soapDark));
  const mantleUpper = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.0, 33.5, 1.25),
    new THREE.Vector3(-1.0, 31.7, 1.85),
    new THREE.Vector3(0.1, 29.8, 2.2),
    new THREE.Vector3(1.4, 27.9, 2.3),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(mantleUpper, 16, 0.12, 6, false), shadow));

  // 3. 肩部与颈部（宽厚雄壮，与水平张开的双臂平顺过渡）
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.05, 3.6, 16), soap);
  neck.position.set(0, 34.6, 0.1);
  root.add(neck);

  for (const x of [-2.4, 2.4]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(1.85, 16, 12), soap);
    shoulder.scale.set(1.25, 0.85, 0.95);
    shoulder.position.set(x, 33.2, 0);
    root.add(shoulder);
  }

  // 4. 垂悬长袍广袖（重点优化：Art Deco 巨型垂袖几何体）
  // 右袖 (X > 0)
  const rightSleeveShape = new THREE.Shape();
  rightSleeveShape.moveTo(2.2, 33.5);
  rightSleeveShape.lineTo(12.2, 33.15); // 上沿平直微倾
  rightSleeveShape.lineTo(12.2, 29.6);  // 袖口垂落高度达 3.55m
  rightSleeveShape.bezierCurveTo(9.6, 27.2, 5.8, 25.8, 2.2, 25.2); // 优雅悬垂底缘回拢到躯干
  rightSleeveShape.lineTo(2.2, 33.5);

  // 左袖 (X < 0) 保证逆时针顶点序法线朝外
  const leftSleeveShape = new THREE.Shape();
  leftSleeveShape.moveTo(-2.2, 25.2);
  leftSleeveShape.bezierCurveTo(-5.8, 25.8, -9.6, 27.2, -12.2, 29.6);
  leftSleeveShape.lineTo(-12.2, 33.15);
  leftSleeveShape.lineTo(-2.2, 33.5);
  leftSleeveShape.lineTo(-2.2, 25.2);

  const sleeveExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 1.35,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.15,
    bevelSegments: 3,
  };

  const rightSleeveGeo = new THREE.ExtrudeGeometry(rightSleeveShape, sleeveExtrudeSettings);
  const rightSleeve = new THREE.Mesh(rightSleeveGeo, soap);
  rightSleeve.position.z = -0.675;
  root.add(rightSleeve);

  const leftSleeveGeo = new THREE.ExtrudeGeometry(leftSleeveShape, sleeveExtrudeSettings);
  const leftSleeve = new THREE.Mesh(leftSleeveGeo, soap);
  leftSleeve.position.z = -0.675;
  root.add(leftSleeve);

  // 上臂圆浑体量支撑（藏于长袍广袖顶部，赋予手臂饱满骨架感）
  for (const side of [-1, 1]) {
    const armCore = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 10.0, 16), soap);
    armCore.rotation.z = Math.PI / 2;
    armCore.position.set(side * 7.2, 33.1, 0);
    root.add(armCore);

    // 长袍广袖上的 Art Deco 垂直棱形风琴褶褶（正反两面共 16 条立体褶楞）
    const pleats = [
      { x: 4.4, yTop: 33.4, yBot: 26.0 },
      { x: 6.4, yTop: 33.3, yBot: 26.8 },
      { x: 8.4, yTop: 33.2, yBot: 27.8 },
      { x: 10.4, yTop: 33.15, yBot: 28.9 },
    ];
    for (const p of pleats) {
      const h = p.yTop - p.yBot;
      const cy = (p.yTop + p.yBot) / 2;
      // 正面棱纹
      const frontRib = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 4), soapDark);
      frontRib.rotation.y = Math.PI / 4;
      frontRib.position.set(side * p.x, cy, 0.76);
      root.add(frontRib);
      // 背面棱纹
      const backRib = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 4), soapDark);
      backRib.rotation.y = Math.PI / 4;
      backRib.position.set(side * p.x, cy, -0.76);
      root.add(backRib);
    }

    // 袖口镶边滚边与袖内深影
    box(root, soapDark, 0.48, 3.8, 1.85, side * 12.18, 29.5, 0);
    box(root, dark, 0.35, 3.2, 1.45, side * 12.35, 29.8, 0);

    // 5. 前臂与手腕（自宽广袖口自然伸出）
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 1.4, 16), soap);
    forearm.rotation.z = side * (Math.PI / 2);
    forearm.position.set(side * 12.8, 32.7, 0.02);
    root.add(forearm);

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.35, 14), soap);
    wrist.rotation.z = Math.PI / 2;
    wrist.position.set(side * 13.45, 32.7, 0.02);
    root.add(wrist);

    // 6. 庄严雕琢降福圣手（翼展精确达 30.0m，掌心向前倾微向上，五指分明有力）
    const palmGroup = new THREE.Group();
    palmGroup.position.set(side * 13.88, 32.65, 0.06);
    palmGroup.rotation.x = -0.14;        // 微向上仰面向世人降福
    palmGroup.rotation.y = side * 0.10;  // 掌心微朝内收
    palmGroup.rotation.z = side * -0.04;

    const palmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.38), soap);
    palmMesh.position.set(side * 0.12, 0, 0);
    palmGroup.add(palmMesh);

    // 大鱼际肌/掌丘饱满厚度
    const palmPad = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), soap);
    palmPad.scale.set(0.9, 1.3, 0.5);
    palmPad.position.set(side * 0.05, -0.15, 0.14);
    palmGroup.add(palmPad);

    // 四指（食、中、无名、小指）
    const fingerConfigs = [
      { y: 0.44, len: 1.25, thick: 0.16 }, // 食指
      { y: 0.15, len: 1.42, thick: 0.17 }, // 中指（最长，伸展至 15.0m 巅峰翼展）
      { y: -0.14, len: 1.28, thick: 0.16 }, // 无名指
      { y: -0.42, len: 1.08, thick: 0.15 }, // 小指
    ];
    for (const fc of fingerConfigs) {
      const fGroup = new THREE.Group();
      fGroup.position.set(side * 0.55, fc.y, 0.02);
      // 第一指节
      const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(fc.thick, fc.len * 0.55, 6, 8), soap);
      seg1.rotation.z = side * (Math.PI / 2);
      seg1.position.x = side * (fc.len * 0.28);
      fGroup.add(seg1);
      // 第二指节（微向前微曲，呈现雕塑自然弧度）
      const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(fc.thick * 0.88, fc.len * 0.45, 6, 8), soap);
      seg2.rotation.z = side * (Math.PI / 2);
      seg2.rotation.y = side * -0.08;
      seg2.position.set(side * (fc.len * 0.72), 0, 0.04);
      fGroup.add(seg2);
      palmGroup.add(fGroup);
    }

    // 拇指（向上、向前张开，大度端庄）
    const thumbGroup = new THREE.Group();
    thumbGroup.position.set(side * -0.20, 0.38, 0.12);
    thumbGroup.rotation.z = side * 0.65;
    thumbGroup.rotation.y = side * -0.28;
    const thumbSeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.75, 6, 8), soap);
    thumbSeg.rotation.z = side * (Math.PI / 2);
    thumbSeg.position.x = side * 0.38;
    thumbGroup.add(thumbSeg);
    palmGroup.add(thumbGroup);

    root.add(palmGroup);
  }

  // 7. 头部雕塑与庄严面庞 (y = 35.0 ~ 39.0m)
  // 依据真实救世基督像：去除突兀的头盔式发帽与浮空光环，采用纯粹一体的 Art Deco 中分雕塑长发与端庄五官
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.95, 24, 20), soap);
  head.scale.set(0.85, 1.15, 0.90);
  head.position.set(0, 36.8, 0.25);
  root.add(head);

  // 头部后脑与发冠雕塑体量（与面部同色材质，自然紧贴颅骨，绝非宽大头盔）
  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(1.92, 22, 16), soap);
  hairCrown.scale.set(0.86, 1.05, 0.92);
  hairCrown.position.set(0, 37.15, 0.12);
  root.add(hairCrown);

  // 经典 Art Deco 中分发线（自前额中央直通后脑勺的雅致微凹刻线）
  const partCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 38.15, 1.35),
    new THREE.Vector3(0, 38.95, 0.45),
    new THREE.Vector3(0, 38.65, -0.65),
    new THREE.Vector3(0, 37.2, -1.25),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(partCurve, 16, 0.08, 6, false), shadow));

  // 后颈波浪发体（向后下顺滑收束于颈背）
  const napeHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.8, 8, 10), soap);
  napeHair.rotation.x = 0.2;
  napeHair.position.set(0, 35.6, -0.75);
  root.add(napeHair);

  for (const side of [-1, 1]) {
    // 太阳穴侧发波浪（自然服帖于颅侧，修饰面颊轮廓）
    const templeWave = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.5, 6, 10), soap);
    templeWave.rotation.set(-0.2, 0, side * -0.15);
    templeWave.position.set(side * 1.35, 37.4, 0.55);
    root.add(templeWave);

    // 垂向两侧肩头的波浪长发绺（前绺与后绺自然垂落于锁骨与肩部）
    const frontLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 2.6, 6, 10), soap);
    frontLock.rotation.z = side * -0.05;
    frontLock.position.set(side * 1.48, 35.3, 0.52);
    root.add(frontLock);

    const backLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 2.8, 6, 10), soap);
    backLock.rotation.z = side * -0.04;
    backLock.position.set(side * 1.42, 35.4, -0.05);
    root.add(backLock);

    // 发绺间的阴影折线
    const lockGroove = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 1.42, 37.2, 0.4),
      new THREE.Vector3(side * 1.52, 35.5, 0.35),
      new THREE.Vector3(side * 1.58, 34.2, 0.3),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(lockGroove, 10, 0.06, 5, false), shadow));

    // 耳廓（半隐于侧发间）
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), soap);
    ear.scale.set(0.55, 1.0, 0.45);
    ear.position.set(side * 1.55, 36.8, 0.25);
    root.add(ear);

    // 深邃目光与眉弓
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), dark);
    eye.scale.set(1.25, 0.58, 0.4);
    eye.position.set(side * 0.55, 37.05, 1.76);
    root.add(eye);

    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.95, 37.35, 1.55),
      new THREE.Vector3(side * 0.55, 37.42, 1.72),
      new THREE.Vector3(side * 0.22, 37.38, 1.78),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(browCurve, 8, 0.08, 6, false), soapDark));
  }

  // Art Deco 挺拔山根鼻梁
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.05, 7), soap);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 36.65, 1.95);
  root.add(nose);

  // 庄重修整胡须与方正方颌胡子
  const moustache = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), soapDark);
  moustache.scale.set(1.25, 0.32, 0.32);
  moustache.position.set(0, 36.2, 1.82);
  root.add(moustache);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.1, 8), soapDark);
  beard.rotation.z = Math.PI;
  beard.scale.set(0.9, 1.0, 0.6);
  beard.position.set(0, 35.15, 1.25);
  root.add(beard);

  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.35, 36.0, 1.78),
    new THREE.Vector3(0, 35.95, 1.86),
    new THREE.Vector3(0.35, 36.0, 1.78),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 8, 0.05, 5, false), shadow));

  return root;
}

