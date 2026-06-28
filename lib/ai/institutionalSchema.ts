// Phase 17 · Module 2 — schema + kompresi data untuk AI Institutional Validator.
// Gemini HANYA menjelaskan output deterministik. Tidak ada kalkulasi di AI.

import { z } from "zod";
import type { InstitutionalConfluence } from "../../utils/institutionalConfluence";
import type { MarketMap } from "../../utils/marketMap";
import type { LiquidityResult } from "../../utils/liquidityEngine";
import type { OrderBlockResult } from "../../utils/orderBlocks";
import type { FVGResult } from "../../utils/fairValueGaps";

// ── Output schema (Zod) ─────────────────────────────────────────────────────
export const InstitutionalAnalysisSchema = z.object({
  institutionalBias: z.string(),
  confidenceExplanation: z.string(),
  executiveSummary: z.string(),
  marketNarrative: z.string(),
  bullScenario: z.string(),
  bearScenario: z.string(),
  neutralScenario: z.string(),
  topRisks: z.array(z.string()),
  topStrengths: z.array(z.string()),
  missingConfirmations: z.array(z.string()),
  conflictingSignals: z.array(z.string()),
  tradeManagement: z.object({
    entryLogic: z.string(),
    stopLogic: z.string(),
    takeProfitLogic: z.string(),
    invalidations: z.array(z.string()),
  }),
  institutionalCommentary: z.string(),
  nextCatalysts: z.array(z.string()),
});

export type InstitutionalAnalysis = z.infer<typeof InstitutionalAnalysisSchema>;

// ── Input ke validator (hasil engine deterministik, BUKAN OHLC mentah) ───────
export interface ValidatorInput {
  ticker: string;
  timeframe: string;
  confluence: InstitutionalConfluence;
  marketMap?: MarketMap | null;
  liquidity?: LiquidityResult | null;
  orderBlocks?: OrderBlockResult | null;
  fvg?: FVGResult | null;
  external?: {
    marketBreadth?: number | null;
    sectorRotation?: number | null;
    fearGreed?: number | null;
    newsImpact?: number | null;
    fundamentals?: number | null;
  };
}

const round = (n: number | null | undefined) => (n == null || !Number.isFinite(Number(n)) ? null : Math.round(Number(n)));
const orUnavail = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? "unavailable" : Math.round(Number(v)));

// Payload TERKOMPRESI yang dikirim ke Gemini — ringkas, tanpa array besar/OHLC.
export interface CompressedPayload {
  ticker: string;
  timeframe: string;
  confluence: Record<string, unknown>;
  marketMap: Record<string, unknown> | null;
  liquidity: Record<string, unknown> | null;
  orderBlocks: Record<string, unknown> | null;
  fairValueGaps: Record<string, unknown> | null;
  factors: Record<string, number>;
  external: Record<string, number | "unavailable">;
}

export function compressForAI(input: ValidatorInput): CompressedPayload {
  const c = input.confluence;
  const factorMap: Record<string, number> = {};
  for (const f of c.factors) factorMap[f.key] = Math.round(f.value);

  const mm = input.marketMap;
  const liq = input.liquidity;
  const ob = input.orderBlocks;
  const fvg = input.fvg;

  return {
    ticker: input.ticker,
    timeframe: input.timeframe,
    confluence: {
      overallScore: c.overallScore, grade: c.institutionalGrade, confidence: c.confidence, riskScore: c.riskScore,
      bullProbability: c.bullProbability, bearProbability: c.bearProbability, neutralProbability: c.neutralProbability,
      trendStrength: c.trendStrength, entryQuality: c.entryQuality, exitQuality: c.exitQuality,
      breakoutProbability: c.breakoutProbability, reversalProbability: c.reversalProbability, marketQuality: c.marketQuality,
      topStrengths: c.explanation.topPositive.map((f) => `${f.label} ${Math.round(f.value)}`),
      topWeaknesses: c.explanation.topNegative.map((f) => `${f.label} ${Math.round(f.value)}`),
      conflictingSignals: c.explanation.conflictingSignals,
      missingConfirmations: c.explanation.missingConfirmations,
    },
    marketMap: mm ? {
      trend: mm.trend, phase: mm.phase, position: mm.position,
      majorDemand: mm.majorDemand ? { bottom: round(mm.majorDemand.bottom), top: round(mm.majorDemand.top), confidence: mm.majorDemand.confidence } : null,
      majorSupply: mm.majorSupply ? { bottom: round(mm.majorSupply.bottom), top: round(mm.majorSupply.top), confidence: mm.majorSupply.confidence } : null,
      nearestLiquidity: mm.nearestLiquidity ? { type: mm.nearestLiquidity.type, center: round(mm.nearestLiquidity.center), confidence: mm.nearestLiquidity.confidence } : null,
    } : null,
    // Kompres: hanya nearest + terkuat (highest confidence) per sisi.
    liquidity: liq ? {
      buySideStrongest: liq.buySide.slice(0, 2).map((z) => ({ price: round(z.price), type: z.type, confidence: z.confidence, scope: z.scope })),
      sellSideStrongest: liq.sellSide.slice(0, 2).map((z) => ({ price: round(z.price), type: z.type, confidence: z.confidence, scope: z.scope })),
      recentSweep: liq.recentSweep ? { type: liq.recentSweep.type, price: round(liq.recentSweep.price) } : null,
    } : null,
    orderBlocks: ob ? {
      nearestActive: ob.nearestActive ? { type: ob.nearestActive.type, low: round(ob.nearestActive.priceLow), high: round(ob.nearestActive.priceHigh), status: ob.nearestActive.status, confidence: ob.nearestActive.confidence } : null,
      strongestBullish: ob.bullish[0] ? { low: round(ob.bullish[0].priceLow), high: round(ob.bullish[0].priceHigh), status: ob.bullish[0].status, confidence: ob.bullish[0].confidence } : null,
      strongestBearish: ob.bearish[0] ? { low: round(ob.bearish[0].priceLow), high: round(ob.bearish[0].priceHigh), status: ob.bearish[0].status, confidence: ob.bearish[0].confidence } : null,
    } : null,
    fairValueGaps: fvg ? {
      nearestActive: fvg.nearestActive ? { type: fvg.nearestActive.type, low: round(fvg.nearestActive.gapLow), high: round(fvg.nearestActive.gapHigh), status: fvg.nearestActive.status, priority: fvg.nearestActive.priority } : null,
      highestPriorityBullish: fvg.bullish[0] ? { low: round(fvg.bullish[0].gapLow), high: round(fvg.bullish[0].gapHigh), status: fvg.bullish[0].status, priority: fvg.bullish[0].priority } : null,
      highestPriorityBearish: fvg.bearish[0] ? { low: round(fvg.bearish[0].gapLow), high: round(fvg.bearish[0].gapHigh), status: fvg.bearish[0].status, priority: fvg.bearish[0].priority } : null,
    } : null,
    factors: factorMap,
    external: {
      marketBreadth: orUnavail(input.external?.marketBreadth),
      sectorRotation: orUnavail(input.external?.sectorRotation),
      fearGreed: orUnavail(input.external?.fearGreed),
      newsImpact: orUnavail(input.external?.newsImpact),
      fundamentals: orUnavail(input.external?.fundamentals),
    },
  };
}

// Hash ringan dari confluence (untuk cache key).
export function confluenceHash(c: InstitutionalConfluence): string {
  return [c.overallScore, c.institutionalGrade, c.confidence, c.bullProbability, c.trendStrength].join("-");
}

export function aiCacheKey(ticker: string, timeframe: string, c: InstitutionalConfluence): string {
  return `${(ticker || "?").toUpperCase()}|${(timeframe || "daily").toLowerCase()}|${confluenceHash(c)}`;
}
