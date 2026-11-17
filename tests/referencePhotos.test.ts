import { describe, expect, it } from "vitest";
import { getReferencePhoto, REFERENCE_PHOTOS, resolvePhotoUrl } from "../src/data/referencePhotos";
import { WONDERS } from "../src/wonders";

describe("Reference Photos Catalog & URL Resolver", () => {
  it("covers all 23 wonders with valid reference photo entries", () => {
    expect(Object.keys(REFERENCE_PHOTOS).length).toBe(23);

    for (const wonder of WONDERS) {
      const photo = getReferencePhoto(wonder.id);
      expect(photo).toBeDefined();
      expect(photo?.image).toBeTruthy();
      expect(photo?.page).toMatch(/^https?:\/\//);
      expect(photo?.credit).toBeTruthy();
      expect(photo?.alt).toBeTruthy();
    }
  });

  it("resolvePhotoUrl resolves relative and absolute paths properly", () => {
    expect(resolvePhotoUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
    expect(resolvePhotoUrl("http://example.com/photo.jpg")).toBe("http://example.com/photo.jpg");
    expect(resolvePhotoUrl("")).toBe("");

    const resolved = resolvePhotoUrl("/photos/giza.jpg");
    expect(resolved).toContain("photos/giza.jpg");
  });
});
