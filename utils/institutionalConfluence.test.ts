import { describe, it, expect } from "vitest";
import { scoreConfluence, gradeOf, BASELINE_WEIGHTS, type FactorInput } from "./institutionalConfluence";

const F = (key: string, value: number | null, bullish?: boolean): FactorInput => ({
  key, label: key, value, weight: BASELINE_WEIGHTS[key] ?? 0.05, bullish,
});

const allKeys = Object.keys(BASELINE_WEIGHTS);
const uniform = (value: number | null, bullish?: boolean) => allKeys.map((k) => F(k, value, bullish));

describe("scoreConfluence", () => {
  it("Strong Bullish: semua faktor tinggi+bullish → skor tinggi, grade kuat, bull prob dominan", () => {
    const r = scoreConfluence(uniform(92, true));
    expect(r.overallScore).toBeGreaterThanOrEqual(85);
    expect(["AAA+", "AAA", "AA"]).toContain(r.institutionalGrade);
    expect(r.bullProbability).toBeGreaterThan(r.bearProbability);
    expect(r.confidence).toBeGreaterThan(70);
    expect(r.explanation.conflictingSignals.length).toBe(0);
  });

  it("Strong Bearish: semua rendah+bearish → skor rendah → WAIT, bear prob dominan", () => {
    const r = scoreConfluence(uniform(15, false));
    expect(r.overallScore).toBeLessThan(60);
    expect(r.institutionalGrade).toBe("WAIT");
    expect(r.bearProbability).toBeGreaterThan(r.bullProbability);
  });

  it("Mixed/Conflicting: arah campur → confidence turun + conflictingSignals terisi", () => {
    const half = allKeys.map((k, i) => F(k, i % 2 === 0 ? 80 : 25, i % 2 === 0));
    const r = scoreConfluence(half);
    expect(r.explanation.conflictingSignals.length).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThan(80);
    expect(r.neutralProbability).toBeGreaterThanOrEqual(0);
  });

  it("Missing modules: bobot diredistribusi (efektif sum ≈ 1) & missingConfirmations terisi", () => {
    const r = scoreConfluence([F("trend", 80, true), F("volume", 70, true), F("liquidity", 60, true)]);
    const sumW = r.factors.reduce((s, f) => s + f.weight, 0);
    expect(sumW).toBeCloseTo(1, 5);
    expect(r.explanation.missingConfirmations).toContain("fvg");
    expect(r.overallScore).toBeGreaterThan(0);
  });

  it("Normalisasi: skor & probabilitas dalam 0-100, prob jumlah ≈ 100", () => {
    const r = scoreConfluence(uniform(63, true));
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
    const tot = r.bullProbability + r.bearProbability + r.neutralProbability;
    expect(tot).toBeGreaterThanOrEqual(99);
    expect(tot).toBeLessThanOrEqual(101);
  });

  it("ATR penalty menurunkan skor", () => {
    const base = scoreConfluence(uniform(80, true), 0).overallScore;
    const risky = scoreConfluence(uniform(80, true), 10).overallScore;
    expect(risky).toBeLessThan(base);
    expect(base - risky).toBeGreaterThanOrEqual(8);
  });

  it("Grade mapping benar di tiap ambang", () => {
    expect(gradeOf(97)).toBe("AAA+");
    expect(gradeOf(92)).toBe("AAA");
    expect(gradeOf(87)).toBe("AA");
    expect(gradeOf(82)).toBe("A");
    expect(gradeOf(75)).toBe("BBB");
    expect(gradeOf(64)).toBe("BB");
    expect(gradeOf(59)).toBe("WAIT");
  });

  it("Edge: tanpa faktor → skor 0, grade WAIT, tidak crash", () => {
    const r = scoreConfluence([]);
    expect(r.overallScore).toBe(0);
    expect(r.institutionalGrade).toBe("WAIT");
    expect(r.factors).toEqual([]);
  });

  it("Confidence naik saat semua engine kunci sepakat vs saat konflik", () => {
    const agree = scoreConfluence(uniform(85, true)).confidence;
    const conflict = scoreConfluence(allKeys.map((k, i) => F(k, i % 2 ? 80 : 30, !!(i % 2)))).confidence;
    expect(agree).toBeGreaterThan(conflict);
  });
});
