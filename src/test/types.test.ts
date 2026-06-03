import { describe, it, expect } from "vitest";
import { SECTORS, SECTOR_COLORS, COUNTRIES } from "@/lib/types";
import { mockCompanies } from "@/lib/mockData";

describe("Types & Constants", () => {
  it("has 6 sectors", () => {
    expect(SECTORS).toHaveLength(6);
    expect(SECTORS).toContain("Energy Transition");
    expect(SECTORS).toContain("Financial Systems");
  });

  it("has a color for every sector", () => {
    for (const sector of SECTORS) {
      expect(SECTOR_COLORS[sector]).toBeDefined();
      expect(typeof SECTOR_COLORS[sector]).toBe("string");
    }
  });

  it("has 15 tracked countries", () => {
    expect(COUNTRIES).toHaveLength(15);
    expect(COUNTRIES).toContain("Nigeria");
    expect(COUNTRIES).toContain("Kenya");
  });
});

describe("Mock Data — Companies", () => {
  it("has exactly 50 companies", () => {
    expect(mockCompanies).toHaveLength(50);
  });

  it("has required fields on every company", () => {
    for (const c of mockCompanies) {
      expect(c.id).toBeDefined();
      expect(c.name).toBeTruthy();
      expect(c.sector).toBeTruthy();
      expect(c.country).toBeTruthy();
      expect(c.countryCode).toHaveLength(2);
      expect(c.scoutScore).toBeGreaterThanOrEqual(0);
      expect(c.scoutScore).toBeLessThanOrEqual(100);
      expect(["inflow", "outflow", "neutral"]).toContain(c.institutionalFlow);
    }
  });

  it("covers all 6 sectors across companies", () => {
    const covered = new Set(mockCompanies.map((c) => c.sector));
    for (const s of SECTORS) {
      expect(covered.has(s)).toBe(true);
    }
  });

  it("has at least one company from each tracked country", () => {
    const covered = new Set(mockCompanies.map((c) => c.country));
    for (const country of COUNTRIES) {
      expect(covered.has(country)).toBe(true);
    }
  });

  it("has unique company names", () => {
    const names = mockCompanies.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("scout scores are distributed across the range", () => {
    const scores = mockCompanies.map((c) => c.scoutScore);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    expect(max).toBeGreaterThanOrEqual(80);
    expect(min).toBeLessThanOrEqual(60);
  });

  it("market caps are valid currency strings", () => {
    for (const c of mockCompanies) {
      expect(c.marketCap).toMatch(/^\$[\d.]+[BM]?$/);
    }
  });
});