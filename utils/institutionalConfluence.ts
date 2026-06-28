// Institutional Confluence Engine (Phase 17 · Module 5).
// SUMBER KEBENARAN tunggal untuk skor. 100% deterministik — TIDAK memakai Gemini.
// Menggabungkan subsistem (trend, momentum, volume, RS, fase, premium/discount,
// likuiditas, order block, FVG, + faktor eksternal opsional) dengan bobot dinamis
// yang menyesuaikan otomatis bila sebuah modul tidak tersedia. Additive — tidak
// menyentuh engine lain. AI nantinya hanya MENJELASKAN output ini.

import type { OHLCV } from "./vcp";
import { atr as calcAtr, clampScore as clamp } from "./indicators";
import { buildMarketMap, type MarketMap } from "./marketMap";
import type { LiquidityResult } from "./liquidityEngine";
import type { OrderBlockResult } from "./orderBlocks";
import type { FVGResult } from "./fairValueGaps";

export interface FactorInput {
  key: string;
  label: string;
  value: number | null; // 0-100, null = tidak tersedia
  weight: number;       // bobot dasar (akan diredistribusi)
  bullish?: boolean;    // arah; default value>=50
  description?: string;
}

export interface ScoredFactor {
  key: string;
  label: string;
  value: number;
  weight: number;          // bobot efektif (setelah redistribusi)
  scoreContribution: number;
  bullish: boolean;
  description: string;
}

export interface ConfluenceExplanation {
  topPositive: ScoredFactor[];
  topNegative: ScoredFactor[];
  missingConfirmations: string[];
  conflictingSignals: string[];
}

export interface InstitutionalConfluence {
  overallScore: number;
  institutionalGrade: string;
  confidence: number;
  riskScore: number;
  bullProbability: number;
  bearProbability: number;
  neutralProbability: number;
  entryQuality: number;
  exitQuality: number;
  breakoutProbability: number;
  reversalProbability: number;
  trendStrength: number;
  marketQuality: number;
  factors: ScoredFactor[];
  explanation: ConfluenceExplanation;
  summaryFactors: string[];
}

export function gradeOf(s: number): string {
  if (s >= 95) return "AAA+";
  if (s >= 90) return "AAA";
  if (s >= 85) return "AA";
  if (s >= 80) return "A";
  if (s >= 70) return "BBB";
  if (s >= 60) return "BB";
  return "WAIT";
}

// Bobot baseline (fraksi). ATR risk ditangani terpisah sebagai penalti.
export const BASELINE_WEIGHTS: Record<string, number> = {
  trend: 0.15, momentum: 0.10, volume: 0.10, relativeStrength: 0.08, marketPhase: 0.07,
  premiumDiscount: 0.05, liquidity: 0.10, orderBlocks: 0.10, fvg: 0.08,
  marketBreadth: 0.05, sectorRotation: 0.04, fearGreed: 0.03, news: 0.03, fundamental: 0.02,
};

const KEY_CONFIRMERS = ["trend", "volume", "liquidity", "orderBlocks", "fvg"];

// ── Core: skor dari faktor ternormalisasi (mudah diuji) ────────────────────
export function scoreConfluence(factors: FactorInput[], atrRiskPenalty = 0): InstitutionalConfluence {
  const norm = factors.map((f) => ({
    ...f,
    value: f.value == null ? null : clamp(f.value),
    bullish: f.bullish ?? (f.value != null && f.value >= 50),
  }));
  const available = norm.filter((f) => f.value != null);
  const totalW = available.reduce((s, f) => s + f.weight, 0) || 1;

  const scored: ScoredFactor[] = available.map((f) => {
    const w = f.weight / totalW; // redistribusi: bobot efektif sum = 1
    return {
      key: f.key, label: f.label, value: f.value as number, weight: w,
      scoreContribution: +((f.value as number) * w).toFixed(2),
      bullish: f.bullish as boolean, description: f.description ?? "",
    };
  });

  const weightedScore = scored.reduce((s, f) => s + f.value * f.weight, 0);
  const overallScore = Math.round(clamp(weightedScore - clamp(atrRiskPenalty, 0, 10)));

  // Arah & agreement
  const bullW = scored.filter((f) => f.bullish).reduce((s, f) => s + f.weight, 0);
  const bearW = 1 - bullW;
  const direction: "bull" | "bear" = bullW >= bearW ? "bull" : "bear";
  const agreement = direction === "bull" ? bullW : bearW;
  const conflicting = scored.filter((f) => (direction === "bull") !== f.bullish);
  const confirmations = scored.filter((f) => KEY_CONFIRMERS.includes(f.key) && f.bullish === (direction === "bull"));

  const confidence = Math.round(clamp(
    35 + agreement * 45 + Math.min(20, confirmations.length * 4) - Math.min(25, conflicting.length * 5)
  ));

  // Probabilitas (dinormalisasi ke 100)
  const bullRaw = clamp(50 + (bullW - 0.5) * 80 + (overallScore - 50) * 0.4);
  const bearRaw = clamp(50 + (0.5 - bullW) * 80 + (50 - overallScore) * 0.4);
  const neutralRaw = clamp(100 - Math.abs(bullW - 0.5) * 120 - Math.abs(overallScore - 50) * 0.8);
  const sum = bullRaw + bearRaw + neutralRaw || 1;
  const bullProbability = Math.round((bullRaw / sum) * 100);
  const bearProbability = Math.round((bearRaw / sum) * 100);
  const neutralProbability = clamp(100 - bullProbability - bearProbability);

  // Metrik turunan (default 50 bila faktor tak ada)
  const map: Record<string, ScoredFactor> = Object.fromEntries(scored.map((f) => [f.key, f]));
  const get = (k: string) => map[k]?.value ?? 50;
  const trendStrength = Math.round(get("trend"));
  const entryQuality = Math.round(clamp(0.3 * get("premiumDiscount") + 0.3 * get("orderBlocks") + 0.25 * get("fvg") + 0.15 * get("liquidity")));
  const exitQuality = Math.round(clamp(0.5 * (100 - get("premiumDiscount")) + 0.5 * get("relativeStrength")));
  const breakoutProbability = Math.round(clamp(0.4 * get("volume") + 0.3 * get("momentum") + 0.3 * get("trend")));
  const reversalProbability = Math.round(clamp(conflicting.length * 12 + Math.abs(get("relativeStrength") - 50)));
  const marketQuality = Math.round(clamp(0.6 * confidence + 0.4 * (100 - conflicting.length * 10)));
  const riskScore = Math.round(clamp(atrRiskPenalty * 10)); // 0-100 (penalti 0-10 → 0-100)

  const byContribDesc = [...scored].sort((a, b) => b.scoreContribution - a.scoreContribution);
  const topPositive = byContribDesc.filter((f) => f.bullish && f.value >= 50).slice(0, 4);
  const topNegative = [...scored].filter((f) => !f.bullish || f.value < 50).sort((a, b) => a.value - b.value).slice(0, 4);
  const missingConfirmations = Object.keys(BASELINE_WEIGHTS).filter((k) => !map[k]);
  const conflictingSignals = conflicting.map((f) => f.label);

  const summaryFactors = [
    `Skor ${overallScore}/100 (${gradeOf(overallScore)})`,
    `Arah dominan: ${direction === "bull" ? "Bullish" : "Bearish"} (${Math.round(agreement * 100)}% setuju)`,
    confirmations.length ? `Konfirmasi: ${confirmations.map((f) => f.label).join(", ")}` : "Konfirmasi kunci minim",
    conflicting.length ? `Konflik: ${conflictingSignals.join(", ")}` : "Tidak ada sinyal konflik",
  ];

  return {
    overallScore, institutionalGrade: gradeOf(overallScore), confidence, riskScore,
    bullProbability, bearProbability, neutralProbability,
    entryQuality, exitQuality, breakoutProbability, reversalProbability, trendStrength, marketQuality,
    factors: scored,
    explanation: { topPositive, topNegative, missingConfirmations, conflictingSignals },
    summaryFactors,
  };
}

// ── Adapter: bangun faktor dari data + hasil engine yang SUDAH dihitung ─────
export interface InstitutionalInput {
  pivots: { PP: number; R1: number; R2: number; R3: number; S1: number; S2: number; S3: number };
  currentPrice: number;
  ma20?: number | null;
  volume?: number | null;
  ma20Volume?: number | null;
  history?: OHLCV[] | null;
  liquidity?: LiquidityResult | null;
  orderBlocks?: OrderBlockResult | null;
  fvg?: FVGResult | null;
  marketMap?: MarketMap | null;
  // Eksternal opsional (0-100) — bila null/undefined, bobotnya diredistribusi.
  marketBreadth?: number | null;
  sectorRotation?: number | null;
  fearGreed?: number | null;
  newsImpact?: number | null;
  fundamental?: number | null;
}

const PHASE_SCORE: Record<string, number> = { Markup: 85, Accumulation: 70, Consolidation: 50, Distribution: 35, Markdown: 20 };

function sideScore(bull: number, bear: number): number {
  return clamp(50 + (bull - bear) / 2);
}

export function computeInstitutionalConfluence(input: InstitutionalInput): InstitutionalConfluence | null {
  const cp = Number(input.currentPrice);
  if (!input.pivots || !Number.isFinite(cp) || cp <= 0) return null;
  const ma20 = Number(input.ma20);
  const hist = input.history ?? [];
  const mm = input.marketMap ?? buildMarketMap({ pivots: input.pivots, currentPrice: cp, ma20: input.ma20 ?? null, volume: input.volume ?? null, ma20Volume: input.ma20Volume ?? null });

  // Trend
  const trendVal = Number.isFinite(ma20) && ma20 > 0
    ? clamp(50 + ((cp - ma20) / ma20) * 100 * 5)
    : (cp > input.pivots.PP ? 65 : 35);
  // Momentum (ROC ~10 bar)
  let momentumVal: number | null = null;
  if (hist.length >= 11) {
    const past = hist[hist.length - 11].close;
    if (past > 0) momentumVal = clamp(50 + ((cp - past) / past) * 100 * 4);
  }
  // Volume (rasio vs MA20)
  const vol = Number(input.volume), volMa = Number(input.ma20Volume);
  const volumeVal = Number.isFinite(vol) && Number.isFinite(volMa) && volMa > 0 ? clamp((vol / volMa) * 50) : null;
  // Relative Strength (posisi harga dalam range histori)
  let rsVal: number | null = null;
  if (hist.length >= 10) {
    const hi = Math.max(...hist.map((d) => d.high)), lo = Math.min(...hist.map((d) => d.low));
    if (hi > lo) rsVal = clamp(((cp - lo) / (hi - lo)) * 100);
  }
  // Market phase & premium/discount
  const phaseVal = mm ? (PHASE_SCORE[mm.phase] ?? 50) : null;
  const pdVal = mm ? (mm.position === "Discount" ? 70 : mm.position === "Premium" ? 40 : 50) : null;
  // Liquidity (buy-side vs sell-side kekuatan)
  let liqVal: number | null = null, liqBull = true;
  if (input.liquidity && input.liquidity.zones.length) {
    const bs = Math.max(0, ...input.liquidity.buySide.map((z) => z.confidence));
    const ss = Math.max(0, ...input.liquidity.sellSide.map((z) => z.confidence));
    liqVal = sideScore(bs, ss); liqBull = bs >= ss;
  }
  // Order blocks (bullish vs bearish aktif)
  let obVal: number | null = null, obBull = true;
  if (input.orderBlocks && (input.orderBlocks.bullish.length || input.orderBlocks.bearish.length)) {
    const bu = Math.max(0, ...input.orderBlocks.bullish.filter((b) => b.status !== "Invalidated").map((b) => b.confidence));
    const be = Math.max(0, ...input.orderBlocks.bearish.filter((b) => b.status !== "Invalidated").map((b) => b.confidence));
    obVal = sideScore(bu, be); obBull = bu >= be;
  }
  // FVG (bullish vs bearish prioritas)
  let fvgVal: number | null = null, fvgBull = true;
  if (input.fvg && (input.fvg.bullish.length || input.fvg.bearish.length)) {
    const bu = Math.max(0, ...input.fvg.bullish.filter((g) => g.status !== "Invalidated").map((g) => g.priorityScore));
    const be = Math.max(0, ...input.fvg.bearish.filter((g) => g.status !== "Invalidated").map((g) => g.priorityScore));
    fvgVal = sideScore(bu, be); fvgBull = bu >= be;
  }

  const ext = (v?: number | null) => (v == null || !Number.isFinite(Number(v)) ? null : clamp(Number(v)));

  const factors: FactorInput[] = [
    { key: "trend", label: "Trend", value: trendVal, weight: BASELINE_WEIGHTS.trend, description: "Harga vs MA20/PP" },
    { key: "momentum", label: "Momentum", value: momentumVal, weight: BASELINE_WEIGHTS.momentum, description: "ROC ~10 bar" },
    { key: "volume", label: "Volume", value: volumeVal, weight: BASELINE_WEIGHTS.volume, description: "Volume vs MA20" },
    { key: "relativeStrength", label: "Relative Strength", value: rsVal, weight: BASELINE_WEIGHTS.relativeStrength, description: "Posisi dalam range" },
    { key: "marketPhase", label: "Market Phase", value: phaseVal, weight: BASELINE_WEIGHTS.marketPhase, bullish: (phaseVal ?? 50) >= 50, description: mm?.phase },
    { key: "premiumDiscount", label: "Premium/Discount", value: pdVal, weight: BASELINE_WEIGHTS.premiumDiscount, bullish: (pdVal ?? 50) >= 50, description: mm?.position },
    { key: "liquidity", label: "Liquidity", value: liqVal, weight: BASELINE_WEIGHTS.liquidity, bullish: liqBull, description: "Buy vs sell-side" },
    { key: "orderBlocks", label: "Order Blocks", value: obVal, weight: BASELINE_WEIGHTS.orderBlocks, bullish: obBull, description: "OB bullish vs bearish" },
    { key: "fvg", label: "Fair Value Gaps", value: fvgVal, weight: BASELINE_WEIGHTS.fvg, bullish: fvgBull, description: "FVG bullish vs bearish" },
    { key: "marketBreadth", label: "Market Breadth", value: ext(input.marketBreadth), weight: BASELINE_WEIGHTS.marketBreadth, description: "Eksternal" },
    { key: "sectorRotation", label: "Sector Rotation", value: ext(input.sectorRotation), weight: BASELINE_WEIGHTS.sectorRotation, description: "Eksternal" },
    { key: "fearGreed", label: "Fear & Greed", value: ext(input.fearGreed), weight: BASELINE_WEIGHTS.fearGreed, description: "Eksternal" },
    { key: "news", label: "News Impact", value: ext(input.newsImpact), weight: BASELINE_WEIGHTS.news, description: "Eksternal" },
    { key: "fundamental", label: "Fundamental", value: ext(input.fundamental), weight: BASELINE_WEIGHTS.fundamental, description: "Eksternal" },
  ];

  // ATR risk → penalti 0-10 (volatilitas tinggi relatif harga = risiko)
  const atrPct = hist.length >= 2 ? (calcAtr(hist) / cp) * 100 : 0;
  const atrPenalty = clamp((atrPct - 2) * 2, 0, 10);

  return scoreConfluence(factors, atrPenalty);
}
