import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  type Mat,
  box,
  gableRoofGeo,
  trapDoorGeo,
  incaHouse,
} from "./_shared";

function terraceBand(
  parent: THREE.Object3D,
  material: Mat,
  width: number,
  depth: number,
  y: number,
  z: number,
  bulge = 0,
) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  shape.moveTo(-hw, -hd);
  shape.quadraticCurveTo(0, -hd - bulge, hw, -hd);
  shape.lineTo(hw, hd);
  shape.quadraticCurveTo(0, hd + bulge * 0.4, -hw, hd);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, y, z);
  parent.add(mesh);
}

/** 马丘比丘：梯田、梯形门窗、茅草双坡、太阳神庙与因蒂瓦塔纳。 */
export function createMachuPicchu(kit: SurfaceKit) {
  const root = new THREE.Group();
  const grass = mapped(kit.grass, { roughness: 0.98, metersPerTile: 9, bumpScale: 0.2 });
  const grass2 = mapped(kit.grass, { color: 0xc8e0a0, roughness: 0.97, metersPerTile: 8 });
  const rock = mapped(kit.machu, { roughness: 0.92, metersPerTile: 4.2, bumpScale: 0.55 });
  const roof = mapped(kit.thatch, { roughness: 0.9, metersPerTile: 2.4, bumpScale: 0.5 });
  const dark = mapped(kit.machu, { color: 0x505040, roughness: 0.96, metersPerTile: 3 });
  const peak = mapped(kit.machu, { color: 0x90a080, roughness: 0.96, metersPerTile: 10 });

  for (let i = 0; i < 8; i++) {
    terraceBand(root, i % 2 === 0 ? grass : grass2, 112 - i * 7, 16, i * 2.7, 40 - i * 4.8, 8 - i);
    box(root, rock, 112 - i * 7, 1.6, 0.7, 0, i * 2.7, 40 - i * 4.8 + 8);
  }
  box(root, grass, 46, 1.0, 30, 2, 19.2, 2);

  incaHouse(root, rock, roof, dark, 14, 10, 6.8, -26, 12, 0.1);
  incaHouse(root, rock, roof, dark, 11, 9, 6.2, -10, 18, -0.16);
  incaHouse(root, rock, roof, dark, 16, 11, 7.4, 14, 12, 0.2);
  incaHouse(root, rock, roof, dark, 10, 8, 5.8, 30, 18, -0.26);
  incaHouse(root, rock, roof, dark, 12, 9, 6.4, 6, -4, 0.08);
  incaHouse(root, rock, roof, dark, 9, 7.5, 5.4, -34, 24, 0.38);
  incaHouse(root, rock, roof, dark, 13, 10, 6.6, -18, -10, -0.12);
  incaHouse(root, rock, roof, dark, 8.5, 7.5, 5.2, 26, -8, 0.28);
  incaHouse(root, rock, roof, dark, 11, 8.5, 6, -4, 22, 0.05);
  incaHouse(root, rock, roof, dark, 12, 9, 6.2, 18, 4, -0.1);
  incaHouse(root, rock, roof, dark, 10, 8, 5.8, -14, 6, 0.16);
  incaHouse(root, rock, roof, dark, 9, 8, 5.4, 4, 8, -0.2);

  const sun = new THREE.Group();
  const curve = new THREE.Mesh(
    new THREE.CylinderGeometry(6.4, 6.8, 7.2, 22, 1, false, 0, Math.PI * 1.2),
    rock,
  );
  curve.position.set(0, 3.6, 0);
  sun.add(curve);
  const win = new THREE.Mesh(trapDoorGeo(1.8, 1.2, 2.4, 0.5), dark);
  win.position.set(0, 3.2, -6.4);
  sun.add(win);
  box(sun, rock, 8, 2.2, 8, 0, 0, 1.5);
  sun.position.set(-8, 19.4, -22);
  root.add(sun);

  const three = new THREE.Group();
  box(three, rock, 16, 7.2, 1.8, 0, 0, 0);
  for (const x of [-5.2, 0, 5.2]) {
    const w = new THREE.Mesh(trapDoorGeo(2.6, 1.8, 3.6, 0.5), dark);
    w.position.set(x, 1.6, -0.7);
    three.add(w);
  }
  const threeRoof = new THREE.Mesh(gableRoofGeo(17, 8, 5.2), roof);
  threeRoof.position.set(0, 7.2, 2.4);
  three.add(threeRoof);
  three.position.set(10, 19.4, -20);
  root.add(three);

  const inti = new THREE.Group();
  box(inti, rock, 14, 2.2, 14, 0, 0, 0);
  box(inti, rock, 10, 2.0, 10, 0, 2.2, 0);
  box(inti, rock, 6.5, 1.6, 6.5, 0, 4.2, 0);
  box(inti, rock, 2.4, 1.8, 2.4, 0, 5.8, 0);
  box(inti, rock, 0.9, 1.4, 0.9, 0, 7.6, 0);
  inti.position.set(8, 19.4, -6);
  root.add(inti);

  const huayna = new THREE.Group();
  huayna.add(new THREE.Mesh(new THREE.ConeGeometry(34, 92, 8), peak));
  const shoulder = new THREE.Mesh(new THREE.ConeGeometry(20, 46, 6), peak);
  shoulder.position.set(-16, -6, 10);
  huayna.add(shoulder);
  const knoll = new THREE.Mesh(new THREE.SphereGeometry(15, 10, 8), peak);
  knoll.scale.set(1.35, 0.52, 1);
  knoll.position.set(12, -26, 8);
  huayna.add(knoll);
  huayna.position.set(10, 56, -94);
  root.add(huayna);
  return root;
}

