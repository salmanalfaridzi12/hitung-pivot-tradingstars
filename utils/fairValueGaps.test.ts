import { describe, it, expect } from "vitest";
import { analyzeFairValueGaps } from "./fairValueGaps";
import type { OHLCV } from "./vcp";

const bar = (o: number, h: number, l: number, c: number, v = 1000): OHLCV => ({ open: o, high: h, low: l, close: c, volume: v });
const flat = (n: number, p = 99): OHLCV[] => Array.from({ length: n }, () => bar(p, p + 1, p - 1, p));

// Bullish FVG: c1.high=100, c3.low=103 → gap [100,103] (gapSize 3).
function bullishFVG(): OHLCV[] {
  return flat(12, 99).concat([
    bar(99, 100, 98, 99.5),          // c1
    bar(100, 104, 100, 103.5, 6000), // impulse up (volume tinggi)
    bar(104, 106, 103, 105),         // c3 (low 103 > 100)
  ]);
}

describe("analyzeFairValueGaps", () => {
  it("edge: data terlalu pendek → kosong", () => {
    expect(analyzeFairValueGaps(flat(3)).gaps).toEqual([]);
  });

  it("mendeteksi Bullish FVG (Fresh saat belum terisi)", () => {
    const d = bullishFVG().concat(flat(4, 105)); // harga tetap di atas gap → Fresh
    const r = analyzeFairValueGaps(d);
    expect(r.bullish.length).toBeGreaterThan(0);
    const g = r.bullish[0];
    expect(g.type).toBe("Bullish");
    expect(g.gapLow).toBeCloseTo(100, 1);
    expect(g.gapHigh).toBeCloseTo(103, 1);
    expect(g.gapSize).toBeCloseTo(3, 1);
    expect(g.status).toBe("Fresh");
    expect(g.volumeConfirmation).toBe(true);
    expect(g.filledPercent).toBe(0);
  });

  it("mendeteksi Bearish FVG", () => {
    const d = flat(12, 101).concat([
      bar(101, 102, 100, 100.5),       // c1 (low 100)
      bar(100, 100, 96, 96.5, 6000),   // impulse down
      bar(96, 97, 95, 95.5),           // c3 (high 97 < 100)
    ], flat(4, 95));
    const r = analyzeFairValueGaps(d);
    expect(r.bearish.length).toBeGreaterThan(0);
    expect(r.bearish[0].type).toBe("Bearish");
    expect(r.bearish[0].gapLow).toBeCloseTo(97, 1);
    expect(r.bearish[0].gapHigh).toBeCloseTo(100, 1);
  });

  it("Partially Filled saat harga masuk sebagian gap", () => {
    const d = bullishFVG().concat([bar(104, 104, 101.5, 102), ...flat(3, 102)]); // dip ke 101.5 (50%)
    const g = analyzeFairValueGaps(d).bullish[0];
    expect(g.status).toBe("Partially Filled");
    expect(g.filledPercent).toBeGreaterThan(30);
    expect(g.filledPercent).toBeLessThan(95);
    expect(g.reactionCount).toBeGreaterThanOrEqual(1);
  });

  it("Filled saat gap terisi penuh tanpa close menembus", () => {
    const d = bullishFVG().concat([bar(104, 104, 100, 101), ...flat(3, 101)]); // dip ke gapLow 100, close 101
    const g = analyzeFairValueGaps(d).gaps.find((x) => x.type === "Bullish")!;
    expect(g.status).toBe("Filled");
    expect(g.filledPercent).toBeGreaterThanOrEqual(95);
  });

  it("Invalidated saat close menembus sisi jauh gap", () => {
    const d = bullishFVG().concat([bar(102, 102, 98, 98), ...flat(3, 98)]); // close 98 < gapLow 100
    const g = analyzeFairValueGaps(d).gaps.find((x) => x.type === "Bullish")!;
    expect(g.status).toBe("Invalidated");
  });

  it("Priority Score ternormalisasi 0-100; gap besar+volume+fresh → lebih tinggi dari yang invalid", () => {
    const fresh = analyzeFairValueGaps(bullishFVG().concat(flat(4, 105))).bullish[0];
    const invalid = analyzeFairValueGaps(bullishFVG().concat([bar(102, 102, 98, 98), ...flat(3, 98)])).gaps.find((x) => x.type === "Bullish")!;
    expect(fresh.priorityScore).toBeGreaterThanOrEqual(0);
    expect(fresh.priorityScore).toBeLessThanOrEqual(100);
    expect(["High", "Medium", "Low"]).toContain(fresh.priority);
    expect(fresh.priorityScore).toBeGreaterThan(invalid.priorityScore);
  });
});
