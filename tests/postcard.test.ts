import { describe, expect, it } from "vitest";
import { formatCoordinates } from "../src/postcard";

describe("Postcard Formatter Utilities", () => {
  it("formats positive latitude and longitude to standard DMS strings", () => {
    // Beijing ~ 39.9042°N, 116.4074°E
    const res = formatCoordinates(39.9042, 116.4074);
    expect(res).toContain("39°54'15\"N");
    expect(res).toContain("116°24'27\"E");
  });

  it("formats negative latitude and longitude (South and West)", () => {
    // Rio de Janeiro ~ -22.9519°S, -43.2105°W
    const res = formatCoordinates(-22.9519, -43.2105);
    expect(res).toContain("22°57'07\"S");
    expect(res).toContain("43°12'38\"W");
  });

  it("formats prime meridian and equator coordinates cleanly", () => {
    const res = formatCoordinates(0, 0);
    expect(res).toContain("0°00'00\"N");
    expect(res).toContain("0°00'00\"E");
  });
});
