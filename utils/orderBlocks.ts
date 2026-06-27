// Institutional Order Block Engine (Phase 17 · Module 3).
// Deterministik, dependency-free. Mendeteksi Bullish/Bearish Order Block (SMC):
// candle terakhir berlawanan sebelum displacement impulsif (BoS), lalu klasifikasi
// Fresh / Mitigated / Invalidated / Breaker. Murni matematis — AI hanya menafsirkan.

import type { OHLCV } from "./vcp";

export type OBType = "Bullish" | "Bearish";
export type OBStatus = "Fresh" | "Mitigated" | "Invalidated" | "Breaker";
export type OBStrength = "Major" | "Minor" | "Weak";

export interface OrderBlock {
  type: OBType;
  priceHigh: number;
  priceLow: number;
  strength: OBStrength;
  strengthScore: number; // 0-100
  confidence: number;     // 0-100
  createdAt: number;      // index bar pembentuk (dalam window)
  age: number;            // jumlah bar sejak terbentuk
  lastTouch: number | null; // umur sejak sentuhan terakhir (bar), null bila belum
  status: OBStatus;
  volumeConfirmed: boolean;
  atrDistance: number;    // jarak harga sekarang ke tengah zona dalam satuan ATR
  reactionCount: number;  // berapa kali harga bereaksi dari zona
}

export interface OrderBlockResult {
  blocks: OrderBlock[];
  bullish: OrderBlock[];
  bearish: OrderBlock[];
  nearestActive: OrderBlock | null; // OB aktif (Fresh/Mitigated/Breaker) terdekat ke harga
  range: { hi: number; lo: number };
  atr: number;
}

export interface OrderBlockOptions {
  lookback?: number;       // bar terakhir dianalisa (default 120)
  displacementAtr?: number;// ambang impulse dalam satuan ATR (default 0.8)
  maxPerSide?: number;     // batasi jumlah OB per arah (default 4)
}

const EMPTY: OrderBlockResult = { blocks: [], bullish: [], bearish: [], nearestActive: null, range: { hi: 0, lo: 0 }, atr: 0 };
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const strengthOf = (s: number): OBStrength => (s >= 70 ? "Major" : s >= 45 ? "Minor" : "Weak");

function atr14(data: OHLCV[], period = 14): number {
  if (data.length < 2) return Math.max(1, (data[0]?.high ?? 1) - (data[0]?.low ?? 0));
  const trs: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const h = data[i].high, l = data[i].low, pc = data[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length || 1;
}

export function analyzeOrderBlocks(data: OHLCV[], opts: OrderBlockOptions = {}): OrderBlockResult {
  if (!Array.isArray(data) || data.length < 10) return EMPTY;
  const series = data.slice(-(opts.lookback ?? 120));
  const n = series.length;
  const atr = atr14(series);
  const displacement = atr * (opts.displacementAtr ?? 0.8);
  const cp = series[n - 1].close;
  const hi = Math.max(...series.map((d) => d.high));
  const lo = Math.min(...series.map((d) => d.low));
  const avgVol = series.reduce((s, d) => s + (d.volume || 0), 0) / n || 1;
  const maxPerSide = opts.maxPerSide ?? 4;

  const blocks: OrderBlock[] = [];

  for (let i = 1; i < n - 1; i++) {
    const c = series[i];
    const isBear = c.close < c.open;
    const isBull = c.close > c.open;
    const f1 = series[i + 1];
    const f2 = series[i + 2];
    const fwdCloseUp = Math.max(f1.close, f2?.close ?? -Infinity);
    const fwdCloseDn = Math.min(f1.close, f2?.close ?? Infinity);

    let type: OBType | null = null;
    let impulse = 0;
    if (isBear && fwdCloseUp > c.high + displacement) { type = "Bullish"; impulse = (fwdCloseUp - c.high) / atr; }
    else if (isBull && fwdCloseDn < c.low - displacement) { type = "Bearish"; impulse = (c.low - fwdCloseDn) / atr; }
    if (!type) continue;

    const priceHigh = c.high;
    const priceLow = c.low;
    const volumeConfirmed = (f1.volume || 0) > avgVol || (c.volume || 0) > avgVol;

    // Pindai ke depan: mitigasi, invalidasi, reaksi.
    let touched = false, invalidated = false, breaker = false, reactionCount = 0;
    let lastTouchIdx: number | null = null;
    for (let j = i + 2; j < n; j++) {
      const b = series[j];
      const overlaps = b.low <= priceHigh && b.high >= priceLow;
      if (overlaps) { touched = true; lastTouchIdx = j; }
      if (!invalidated) {
        const closedThrough = type === "Bullish" ? b.close < priceLow : b.close > priceHigh;
        if (closedThrough) { invalidated = true; continue; }
        if (overlaps) reactionCount++; // reaksi sebelum invalidasi
      } else if (overlaps) {
        // setelah invalidasi, zona bereaksi dari sisi berlawanan → breaker block
        breaker = true;
      }
    }

    let status: OBStatus;
    if (breaker) status = "Breaker";
    else if (invalidated) status = "Invalidated";
    else if (touched) status = "Mitigated";
    else status = "Fresh";

    const age = n - 1 - i;
    const center = (priceHigh + priceLow) / 2;
    const atrDistance = Math.abs(cp - center) / atr;
    const freshBoost = status === "Fresh" ? 14 : status === "Breaker" ? 8 : 0;
    const strengthScore = Math.round(clamp(
      30 + Math.min(30, impulse * 14) + (volumeConfirmed ? 14 : 0) + Math.min(12, reactionCount * 6) + freshBoost - (status === "Invalidated" ? 26 : 0) - Math.min(14, age / n * 14)
    ));
    const confidence = Math.round(clamp(strengthScore + (volumeConfirmed ? 6 : -4)));

    blocks.push({
      type, priceHigh, priceLow, strength: strengthOf(strengthScore), strengthScore, confidence,
      createdAt: i, age, lastTouch: lastTouchIdx == null ? null : n - 1 - lastTouchIdx,
      status, volumeConfirmed, atrDistance, reactionCount,
    });
  }

  // Dedup zona yang sangat tumpang-tindih (jarak tengah < ATR*0.4) — simpan skor tertinggi.
  blocks.sort((a, b) => b.strengthScore - a.strengthScore);
  const kept: OrderBlock[] = [];
  for (const ob of blocks) {
    const c = (ob.priceHigh + ob.priceLow) / 2;
    if (kept.some((k) => k.type === ob.type && Math.abs((k.priceHigh + k.priceLow) / 2 - c) < atr * 0.4)) continue;
    kept.push(ob);
  }

  const bullish = kept.filter((b) => b.type === "Bullish").slice(0, maxPerSide).sort((a, b) => b.priceLow - a.priceLow);
  const bearish = kept.filter((b) => b.type === "Bearish").slice(0, maxPerSide).sort((a, b) => b.priceLow - a.priceLow);
  const active = [...bullish, ...bearish].filter((b) => b.status !== "Invalidated");
  const nearestActive = active.length
    ? active.reduce((best, b) => (b.atrDistance < best.atrDistance ? b : best))
    : null;

  return {
    blocks: [...bullish, ...bearish].sort((a, b) => b.priceHigh - a.priceHigh),
    bullish, bearish, nearestActive, range: { hi, lo }, atr,
  };
}
