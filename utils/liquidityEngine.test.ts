import { describe, it, expect } from "vitest";
import { analyzeLiquidity } from "./liquidityEngine";
import type { OHLCV } from "./vcp";

// Helper: bar OHLCV ringkas.
const bar = (o: number, h: number, l: number, c: number, v = 1000): OHLCV => ({ open: o, high: h, low: l, close: c, volume: v });

// Deret datar dengan dua swing-high "equal" di harga 110 (liquidity pool di atas),
// lalu harga ditutup di bawahnya.
function withEqualHighs(): OHLCV[] {
  const d: OHLCV[] = [];
  const base = 100;
  for (let i = 0; i < 40; i++) {
    let h = base, l = base - 2, c = base - 1;
    if (i === 10 || i === 24) { h = 110; c = 104; } // dua swing high di 110
    d.push(bar(base - 1, h, l, c));
  }
  return d;
}

describe("analyzeLiquidity", () => {
  it("mengembalikan kosong untuk data terlalu pendek", () => {
    const r = analyzeLiquidity([bar(1, 2, 0.5, 1.5)]);
    expect(r.zones).toEqual([]);
    expect(r.recentSweep).toBeNull();
  });

  it("mendeteksi Equal Highs sebagai buy-side liquidity di atas harga", () => {
    const r = analyzeLiquidity(withEqualHighs(), { window: 3, tolPct: 1 });
    expect(r.buySide.length).toBeGreaterThan(0);
    const eqh = r.zones.find((z) => z.type === "EQH");
    expect(eqh).toBeTruthy();
    expect(eqh!.price).toBeGreaterThan(108);
    expect(eqh!.side).toBe("buy");
    expect(eqh!.confidence).toBeGreaterThan(0);
    expect(["Major", "Minor", "Weak"]).toContain(eqh!.strength);
  });

  it("setiap zona punya field metadata lengkap", () => {
    const r = analyzeLiquidity(withEqualHighs(), { window: 3, tolPct: 1 });
    for (const z of r.zones) {
      expect(typeof z.price).toBe("number");
      expect(typeof z.confidence).toBe("number");
      expect(typeof z.age).toBe("number");
      expect(typeof z.touched).toBe("boolean");
      expect(typeof z.broken).toBe("boolean");
      expect(z.confidence).toBeGreaterThanOrEqual(0);
      expect(z.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("mendeteksi liquidity sweep / stop hunt saat bar terakhir menembus swing lalu close balik", () => {
    const d: OHLCV[] = [];
    for (let i = 0; i < 30; i++) {
      let h = 105, l = 98, c = 101;
      if (i === 8 || i === 18) { h = 108; c = 103; } // swing high 108
      d.push(bar(100, h, l, c));
    }
    // bar terakhir menyapu 108 lalu close di bawah (stop hunt)
    d.push(bar(106, 112, 105, 104));
    const r = analyzeLiquidity(d, { window: 2, tolPct: 1 });
    expect(r.recentSweep).toBeTruthy();
    expect(["Sweep", "StopHunt"]).toContain(r.recentSweep!.type);
    expect(r.recentSweep!.broken).toBe(true);
  });
});
