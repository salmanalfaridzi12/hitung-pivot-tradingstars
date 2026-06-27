// Institutional Fair Value Gap Engine (Phase 17 · Module 4).
// Deterministik, dependency-free. FVG = imbalance 3-candle: gap antara candle-1
// dan candle-3 (candle-2 impulse). Reuse ATR dari ./indicators. Tidak menyentuh
// logika Module 3. AI hanya menafsirkan (modul berikutnya).

import type { OHLCV } from "./vcp";
import { atr as calcAtr, clampScore as clamp } from "./indicators";
import type { MarketPhase } from "./marketMap";

export type FVGType = "Bullish" | "Bearish";
export type FVGStatus = "Fresh" | "Partially Filled" | "Filled" | "Invalidated";
export type FVGPriority = "High" | "Medium" | "Low";

export interface FairValueGap {
  type: FVGType;
  gapHigh: number;
  gapLow: number;
  gapSize: number;
  gapPercent: number;     // gapSize relatif harga (%)
  createdAt: number;      // index candle tengah (impulse)
  age: number;            // bar sejak terbentuk
  filledPercent: number;  // 0-100 seberapa dalam gap terisi
  remainingGap: number;
  status: FVGStatus;
  priority: FVGPriority;
  priorityScore: number;  // 0-100
  confidence: number;     // 0-100
  reactionCount: number;
  atrDistance: number;    // jarak harga sekarang ke tengah gap (ATR)
  volumeConfirmation: boolean;
}

export interface FVGResult {
  gaps: FairValueGap[];
  bullish: FairValueGap[];
  bearish: FairValueGap[];
  nearestActive: FairValueGap | null;
  range: { hi: number; lo: number };
  atr: number;
}

export interface FVGOptions {
  lookback?: number;    // bar terakhir dianalisa (default 120)
  minGapAtr?: number;   // gap minimal dalam satuan ATR (default 0.1)
  maxPerSide?: number;  // batas FVG per arah (default 5)
  phase?: MarketPhase | null; // konteks fase pasar (reuse Market Map) untuk prioritas
}

const EMPTY: FVGResult = { gaps: [], bullish: [], bearish: [], nearestActive: null, range: { hi: 0, lo: 0 }, atr: 0 };
const priorityOf = (s: number): FVGPriority => (s >= 66 ? "High" : s >= 40 ? "Medium" : "Low");

export function analyzeFairValueGaps(data: OHLCV[], opts: FVGOptions = {}): FVGResult {
  if (!Array.isArray(data) || data.length < 5) return EMPTY;
  const series = data.slice(-(opts.lookback ?? 120));
  const n = series.length;
  const atr = calcAtr(series);
  const cp = series[n - 1].close;
  const hi = Math.max(...series.map((d) => d.high));
  const lo = Math.min(...series.map((d) => d.low));
  const avgVol = series.reduce((s, d) => s + (d.volume || 0), 0) / n || 1;
  const minGap = atr * (opts.minGapAtr ?? 0.1);
  const maxPerSide = opts.maxPerSide ?? 5;
  const phase = opts.phase ?? null;

  const gaps: FairValueGap[] = [];

  for (let i = 0; i < n - 2; i++) {
    const c1 = series[i];
    const mid = series[i + 1];
    const c3 = series[i + 2];

    let type: FVGType | null = null;
    let gapHigh = 0, gapLow = 0;
    // Bullish FVG: low candle-3 > high candle-1 (celah ke atas).
    if (c3.low > c1.high) { type = "Bullish"; gapLow = c1.high; gapHigh = c3.low; }
    // Bearish FVG: high candle-3 < low candle-1 (celah ke bawah).
    else if (c3.high < c1.low) { type = "Bearish"; gapLow = c3.high; gapHigh = c1.low; }
    if (!type) continue;

    const gapSize = gapHigh - gapLow;
    if (gapSize < minGap) continue;

    const createdAt = i + 1;
    const age = n - 1 - createdAt;
    const center = (gapHigh + gapLow) / 2;
    const volumeConfirmation = (mid.volume || 0) > avgVol;

    // Pengisian & reaksi: pindai bar setelah candle-3.
    let deepest = type === "Bullish" ? gapHigh : gapLow; // titik penetrasi terdalam
    let invalidated = false, reactionCount = 0;
    for (let j = i + 3; j < n; j++) {
      const b = series[j];
      const overlaps = b.low <= gapHigh && b.high >= gapLow;
      if (type === "Bullish") {
        if (b.low < deepest) deepest = Math.max(gapLow, b.low); // turun mengisi dari atas
        if (b.close < gapLow) invalidated = true;
      } else {
        if (b.high > deepest) deepest = Math.min(gapHigh, b.high); // naik mengisi dari bawah
        if (b.close > gapHigh) invalidated = true;
      }
      if (overlaps) reactionCount++;
    }

    const penetration = type === "Bullish"
      ? (gapHigh - deepest) / gapSize
      : (deepest - gapLow) / gapSize;
    const filledPercent = Math.round(clamp(penetration * 100));
    const remainingGap = +(gapSize * (1 - filledPercent / 100)).toFixed(4);

    let status: FVGStatus;
    if (invalidated) status = "Invalidated";
    else if (filledPercent >= 95) status = "Filled";
    else if (filledPercent > 0) status = "Partially Filled";
    else status = "Fresh";

    const gapAtr = gapSize / atr;
    const atrDistance = Math.abs(cp - center) / atr;
    const aligned = phase != null && (
      (type === "Bullish" && (phase === "Accumulation" || phase === "Markup")) ||
      (type === "Bearish" && (phase === "Distribution" || phase === "Markdown"))
    );
    const priorityScore = Math.round(clamp(
      clamp(gapAtr * 22, 0, 35)
      + (volumeConfirmation ? 18 : 0)
      + clamp(reactionCount * 8, 0, 18)
      + (status === "Fresh" ? 15 : status === "Partially Filled" ? 8 : 0)
      + (aligned ? 12 : 0)
      - clamp((age / n) * 14, 0, 14)
      - (status === "Invalidated" ? 24 : 0)
    ));
    const confidence = Math.round(clamp(
      40 + clamp(gapAtr * 18, 0, 30) + (volumeConfirmation ? 14 : 0) + clamp(reactionCount * 6, 0, 16) - (status === "Invalidated" ? 22 : 0)
    ));

    gaps.push({
      type, gapHigh, gapLow, gapSize: +gapSize.toFixed(4),
      gapPercent: +((gapSize / (cp || 1)) * 100).toFixed(2),
      createdAt, age, filledPercent, remainingGap, status,
      priority: priorityOf(priorityScore), priorityScore, confidence,
      reactionCount, atrDistance: +atrDistance.toFixed(2), volumeConfirmation,
    });
  }

  gaps.sort((a, b) => b.priorityScore - a.priorityScore);
  const bullish = gaps.filter((g) => g.type === "Bullish").slice(0, maxPerSide).sort((a, b) => b.gapHigh - a.gapHigh);
  const bearish = gaps.filter((g) => g.type === "Bearish").slice(0, maxPerSide).sort((a, b) => b.gapHigh - a.gapHigh);
  const active = [...bullish, ...bearish].filter((g) => g.status !== "Invalidated" && g.status !== "Filled");
  const nearestActive = active.length
    ? active.reduce((best, g) => (g.atrDistance < best.atrDistance ? g : best))
    : null;

  return {
    gaps: [...bullish, ...bearish].sort((a, b) => b.gapHigh - a.gapHigh),
    bullish, bearish, nearestActive, range: { hi, lo }, atr,
  };
}
