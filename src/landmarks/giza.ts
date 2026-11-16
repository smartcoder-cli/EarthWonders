import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  stone,
  box,
  cyl,
  pyramidGeo,
  frustumGeo,
  templeCourt,
  coursedPyramid,
} from "./_shared";

export function createGiza(kit: SurfaceKit) {
  const root = new THREE.Group();
  const lime = mapped(kit.pyramid, { roughness: 0.88, metersPerTile: 8, bumpScale: 0.55 });
  const aged = mapped(kit.pyramid, { color: 0xe8c080, roughness: 0.9, metersPerTile: 7 });
  const pale = mapped(kit.tura, { roughness: 0.62, metersPerTile: 6, bumpScale: 0.12 });
  const sand = mapped(kit.desert, { roughness: 0.96, metersPerTile: 14, bumpScale: 0.22 });
  const sphinxMat = mapped(kit.pyramid, { color: 0xe2c070, roughness: 0.86, metersPerTile: 5 });
  const khafreMat = mapped(kit.pyramid, { color: 0xf0d090, roughness: 0.86, metersPerTile: 8 });
  const menkaureMat = mapped(kit.pyramid, { color: 0xe8c070, roughness: 0.88, metersPerTile: 6 });

  coursedPyramid(root, lime, 230.3, 138.8, 26, 0, 0);
  for (let i = 0; i < 3; i++) {
    const s = 230.3 - i * 6.4;
    const layer = new THREE.Mesh(frustumGeo(s, s - 5.2, 1.35), pale);
    layer.position.y = i * 1.38;
    root.add(layer);
  }
  box(root, stone(0x3a2a18, 0.95), 3.6, 5.4, 8.5, 0, 16, -112);
  templeCourt(root, aged, sand, 52, 40, 148, 0);
  box(root, aged, 8, 2.2, 118, 78, 0, 0);

  const khafreX = -325;
  const khafreZ = -344;
  const khafreBase = new THREE.Mesh(new THREE.BoxGeometry(215.3, 10, 215.3), aged);
  khafreBase.position.set(khafreX, 5, khafreZ);
  root.add(khafreBase);
  coursedPyramid(root, khafreMat, 215.3, 136.4, 24, khafreX, khafreZ, 10);
  const khafreCap = new THREE.Mesh(pyramidGeo(48, 28), pale);
  khafreCap.position.set(khafreX, 10 + 136.4 - 16, khafreZ);
  root.add(khafreCap);
  box(root, aged, 9, 3.2, 210, khafreX + 118, 10, khafreZ + 40);

  const menkaureX = -566;
  const menkaureZ = -746;
  coursedPyramid(root, menkaureMat, 102.2, 65, 16, menkaureX, menkaureZ);
  for (const [dx, s] of [
    [-32, 31.5],
    [2, 31.2],
    [36, 21.7],
  ] as const) {
    coursedPyramid(root, aged, s, s * 0.62, 8, menkaureX + dx, menkaureZ - 78);
  }

  for (const [x, s] of [
    [-18, 45.5],
    [29, 47.4],
    [76, 43.7],
  ] as const) {
    coursedPyramid(root, aged, s, s * 0.62, 8, x, -148);
  }

  for (const [dx, dz] of [
    [-40, 128],
    [40, 128],
    [-40, 148],
    [40, 148],
  ] as const) {
    box(root, stone(0x6a5438, 0.96), 48, 0.7, 6.4, dx, -0.15, dz);
  }

  // 狮身人面像（Great Sphinx of Giza）：按埃及吉萨实景重构法老尼姆斯头巾、巨爪、记梦碑与围岩地基
  const sphinx = new THREE.Group();

  // 采石围坑岩壁（Sphinx Enclosure Trench Walls）
  const trenchMat = mapped(kit.pyramid, { color: 0xc8a46e, roughness: 0.94, metersPerTile: 6 });
  box(sphinx, trenchMat, 38, 7.5, 3.5, 0, 0, -42); // 后岩壁
  box(sphinx, trenchMat, 3.5, 6.8, 92, -18, 0, 4); // 左侧岩壁
  box(sphinx, trenchMat, 3.5, 6.8, 92, 18, 0, 4);  // 右侧岩壁

  // 狮身后臀与躯干
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(12.5, 18, 14), sphinxMat);
  haunch.scale.set(1.25, 0.82, 1.45);
  haunch.position.set(0, 10.2, -18);
  sphinx.add(haunch);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(9.6, 32, 10, 16), sphinxMat);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1.15, 1.0, 0.88);
  body.position.set(0, 10.4, 3);
  sphinx.add(body);

  // 狮子后腿侧肌肉
  box(sphinx, sphinxMat, 8.5, 7.8, 12, -9.2, 0, -22);
  box(sphinx, sphinxMat, 8.5, 7.8, 12, 9.2, 0, -22);

  // 卷曲尾巴（盘在右侧臀旁）
  const tail = new THREE.Mesh(new THREE.TorusGeometry(8.8, 1.15, 8, 16, Math.PI * 0.75), sphinxMat);
  tail.rotation.set(Math.PI / 2, 0, Math.PI / 5);
  tail.position.set(8.8, 8.4, -28);
  sphinx.add(tail);

  // 狮子雄伟前胸
  box(sphinx, sphinxMat, 17.5, 16.5, 14, 0, 12.0, 28);

  // 伸展前爪（长达 18 米的巨型石砌双爪与爪趾）
  for (const side of [-1, 1]) {
    // 粗壮前臂
    box(sphinx, sphinxMat, 5.8, 5.2, 22, side * 7.5, 0, 31);
    // 爪端掌心
    box(sphinx, sphinxMat, 5.2, 4.4, 8, side * 7.5, 0, 46);
    // 三根分明的狮爪趾
    for (const claw of [-1.6, 0, 1.6]) {
      const digit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 4.8), sphinxMat);
      digit.position.set(side * 7.5 + claw, 1.4, 52.2);
      sphinx.add(digit);
    }
  }

  // 双爪间的法老记梦碑（Dream Stele of Thutmose IV）
  const steleMat = mapped(kit.pyramid, { color: 0x9b5d45, roughness: 0.82 }); // 红色花岗岩
  const stele = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6.5, 0.85), steleMat);
  stele.position.set(0, 3.25, 42.5);
  sphinx.add(stele);
  const steleTop = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.85, 16), steleMat);
  steleTop.rotation.x = Math.PI / 2;
  steleTop.position.set(0, 6.5, 42.5);
  sphinx.add(steleTop);

  // 法老头部与尼姆斯头巾（Nemes Headdress）
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.8, 6.2, 16), sphinxMat);
  neck.position.set(0, 20.5, 33);
  sphinx.add(neck);

  // 头颅主体
  const head = new THREE.Mesh(new THREE.SphereGeometry(6.2, 20, 16), pale);
  head.scale.set(0.9, 1.15, 0.88);
  head.position.set(0, 26.2, 34);
  sphinx.add(head);

  // 尼姆斯头巾顶部圆弧包覆与额头圣蛇
  const nemesTop = new THREE.Mesh(new THREE.SphereGeometry(6.6, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), sphinxMat);
  nemesTop.scale.set(0.96, 1.12, 0.94);
  nemesTop.position.set(0, 26.8, 33.6);
  sphinx.add(nemesTop);

  // 额头王权圣蛇（Uraeus）
  const uraeus = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 6), stone(0xc9a84c, 0.4));
  uraeus.rotation.x = Math.PI / 4;
  uraeus.position.set(0, 31.8, 39.5);
  sphinx.add(uraeus);

  // 尼姆斯头巾垂落双肩的两侧宽翼折巾（Lappets）
  for (const side of [-1, 1]) {
    const lappet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 14.5, 3.6), sphinxMat);
    lappet.rotation.z = side * -0.08;
    lappet.position.set(side * 6.5, 21.0, 36.2);
    sphinx.add(lappet);

    // 巾带条纹棱
    for (let h = 0; h < 5; h++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 3.8), stone(0x3a2e22, 0.85));
      stripe.position.set(side * 6.5, 15.5 + h * 2.4, 36.2);
      sphinx.add(stripe);
    }
  }

  // 庄严法老面容
  const pharaohNose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.4, 6), pale);
  pharaohNose.rotation.x = Math.PI / 2;
  pharaohNose.position.set(0, 26.2, 39.8);
  sphinx.add(pharaohNose);

  const pharaohEyes = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), stone(0x2a1c12, 0.6));
  pharaohEyes.scale.set(1.4, 0.7, 0.5);
  pharaohEyes.position.set(-2.2, 27.2, 39.2);
  const pharaohEyesR = pharaohEyes.clone();
  pharaohEyesR.position.x = 2.2;
  sphinx.add(pharaohEyes, pharaohEyesR);

  // 仪式假胡须残存底座
  box(sphinx, sphinxMat, 2.2, 3.4, 1.8, 0, 20.8, 38.6);

  // 狮身人面像神庙遗址门廊（Sphinx Temple Ruins in front of paws）
  const templeMat = mapped(kit.pyramid, { color: 0xd8b276, roughness: 0.92 });
  box(sphinx, templeMat, 32, 4.5, 18, 0, 0, 68);
  for (const px of [-12, -4, 4, 12]) {
    for (const pz of [62, 74]) {
      cyl(sphinx, templeMat, 1.2, 1.4, 6.2, px, 0, pz, 8);
    }
  }

  sphinx.position.set(345, 0, -436);
  sphinx.rotation.y = Math.PI / 2;
  root.add(sphinx);
  templeCourt(root, aged, sand, 36, 28, 410, -436);
  return root;
}

