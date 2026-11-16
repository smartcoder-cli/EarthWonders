import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  pyramidGeo,
  frustumGeo,
  onionLathe,
  pointedArchShape,
  roundArchShape,
  trapWallGeo,
  chamferPrism,
  gableRoofGeo,
  ellipseShape,
  ring,
  partialRing,
  extrudeY,
} from "../src/landmarks/_shared";

describe("Procedural Geometry Helpers", () => {
  it("pyramidGeo creates valid finite geometry without NaN", () => {
    const geo = pyramidGeo(100, 60);
    const pos = geo.getAttribute("position");
    expect(pos).toBeDefined();
    expect(pos.count).toBeGreaterThan(0);

    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
    }

    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.max.y).toBeCloseTo(60, 1);
    expect(box.min.y).toBeCloseTo(0, 1);
  });

  it("frustumGeo creates valid truncated pyramid with indices and normals", () => {
    const geo = frustumGeo(80, 40, 50);
    expect(geo.index).toBeDefined();
    expect(geo.getAttribute("normal")).toBeDefined();

    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.max.y).toBeCloseTo(50, 1);
    expect(box.min.y).toBeCloseTo(0, 1);
  });

  it("onionLathe generates smooth revolving dome geometry", () => {
    const geo = onionLathe(20, 35, 16);
    expect(geo.getAttribute("position").count).toBeGreaterThan(50);
    geo.computeBoundingBox();
    expect(geo.boundingBox!.max.y).toBeGreaterThan(30);
  });

  it("chamferPrism produces octagonal chamfered cross-section", () => {
    const geo = chamferPrism(50, 60, 5);
    geo.computeBoundingBox();
    const size = geo.boundingBox!.getSize(new THREE.Vector3());
    expect(size.y).toBeCloseTo(60, 1);
    expect(size.x).toBeCloseTo(50, 1);
    expect(size.z).toBeCloseTo(50, 1);
  });

  it("gableRoofGeo produces triangular prism roof geometry", () => {
    const geo = gableRoofGeo(40, 80, 15);
    geo.computeBoundingBox();
    const size = geo.boundingBox!.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(40, 1);
    expect(size.y).toBeCloseTo(15, 1);
    expect(size.z).toBeCloseTo(80, 1);
  });

  it("trapWallGeo creates trapezoidal tapered wall", () => {
    const geo = trapWallGeo(100, 30, 20, 10);
    geo.computeBoundingBox();
    const size = geo.boundingBox!.getSize(new THREE.Vector3());
    expect(size.y).toBeCloseTo(30, 1);
    expect(size.z).toBeCloseTo(100, 1);
  });

  it("arch shapes produce closed curves", () => {
    const pointed = pointedArchShape(10, 20);
    const round = roundArchShape(10, 20);
    expect(pointed.curves.length).toBeGreaterThan(0);
    expect(round.curves.length).toBeGreaterThan(0);
  });

  it("ellipse and ring shapes produce valid extrudable profiles", () => {
    const el = ellipseShape(20, 15);
    expect(el.curves.length).toBeGreaterThan(10);

    const r = ring(30, 30, 20, 20);
    expect(r.holes).toHaveLength(1);

    const pr = partialRing(40, 40, 30, 30, 0, Math.PI);
    const extruded = extrudeY(pr, 10);
    extruded.computeBoundingBox();
    expect(extruded.boundingBox!.max.y).toBeCloseTo(10, 1);
  });
});
