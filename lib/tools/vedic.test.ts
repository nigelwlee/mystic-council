import { describe, it, expect } from "vitest";
import { vedicAstrologyTools } from "./vedic";

const vedicChart = vedicAstrologyTools.calculateVedicChart.execute!;

// getLahiriAyanamsa(year) = 23.85194 + 0.013971 * (year - 2000) - 0.000291 * ((year - 2000) / 100)^2
// Rounded to 2 dp as the tool does (Math.round(x * 100) / 100)

describe("Lahiri ayanamsa offset (via calculateVedicChart)", () => {
  it("returns ~23.73 for birth year 1991 (Nigel Lee)", async () => {
    const result = await vedicChart({ date: "1991-06-01" }, {});
    // Expected: 23.85194 + 0.013971 * (-9) - 0.000291 * (-0.09)^2 ≈ 23.7262 → rounds to 23.73
    expect(result.ayanamsa).toBeCloseTo(23.73, 1);
    expect(result.ayanamsa).toBeGreaterThan(23.70);
    expect(result.ayanamsa).toBeLessThan(23.76);
  });

  it("returns ~23.85 for year 2000 (J2000 epoch baseline)", async () => {
    const result = await vedicChart({ date: "2000-01-01" }, {});
    // At year 2000: 23.85194 + 0 - 0 = 23.85194 → rounds to 23.85
    expect(result.ayanamsa).toBeCloseTo(23.85, 1);
  });

  it("returns ~24.22 for year 2026 (present day)", async () => {
    const result = await vedicChart({ date: "2026-05-08" }, {});
    // Expected: 23.85194 + 0.013971 * 26 - 0.000291 * (0.26)^2 ≈ 24.2152 → rounds to 24.22
    expect(result.ayanamsa).toBeCloseTo(24.22, 1);
    expect(result.ayanamsa).toBeGreaterThan(24.19);
    expect(result.ayanamsa).toBeLessThan(24.25);
  });

  it("ayanamsa increases monotonically from 1991 to 2000 to 2026", async () => {
    const [r1991, r2000, r2026] = await Promise.all([
      vedicChart({ date: "1991-01-01" }, {}),
      vedicChart({ date: "2000-01-01" }, {}),
      vedicChart({ date: "2026-01-01" }, {}),
    ]);
    expect(r2000.ayanamsa).toBeGreaterThan(r1991.ayanamsa);
    expect(r2026.ayanamsa).toBeGreaterThan(r2000.ayanamsa);
  });

  it("Nigel Lee — lagna is computed when lat/lng and time are provided", async () => {
    const result = await vedicChart({
      date: "1991-06-01",
      time: "11:44",
      latitude: 14.5995,
      longitude: 120.9842,
    }, {});
    expect(result.lagna).not.toBeNull();
    expect(result.lagna?.sign).toBeTruthy();
    expect(result.lagna?.degree).toBeGreaterThanOrEqual(0);
    expect(result.lagna?.degree).toBeLessThan(30);
  });
});
