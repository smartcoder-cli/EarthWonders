import * as THREE from "three";
import { mapped, type SurfaceKit } from "../surfaces";
import {
  box,
  cyl,
  pyramidGeo,
  onionLathe,
  column,
} from "./_shared";

export function createPetra(kit: SurfaceKit) {
  const root = new THREE.Group();
  const cliff = mapped(kit.petra, { color: 0xc07060, roughness: 0.97, metersPerTile: 7, bumpScale: 0.7 });
  const sand = mapped(kit.petra, { roughness: 0.86, metersPerTile: 5.5, bumpScale: 0.45 });
  const sandLight = mapped(kit.petra, { color: 0xffc8b0, roughness: 0.82, metersPerTile: 4.5 });
  const dark = mapped(kit.petra, { color: 0x6a3028, roughness: 0.93, metersPerTile: 4 });
  const band = mapped(kit.petra, { color: 0xd08058, roughness: 0.95, metersPerTile: 8, bumpScale: 0.8 });

  box(root, cliff, 92, 96, 30, 0, 0, 22);
  box(root, cliff, 38, 110, 44, -62, 0, 14);
  box(root, cliff, 38, 104, 44, 62, 0, 16);
  for (const [x, h, z] of [
    [-46, 18, 18],
    [-22, 28, 20],
    [8, 16, 18],
    [32, 24, 20],
    [50, 14, 16],
  ] as const) {
    box(root, cliff, 16, h, 12, x, 88, z);
  }
  for (let i = 0; i < 8; i++) {
    box(root, band, 88, 1.1, 2.2, 0, 8 + i * 9.5, -1.6);
  }

  box(root, sand, 28, 24, 6.4, 0, 2.4, -4);
  for (let i = 0; i < 12; i++) {
    box(root, sandLight, 26 - i * 0.15, 0.22, 4.8, 0, i * 0.2, -7.4);
  }
  for (let i = 0; i < 6; i++) {
    const x = -12.5 + i * 5;
    column(root, sandLight, 18.5, 0.95, x, 4.6, -7.2);
    // Fine, shallow vertical grooves on the visible face suggest hand-carved fluting.
    for (let flute = -2; flute <= 2; flute++) {
      box(root, band, 0.055, 12.8, 0.045, x + flute * 0.24, 7.0, -8.13);
    }
  }
  // Repeated shallow relief blocks along the entablature add the rhythmic carved
  // ornament visible on Nabataean rock-cut façades without overwhelming the silhouette.
  for (let i = 0; i < 13; i++) {
    const x = -12.0 + i * 2.0;
    box(root, band, 0.72, 1.05, 0.38, x, 23.35, -7.72);
    box(root, sandLight, 0.9, 0.16, 0.48, x, 24.0, -7.76);
  }
  box(root, sand, 27.5, 1.8, 6, 0, 23.2, -4.6);
  box(root, sand, 27.5, 0.9, 5.8, 0, 25, -4.6);
  box(root, dark, 6.4, 11.5, 2.2, 0, 4.8, -7.6);
  const doorPed = new THREE.Mesh(pyramidGeo(8.4, 2.8), sand);
  doorPed.position.set(0, 16.6, -7.2);
  doorPed.scale.set(1, 1, 0.16);
  root.add(doorPed);
  box(root, dark, 3.8, 7.2, 1.5, -9.2, 5.2, -7.4);
  box(root, dark, 3.8, 7.2, 1.5, 9.2, 5.2, -7.4);

  const ped = new THREE.Mesh(pyramidGeo(16, 5.2), sand);
  ped.position.set(0, 26.2, -4.2);
  ped.scale.set(1, 1, 0.18);
  root.add(ped);

  box(root, sand, 11.5, 12, 5.4, -11.2, 27.2, -3.8);
  box(root, sand, 11.5, 12, 5.4, 11.2, 27.2, -3.8);
  const leftPed = new THREE.Mesh(pyramidGeo(12, 4.6), sand);
  leftPed.position.set(-11.2, 39.2, -3.8);
  leftPed.scale.set(1, 1, 0.18);
  root.add(leftPed);
  const rightPed = new THREE.Mesh(pyramidGeo(12, 4.6), sand);
  rightPed.position.set(11.2, 39.2, -3.8);
  rightPed.scale.set(1, 1, 0.18);
  root.add(rightPed);
  box(root, dark, 3.2, 6.4, 1.3, -11.2, 28.4, -6.4);
  box(root, dark, 3.2, 6.4, 1.3, 11.2, 28.4, -6.4);
  const aedL = new THREE.Mesh(pyramidGeo(4.4, 1.6), sand);
  aedL.position.set(-11.2, 35, -6.2);
  aedL.scale.set(1, 1, 0.2);
  root.add(aedL);
  const aedR = aedL.clone();
  aedR.position.x = 11.2;
  root.add(aedR);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    column(root, sandLight, 10.5, 0.55, Math.cos(a) * 4.4, 27.2, -5.6 + Math.sin(a) * 1.4);
  }
  cyl(root, sand, 4.4, 4.4, 10.5, 0, 27.2, -5.6, 18);
  const tholos = new THREE.Mesh(onionLathe(5.2, 8.2, 20), sandLight);
  tholos.position.set(0, 37.8, -5.6);
  root.add(tholos);
  cyl(root, sandLight, 0.55, 0.9, 2.8, 0, 45.8, -5.6, 8);
  const urn = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), sandLight);
  urn.position.set(0, 49.4, -5.6);
  root.add(urn);
  cyl(root, sandLight, 0.35, 0.55, 1.4, 0, 50.4, -5.6, 8);

  box(root, sand, 18, 1.2, 22, 0, 0, -18);
  return root;
}

