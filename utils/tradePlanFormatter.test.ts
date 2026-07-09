// Phase 20.1 — Trade Plan Formatter: presentation-only, tanpa target sintetis.
import { describe, it, expect } from "vitest";
import { formatTradePlan, formatDualTradePlan, type TradePlanInput, type PivotLevels } from "./tradePlanFormatter";

const pivots: PivotLevels = { PP: 100, R1: 104, R2: 108, R3: 114, S1: 96, S2: 92, S3: 86 };
const bull: any = { bullProbability: 64, bearProbability: 20, neutralProbability: 16, confidence: 72, overallScore: 70 };

describe("formatTradePlan", () => {
  it("returns null on invalid input", () => {
    expect(formatTradePlan(null)).toBeNull();
    expect(formatTradePlan({ currentPrice: 0, pivots } as TradePlanInput)).toBeNull();
  });

  it("formats Entry/SL/targets from existing pivot levels (no N/A)", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    expect(v.direction).toBe("bullish");
    expect(Number.isFinite(v.entry.price)).toBe(true);
    expect(Number.isFinite(v.stopLoss.price)).toBe(true);
    expect(v.targets.length).toBeGreaterThanOrEqual(1);
    expect(v.entry.reasons.length).toBeGreaterThan(0);
    expect(v.stopLoss.reasons.length).toBeGreaterThan(0);
  });

  it("uses AI Validator entry verbatim when provided", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull, aiSelectedEntry: 99.5 })!;
    expect(v.entry.source).toBe("AI Validator");
    expect(v.entry.price).toBe(100); // rounded 99.5
  });

  it("targets come ONLY from real structures — pivots resistance here (no measured move)", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    // Only R1/R2/R3 exist above entry → at most 3, each a real pivot level.
    for (const t of v.targets) {
      expect([104, 108, 114]).toContain(t.price);
      expect(t.reasons[0]).toMatch(/Resistance/);
    }
  });

  it("does NOT fabricate a 3rd target when only one structure exists above entry", () => {
    // Entry pinned at 110 → only R3 (114) sits above → exactly 1 target, no synthetic backfill.
    const v = formatTradePlan({ currentPrice: 109, pivots, confluence: bull, aiSelectedEntry: 110 })!;
    expect(v.targets.length).toBe(1);
    expect(v.targets[0].price).toBe(114);
  });

  it("RR is pure math |TP-Entry|/|Entry-SL| with badges", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    const e = v.entry.price, s = v.stopLoss.price;
    for (const t of v.targets) {
      const expected = Math.round((Math.abs(t.price - e) / Math.abs(e - s)) * 100) / 100;
      expect(t.rr).toBeCloseTo(expected, 2);
      expect(["Poor", "Good", "Excellent"]).toContain(t.badge);
    }
  });

  it("prefers an unmitigated Bullish Order Block for entry + SL below its low", () => {
    const orderBlocks: any = {
      bullish: [{ type: "Bullish", priceHigh: 99, priceLow: 97, status: "Fresh", confidence: 80 }],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 110, lo: 90 }, atr: 2,
    };
    const v = formatTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: bull })!;
    expect(v.entry.source).toBe("Order Block");
    expect(v.entry.price).toBe(99);     // priceHigh, existing value (no midpoint calc)
    expect(v.stopLoss.price).toBe(97);  // priceLow, no ATR buffer
    expect(v.stopLoss.reasons[0]).toMatch(/Order Block/);
  });

  it("SL never collides with Entry after rounding (RR > 0)", () => {
    // cp=2450 → S1≈2376.5 rounds to 2377 for both entry & SL source; SL must drop to S2.
    const pSmall: PivotLevels = { PP: 2450, R1: 2523.5, R2: 2597, R3: 2695, S1: 2376.5, S2: 2303, S3: 2205 };
    const v = formatTradePlan({ currentPrice: 2450, pivots: pSmall, confluence: bull })!;
    expect(v.stopLoss.price).toBeLessThan(v.entry.price);
    expect(v.valid).toBe(true);
    v.targets.forEach((t) => expect(t.rr).toBeGreaterThan(0));
  });

  it("no cross-ticker leakage — distinct inputs give distinct levels", () => {
    const a = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    const pB: PivotLevels = { PP: 5000, R1: 5200, R2: 5400, R3: 5700, S1: 4800, S2: 4600, S3: 4300 };
    const b = formatTradePlan({ currentPrice: 5050, pivots: pB, confluence: bull })!;
    expect(a.entry.price).not.toBe(b.entry.price);
    expect(a.targets[0].price).not.toBe(b.targets[0].price);
  });

  // ── P20.2 PRIORITY SYSTEM ──────────────────────────────────────────────────
  it("exposes a priority score on entry and a quality label on each target", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    expect(typeof v.entry.score).toBe("number");
    v.targets.forEach((t) => expect(["Very High", "High", "Medium", "Low"]).toContain(t.quality));
  });

  it("scores a Fresh OB above a Mitigated OB even when the Mitigated one is nearer", () => {
    const orderBlocks: any = {
      bullish: [
        { type: "Bullish", priceHigh: 95, priceLow: 93, status: "Fresh", confidence: 85 },     // farther, fresh
        { type: "Bullish", priceHigh: 99, priceLow: 97, status: "Mitigated", confidence: 60 }, // nearer, tested
      ],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 110, lo: 90 }, atr: 2,
    };
    const v = formatTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: bull })!;
    expect(v.entry.price).toBe(95);                 // Fresh wins on score, not proximity
    expect(v.entry.reasons[0]).toMatch(/Fresh/);
  });

  it("ranks a high-confidence liquidity target above a plain pivot (TP1 = liquidity)", () => {
    const liquidity: any = {
      buySide: [{ price: 106, confidence: 90, strength: "Major", type: "BSL", scope: "External", side: "buy", age: 1, touched: false, broken: false, label: "" }],
      sellSide: [], recentSweep: null, zones: [], range: { hi: 120, lo: 90 },
    };
    const v = formatTradePlan({ currentPrice: 101, pivots, liquidity, confluence: bull })!;
    expect(v.targets[0].source).toBe("Liquidity");  // liquidity outranks pivots R1/R2/R3
    expect(["Very High", "High"]).toContain(v.targets[0].quality);
  });

  it("SL chooses the distal edge of the EXACT same structure (nearest active Pivot)", () => {
    // If entry is pivot, SL is next pivot.
    const liquidity: any = {
      buySide: [], sellSide: [{ price: 99, confidence: 70, strength: "Minor", type: "SSL", scope: "Internal", side: "sell", age: 2, touched: false, broken: false, label: "" }],
      recentSweep: null, zones: [], range: { hi: 120, lo: 90 },
    };
    const v = formatTradePlan({ currentPrice: 101, pivots, liquidity, confluence: bull })!;
    expect(v.entry.source).toBe("Pivot");
    expect(v.entry.price).toBe(96); // S1
    expect(v.stopLoss.price).toBe(92); // S2 (next pivot)
  });

  // ── P20.3 MARKET-STRUCTURE VALIDATION ──────────────────────────────────────
  it("targets form a strictly MONOTONIC ladder (bullish TP1<TP2<TP3)", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    for (let i = 1; i < v.targets.length; i++) expect(v.targets[i].price).toBeGreaterThan(v.targets[i - 1].price);
  });

  // P22.2 — LONG-ONLY: struktur bearish TIDAK pernah menghasilkan plan SHORT.
  it("bearish structure yields NO short plan (long-only WAIT/SKIP)", () => {
    const bear: any = { bullProbability: 22, bearProbability: 64, confidence: 70, overallScore: 66 };
    const v = formatTradePlan({ currentPrice: 99, pivots, confluence: bear, marketMap: { trend: "Bearish" } as any })!;
    expect(v.valid).toBe(false);                       // kartu Entry/SL/TP disembunyikan
    expect(v.targets).toHaveLength(0);                 // tidak ada target short
    expect(["WAIT", "SKIP"]).toContain(v.decision.state);
    expect(v.decision.reasons.join(" ")).toMatch(/LONG-ONLY/i);
  });

  it("skips an entry candidate that sits inside an INVALIDATED Order Block", () => {
    const orderBlocks: any = {
      bullish: [{ type: "Bullish", priceHigh: 99, priceLow: 97, status: "Invalidated", confidence: 80 }],
      bearish: [], nearestActive: null,
      blocks: [{ type: "Bullish", priceHigh: 99, priceLow: 97, status: "Invalidated", confidence: 80 }],
      range: { hi: 110, lo: 90 }, atr: 2,
    };
    const v = formatTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: bull })!;
    expect(v.entry.source).not.toBe("Order Block");   // invalidated OB rejected → pivot used
    // selected entry (98 pivot? actually S1=96) must NOT lie inside [97,99]
    expect(v.entry.price < 97 || v.entry.price > 99).toBe(true);
  });

  it("rejects entry BEYOND the nearest liquidity", () => {
    // nearest liquidity at 99 (below price). A pivot/level below 99 would be 'beyond' → skipped.
    const marketMap: any = { trend: "Bullish", nearestLiquidity: { top: 100, bottom: 98, center: 99, type: "Demand Zone", strength: "Major", confidence: 80, reason: "" }, majorDemand: null, majorSupply: null };
    const pLow: PivotLevels = { PP: 100, R1: 104, R2: 108, R3: 114, S1: 95, S2: 92, S3: 86 };
    const v = formatTradePlan({ currentPrice: 101, pivots: pLow, marketMap, confluence: bull })!;
    expect(v.entry.price).toBeGreaterThanOrEqual(99); // never beyond (below) nearest liquidity 99
  });

  it("guarantees RR>0, Entry≠SL, and no TP==Entry on every plan", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    expect(v.entry.price).not.toBe(v.stopLoss.price);
    v.targets.forEach((t) => {
      expect(t.rr).toBeGreaterThan(0);
      expect(t.price).not.toBe(v.entry.price);
    });
  });

  it("has NO duplicated target prices", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    const prices = v.targets.map((t) => t.price);
    expect(new Set(prices).size).toBe(prices.length);
  });

  // ── P20.4 EXECUTION DECISION LAYER ─────────────────────────────────────────
  it("always attaches a decision with 2–4 reasons", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    expect(["READY", "WAIT", "SKIP"]).toContain(v.decision.state);
    expect(v.decision.reasons.length).toBeGreaterThanOrEqual(1);
    expect(v.decision.reasons.length).toBeLessThanOrEqual(4);
  });

  it("READY when high confluence + trend aligned + valid + RR>1", () => {
    const orderBlocks: any = {
      bullish: [{ type: "Bullish", priceHigh: 99, priceLow: 96, status: "Fresh", confidence: 85 }],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 120, lo: 90 }, atr: 2,
    };
    const v = formatTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: bull, marketMap: { trend: "Bullish" } as any })!;
    expect(v.decision.state).toBe("READY");
    expect(v.decision.reasons.some((r) => /RR/.test(r))).toBe(true);
    expect(v.decision.reasons.some((r) => /Fresh Bullish Order Block/.test(r))).toBe(true);
    expect(v.decision.reasons.every((r) => r.startsWith("✔"))).toBe(true);
  });

  it("WAIT when confluence is medium (50–64)", () => {
    const medium: any = { bullProbability: 56, bearProbability: 30, confidence: 58, overallScore: 56 };
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: medium, marketMap: { trend: "Bullish" } as any })!;
    expect(v.decision.state).toBe("WAIT");
    expect(v.decision.reasons.every((r) => r.startsWith("•"))).toBe(true);
  });

  it("SKIP when no valid plan can be built (RR ≤ 1 / no targets)", () => {
    // Entry pinned just below R3 so the only target (R3) yields a tiny RR; force SKIP via no structure + collision.
    const pTight: PivotLevels = { PP: 100, R1: 100.4, R2: 100.6, R3: 100.8, S1: 99.6, S2: 99.4, S3: 99.2 };
    const v = formatTradePlan({ currentPrice: 100, pivots: pTight, confluence: bull })!;
    // Either SKIP (RR≤1) or a valid WAIT/READY — assert decision is coherent with validity.
    if (!v.valid) expect(v.decision.state).toBe("SKIP");
    expect(["READY", "WAIT", "SKIP"]).toContain(v.decision.state);
  });

  // ── P20.5 REFINEMENT ───────────────────────────────────────────────────────
  it("skips an entry sitting inside a FILLED FVG", () => {
    const fvg: any = {
      bullish: [], bearish: [], nearestActive: null,
      gaps: [{ type: "Bullish", gapHigh: 97, gapLow: 95, status: "Filled", priority: "Low", priorityScore: 10 }],
      range: { hi: 110, lo: 90 }, atr: 2,
    };
    // pivot S1=96 falls inside the filled gap [95,97] → must be skipped.
    const v = formatTradePlan({ currentPrice: 101, pivots, fvg, confluence: bull })!;
    expect(v.entry.price < 95 || v.entry.price > 97).toBe(true);
  });

  it("rejects entries when plan direction opposes Market Map trend", () => {
    // confluence bullish but Market Map trend Bearish → bullish candidates rejected → Current Price fallback.
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull, marketMap: { trend: "Bearish" } as any })!;
    expect(v.entry.source).toBe("Current Price");
  });

  it("SL is exactly bound to the entry structure's distal edge, NOT decoupled nearest protection", () => {
    // If entry is a Pivot, SL is the NEXT Pivot.
    const liquidity: any = { buySide: [], sellSide: [{ price: 99, confidence: 70, strength: "Minor", type: "SSL", scope: "Internal", side: "sell", age: 1, touched: false, broken: false, label: "" }], recentSweep: null, zones: [], range: { hi: 120, lo: 90 } };
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, liquidity, confluence: bull })!;
    // Aggressive entry is Pivot S1 (96), so SL MUST be the next Pivot S2 (92).
    // It NO LONGER incorrectly picks Liquidity at 99.
    expect(dual.aggressive.entry.price).toBe(96);
    expect(dual.aggressive.stopLoss.price).toBe(92);              
    expect(dual.aggressive.stopLoss.source).toBe("Pivot");
  });

  it("every level carries a non-empty reason; every TP carries RR", () => {
    const v = formatTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    expect(v.entry.reasons[0]).toBeTruthy();
    expect(v.stopLoss.reasons[0]).toBeTruthy();
    v.targets.forEach((t) => { expect(t.reasons[0]).toBeTruthy(); expect(typeof t.rr).toBe("number"); });
  });

  it("decision changes across distinct tickers (no stale state)", () => {
    const strong: any = { bullProbability: 72, bearProbability: 16, confidence: 80, overallScore: 78 };
    const weak: any = { bullProbability: 45, bearProbability: 40, confidence: 48, overallScore: 46 };
    const ob: any = { bullish: [{ type: "Bullish", priceHigh: 99, priceLow: 96, status: "Fresh", confidence: 85 }], bearish: [], nearestActive: null, blocks: [], range: { hi: 120, lo: 90 }, atr: 2 };
    const ready = formatTradePlan({ currentPrice: 101, pivots, orderBlocks: ob, confluence: strong, marketMap: { trend: "Bullish" } as any })!;
    const notReady = formatTradePlan({ currentPrice: 101, pivots, confluence: weak, marketMap: { trend: "Bullish" } as any })!;
    expect(ready.decision.state).toBe("READY");
    expect(ready.decision.state).not.toBe(notReady.decision.state);
  });

  // ── P20.7 DUAL TRADE PLAN ──────────────────────────────────────────────────
  it("returns both scenarios with correct badges and a recommendation", () => {
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    expect(dual.aggressive.style).toBe("aggressive");
    expect(dual.aggressive.badge).toBe("HIGH RISK");
    expect(dual.conservative.style).toBe("conservative");
    expect(dual.conservative.badge).toBe("HIGH PROBABILITY");
    expect(["aggressive", "conservative"]).toContain(dual.recommended);
  });

  it("aggressive and conservative have DIFFERENT entries when multiple structures exist", () => {
    // pivots give S1 (aggressive, nearest) and a deeper S2 (conservative) → different.
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, confluence: bull })!;
    expect(dual.aggressive.entry.price).not.toBe(dual.conservative.entry.price);
    // conservative entry is deeper (further below price) for a bullish plan
    expect(dual.conservative.entry.price).toBeLessThan(dual.aggressive.entry.price);
  });

  it("aggressive enters at nearest structure, conservative waits for deeper structure if available", () => {
    const orderBlocks: any = {
      bullish: [
        { type: "Bullish", priceHigh: 99, priceLow: 96, status: "Fresh", confidence: 85 }, // nearest
        { type: "Bullish", priceHigh: 95, priceLow: 92, status: "Fresh", confidence: 85 }  // deeper
      ],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 120, lo: 90 }, atr: 2,
    };
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: bull, marketMap: { trend: "Bullish" } as any })!;
    expect(dual.aggressive.entry.price).toBe(99);      // OB top (nearest)
    expect(dual.conservative.entry.price).toBe(95);    // OB top (deeper)
    expect(dual.conservative.entry.reasons[0]).toMatch(/Menunggu retest/);
  });

  // ── FIX BUG AUDIT REGRESSION TESTS ──────────────────────────────────────────
  it("SL always belongs to the SAME selected Entry structure and does not collide with Conservative Entry", () => {
    const orderBlocks: any = {
      bullish: [{ type: "Bullish", priceHigh: 99, priceLow: 96, status: "Fresh", confidence: 85 }],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 120, lo: 90 }, atr: 2,
    };
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: bull })!;
    
    // Rule 1: SL belongs to same structure (distal edge)
    expect(dual.aggressive.stopLoss.price).toBe(96);
    // Conservative Entry picks S2 (92) because S1 (96) equals Aggressive SL. 
    // Thus Conservative SL is S3 (86).
    expect(dual.conservative.entry.price).toBe(92);
    expect(dual.conservative.stopLoss.price).toBe(86);

    // Rule 3: Conservative Entry must NEVER equal Aggressive Stop Loss
    expect(dual.conservative.entry.price).not.toBe(dual.aggressive.stopLoss.price);

    // Rule 4: SL is outside (on distal boundary, which is outside the proximal edge)
    expect(dual.aggressive.stopLoss.price).toBeLessThan(dual.aggressive.entry.price);

    // Rule 7: RR remains correct (RR mathematically calculated from this Entry and SL)
    dual.aggressive.targets.forEach(t => expect(t.rr).toBeGreaterThan(0));
  });

  it("both scenarios use deterministic targets and have independent RR + decisions", () => {
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, confluence: bull, marketMap: { trend: "Bullish" } as any })!;
    [dual.aggressive, dual.conservative].forEach((p) => {
      p.targets.forEach((t) => expect(t.rr).toBeGreaterThan(0));
      expect(["READY", "WAIT", "SKIP"]).toContain(p.decision.state);
    });
  });

  it("recommends Conservative when confluence >= 75", () => {
    const strong: any = { bullProbability: 80, bearProbability: 12, confidence: 82, overallScore: 80 };
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, confluence: strong, marketMap: { trend: "Bullish" } as any })!;
    expect(dual.recommended).toBe("conservative");
  });

  // ── P22.1 SMART STRATEGY RECOMMENDATION ────────────────────────────────────
  it("attaches strategyScore (0–100), timingHint and why to scenarios", () => {
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, confluence: bull, marketMap: { trend: "Bullish" } as any })!;
    [dual.aggressive, dual.conservative].forEach((p) => {
      expect(p.strategyScore).toBeGreaterThanOrEqual(0);
      expect(p.strategyScore).toBeLessThanOrEqual(100);
      expect(p.timingHint.length).toBeGreaterThan(0);
    });
    const winner = dual.recommended === "aggressive" ? dual.aggressive : dual.conservative;
    expect(winner.why.length).toBeGreaterThanOrEqual(1);
    expect(winner.why.length).toBeLessThanOrEqual(4);
  });

  it("recommends AGGRESSIVE on high momentum (Fresh OB + strong trend + high confluence)", () => {
    const orderBlocks: any = {
      bullish: [{ type: "Bullish", priceHigh: 99, priceLow: 96, status: "Fresh", confidence: 85 }],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 120, lo: 90 }, atr: 2,
    };
    const strong: any = { bullProbability: 72, bearProbability: 16, confidence: 78, overallScore: 76 };
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: strong, marketMap: { trend: "Bullish" } as any })!;
    expect(dual.recommended).toBe("aggressive");
    expect(dual.aggressive.strategyScore).toBeGreaterThan(dual.conservative.strategyScore);
    expect(dual.aggressive.why.some((w) => /Fresh/.test(w))).toBe(true);
  });

  it("recommends CONSERVATIVE on pivot-only pullback with better RR", () => {
    const medium: any = { bullProbability: 58, bearProbability: 30, confidence: 62, overallScore: 60 };
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, confluence: medium, marketMap: { trend: "Bullish" } as any })!;
    expect(dual.recommended).toBe("conservative");
    expect(dual.conservative.strategyScore).toBeGreaterThan(dual.aggressive.strategyScore);
  });

  it("timing hints describe the selected structure per style (no prediction)", () => {
    const orderBlocks: any = {
      bullish: [{ type: "Bullish", priceHigh: 99, priceLow: 96, status: "Fresh", confidence: 85 }],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 120, lo: 90 }, atr: 2,
    };
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, orderBlocks, confluence: bull, marketMap: { trend: "Bullish" } as any })!;
    expect(dual.aggressive.timingHint).toMatch(/Order Block/);
    expect(dual.conservative.timingHint).toMatch(/retest|konfirmasi/i);
    expect(dual.aggressive.timingHint).not.toBe(dual.conservative.timingHint);
  });

  it("flags a tie when both scenarios collapse to the same plan", () => {
    const pOne: PivotLevels = { PP: 100, R1: 104, R2: 108, R3: 114, S1: 99, S2: 200, S3: 300 };
    const dual = formatDualTradePlan({ currentPrice: 100, pivots: pOne, confluence: bull })!;
    expect(dual.tie).toBe(true);
    expect(dual.aggressive.strategyScore).toBe(dual.conservative.strategyScore);
  });

  // ── P22.2 LONG-ONLY MODE (IDX) ─────────────────────────────────────────────
  it("bullish market → mode BUY, no long-only guidance", () => {
    const dual = formatDualTradePlan({ currentPrice: 101, pivots, confluence: bull, marketMap: { trend: "Bullish" } as any })!;
    expect(dual.mode).toBe("BUY");
    expect(dual.longOnly).toBeNull();
  });

  it("bearish market → mode WAIT/SKIP, both scenarios invalid, guidance shown", () => {
    const bear: any = { bullProbability: 22, bearProbability: 64, confidence: 70, overallScore: 66 };
    const dual = formatDualTradePlan({ currentPrice: 99, pivots, confluence: bear, marketMap: { trend: "Bearish" } as any })!;
    expect(["WAIT", "SKIP"]).toContain(dual.mode);
    expect(dual.aggressive.valid).toBe(false);          // kartu Entry/SL/TP disembunyikan
    expect(dual.conservative.valid).toBe(false);
    expect(dual.aggressive.targets).toHaveLength(0);    // tidak ada level short
    expect(dual.longOnly).not.toBeNull();
    expect(dual.longOnly!.reasons.length).toBeGreaterThanOrEqual(1);
    expect(dual.longOnly!.buyTriggers.length).toBeGreaterThanOrEqual(1);
  });

  it("bearish with demand structure below → WAIT + watch/accumulation zone from existing levels", () => {
    const bear: any = { bullProbability: 25, bearProbability: 60, confidence: 62, overallScore: 60 };
    const orderBlocks: any = {
      bullish: [{ type: "Bullish", priceHigh: 94, priceLow: 92, status: "Fresh", confidence: 80 }],
      bearish: [], nearestActive: null, blocks: [], range: { hi: 110, lo: 88 }, atr: 2,
    };
    const dual = formatDualTradePlan({ currentPrice: 99, pivots, confluence: bear, marketMap: { trend: "Bearish" } as any, orderBlocks })!;
    expect(dual.mode).toBe("WAIT");
    expect(dual.longOnly!.watchZone).toEqual({ low: 92, high: 94, source: "Bullish Order Block" });
    expect(dual.longOnly!.accumulationZone).toEqual({ low: 92, high: 94, source: "Fresh Bullish Order Block" });
    expect(dual.longOnly!.buyTriggers.some((t) => /Order Block/.test(t))).toBe(true);
  });

  it("bearish with NO support structure below → SKIP", () => {
    const bear: any = { bullProbability: 20, bearProbability: 65, confidence: 55, overallScore: 52 };
    // S1/S2 di atas harga → tidak ada support valid di bawah → SKIP.
    const pNone: PivotLevels = { PP: 110, R1: 114, R2: 118, R3: 124, S1: 106, S2: 103, S3: 101 };
    const dual = formatDualTradePlan({ currentPrice: 100, pivots: pNone, confluence: bear, marketMap: { trend: "Bearish" } as any })!;
    expect(dual.mode).toBe("SKIP");
    expect(dual.longOnly!.watchZone).toBeNull();
  });

  it("identical plans only when a single valid structure exists", () => {
    // Only one pivot support below price → no deeper structure → entries coincide.
    const pOne: PivotLevels = { PP: 100, R1: 104, R2: 108, R3: 114, S1: 99, S2: 200, S3: 300 };
    const dual = formatDualTradePlan({ currentPrice: 100, pivots: pOne, confluence: bull })!;
    // S2/S3 are above price (invalid as bullish support) → only S1 valid → same entry.
    expect(dual.aggressive.entry.price).toBe(dual.conservative.entry.price);
  });
});
