import { describe, it, expect } from "vitest";
import { analyzeOrderBlocks } from "./orderBlocks";
import type { OHLCV } from "./vcp";

const bar = (o: number, h: number, l: number, c: number, v = 1000): OHLCV => ({ open: o, high: h, low: l, close: c, volume: v });
const flat = (n: number, p = 100): OHLCV[] => Array.from({ length: n }, () => bar(p, p + 1, p - 1, p));

// Bullish OB: candle bearish (idx 20) lalu impulse bullish kuat (idx 21).
function bullishBase(): OHLCV[] {
  const d = flat(20, 100);
  d.push(bar(100, 100.5, 98, 98.5));   // 20: bearish OB candle  → zona [98, 100.5]
  d.push(bar(99, 106, 99, 105, 5000)); // 21: displacement up (volume tinggi)
  return d;
}

describe("analyzeOrderBlocks", () => {
  it("edge: data terlalu pendek → kosong", () => {
    expect(analyzeOrderBlocks(flat(5)).blocks).toEqual([]);
  });

  it("mendeteksi Bullish Order Block (Fresh saat belum disentuh)", () => {
    const d = bullishBase().concat(flat(4, 105)); // harga tetap di atas → Fresh
    const r = analyzeOrderBlocks(d, { displacementAtr: 0.6 });
    expect(r.bullish.length).toBeGreaterThan(0);
    const ob = r.bullish[0];
    expect(ob.type).toBe("Bullish");
    expect(ob.priceHigh).toBeCloseTo(100.5, 1);
    expect(ob.priceLow).toBeCloseTo(98, 1);
    expect(ob.status).toBe("Fresh");
    expect(ob.volumeConfirmed).toBe(true);
    expect(ob.confidence).toBeGreaterThan(0);
  });

  it("mendeteksi Bearish Order Block", () => {
    const d = flat(20, 100);
    d.push(bar(100, 102, 99.5, 101.5));    // bullish candle
    d.push(bar(101, 101, 94, 95, 5000));   // displacement down
    d.push(...flat(4, 95));
    const r = analyzeOrderBlocks(d, { displacementAtr: 0.6 });
    expect(r.bearish.length).toBeGreaterThan(0);
    expect(r.bearish[0].type).toBe("Bearish");
  });

  it("klasifikasi Mitigated saat harga kembali menyentuh zona", () => {
    const d = bullishBase();
    d.push(bar(105, 105, 99, 100));  // dip ke 99 (masuk zona), close 100 (tahan)
    d.push(...flat(3, 102));
    const r = analyzeOrderBlocks(d, { displacementAtr: 0.6 });
    const ob = r.bullish[0];
    expect(ob.status).toBe("Mitigated");
    expect(ob.reactionCount).toBeGreaterThanOrEqual(1);
    expect(ob.lastTouch).not.toBeNull();
  });

  it("klasifikasi Invalidated saat close menembus zona", () => {
    const d = bullishBase();
    d.push(bar(100, 100, 95, 95));   // close 95 < priceLow 98 → invalid
    d.push(...flat(3, 95));
    const r = analyzeOrderBlocks(d, { displacementAtr: 0.6 });
    const ob = r.blocks.find((b) => b.type === "Bullish")!;
    expect(ob.status).toBe("Invalidated");
  });

  it("konversi Breaker setelah invalidasi lalu retest dari sisi berlawanan", () => {
    const d = bullishBase();
    d.push(bar(100, 100, 95, 95));   // invalidate
    d.push(bar(96, 99.5, 96, 98));   // retest naik ke zona [98,100.5] setelah invalid → breaker
    d.push(...flat(2, 97));
    const r = analyzeOrderBlocks(d, { displacementAtr: 0.6 });
    const ob = r.blocks.find((b) => b.type === "Bullish")!;
    expect(ob.status).toBe("Breaker");
  });
});
