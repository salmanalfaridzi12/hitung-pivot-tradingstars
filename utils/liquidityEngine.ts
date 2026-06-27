// Institutional Liquidity Engine (Phase 17 · Module 1).
// Deterministik, dependency-free. Mendeteksi area likuiditas SMC dari OHLCV:
// Equal High/Low, Buy/Sell Side Liquidity, Liquidity Pool, Sweep/Stop Hunt,
// Internal/External Liquidity. Murni matematis — AI hanya menafsirkan (Module 2).

import type { OHLCV } from "./vcp";

export type LiquidityType =
  | "BSL"        // Buy Side Liquidity (di atas swing high)
  | "SSL"        // Sell Side Liquidity (di bawah swing low)
  | "EQH"        // Equal Highs (liquidity pool)
  | "EQL"        // Equal Lows (liquidity pool)
  | "Sweep"      // Liquidity sweep terbaru
  | "StopHunt";  // Stop hunt (sweep + close balik)

export type LiquidityStrength = "Major" | "Minor" | "Weak";
export type LiquidityScope = "Internal" | "External";

export interface LiquidityZone {
  price: number;
  confidence: number; // 0-100
  strength: LiquidityStrength;
  age: number;        // jumlah bar sejak terbentuk
  touched: boolean;   // harga sempat menyentuh kembali
  broken: boolean;    // sudah disapu / ditembus
  type: LiquidityType;
  scope: LiquidityScope;
  side: "buy" | "sell";
  label: string;
}

export interface LiquidityResult {
  zones: LiquidityZone[];
  buySide: LiquidityZone[];  // di atas harga terakhir
  sellSide: LiquidityZone[]; // di bawah harga terakhir
  recentSweep: LiquidityZone | null;
  range: { hi: number; lo: number };
}

interface Pivot { index: number; price: number; }

const EMPTY: LiquidityResult = { zones: [], buySide: [], sellSide: [], recentSweep: null, range: { hi: 0, lo: 0 } };
const strengthOf = (c: number): LiquidityStrength => (c >= 75 ? "Major" : c >= 50 ? "Minor" : "Weak");
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Swing fractal: ekstrem lokal dalam ±window bar.
function detectSwings(data: OHLCV[], window: number): { highs: Pivot[]; lows: Pivot[] } {
  const highs: Pivot[] = [];
  const lows: Pivot[] = [];
  for (let i = window; i < data.length - window; i++) {
    const b = data[i];
    let isHigh = true, isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (data[j].high >= b.high) isHigh = false;
      if (data[j].low <= b.low) isLow = false;
    }
    if (isHigh) highs.push({ index: i, price: b.high });
    if (isLow) lows.push({ index: i, price: b.low });
  }
  return { highs, lows };
}

// Kelompokkan pivot dengan harga ~sama (toleransi) → Equal High/Low (liquidity pool).
function groupEqual(pivots: Pivot[], tol: number): { price: number; members: Pivot[] }[] {
  const out: { price: number; members: Pivot[] }[] = [];
  for (const p of pivots) {
    const g = out.find((x) => Math.abs(x.price - p.price) <= tol);
    if (g) { g.members.push(p); g.price = g.members.reduce((s, m) => s + m.price, 0) / g.members.length; }
    else out.push({ price: p.price, members: [p] });
  }
  return out;
}

export interface LiquidityOptions {
  window?: number;   // fractal window (default 3)
  tolPct?: number;   // toleransi equal-level dalam % harga (default 0.25)
  lookback?: number; // jumlah bar terakhir dianalisa (default 120)
}

export function analyzeLiquidity(data: OHLCV[], opts: LiquidityOptions = {}): LiquidityResult {
  if (!Array.isArray(data) || data.length < 12) return EMPTY;
  const window = opts.window ?? 3;
  const lookback = opts.lookback ?? 120;
  const series = data.slice(-lookback);
  const n = series.length;
  const last = series[n - 1];
  const cp = last.close;
  const hi = Math.max(...series.map((d) => d.high));
  const lo = Math.min(...series.map((d) => d.low));
  const tol = cp * ((opts.tolPct ?? 0.25) / 100);
  const avgVol = series.reduce((s, d) => s + (d.volume || 0), 0) / n;

  const { highs, lows } = detectSwings(series, window);
  const eqHighs = groupEqual(highs, tol).filter((g) => g.members.length >= 1);
  const eqLows = groupEqual(lows, tol).filter((g) => g.members.length >= 1);

  const zones: LiquidityZone[] = [];

  const buildZone = (
    price: number, members: Pivot[], side: "buy" | "sell",
  ): LiquidityZone => {
    const lastIdx = Math.max(...members.map((m) => m.index));
    const age = n - 1 - lastIdx;
    const equalCount = members.length;
    // touched: ada bar SETELAH terbentuk yang menyentuh ±tol
    const touched = series.slice(lastIdx + 1).some((d) => d.low - tol <= price && d.high + tol >= price);
    // broken: ada bar yang menembus jelas (high>price untuk buy / low<price untuk sell)
    const broken = side === "buy"
      ? series.slice(lastIdx + 1).some((d) => d.high > price + tol)
      : series.slice(lastIdx + 1).some((d) => d.low < price - tol);
    // confidence: equal-count + recency (umur muda) + volume di bar pembentuk
    const recency = 1 - Math.min(1, age / n);
    const volAtForm = series[lastIdx]?.volume || 0;
    const volBoost = avgVol > 0 && volAtForm > avgVol ? 12 : 0;
    const confidence = Math.round(clamp(34 + (equalCount - 1) * 18 + recency * 26 + volBoost - (broken ? 22 : 0)));
    const isEqual = equalCount >= 2;
    const type: LiquidityType = isEqual ? (side === "buy" ? "EQH" : "EQL") : (side === "buy" ? "BSL" : "SSL");
    const scope: LiquidityScope = side === "buy"
      ? (price >= hi - tol ? "External" : "Internal")
      : (price <= lo + tol ? "External" : "Internal");
    return {
      price, confidence, strength: strengthOf(confidence), age, touched, broken, type, scope, side,
      label: `${type}${isEqual ? ` ×${equalCount}` : ""}`,
    };
  };

  for (const g of eqHighs) if (g.price > cp) zones.push(buildZone(g.price, g.members, "buy"));
  for (const g of eqLows) if (g.price < cp) zones.push(buildZone(g.price, g.members, "sell"));

  // Liquidity Sweep / Stop Hunt: bar terbaru menembus swing lalu close balik.
  let recentSweep: LiquidityZone | null = null;
  const swingHi = highs.length ? Math.max(...highs.map((h) => h.price)) : hi;
  const swingLo = lows.length ? Math.min(...lows.map((l) => l.price)) : lo;
  for (let i = n - 1; i >= Math.max(0, n - 6); i--) {
    const b = series[i];
    const sweptHigh = b.high > swingHi && b.close < swingHi;
    const sweptLow = b.low < swingLo && b.close > swingLo;
    if (sweptHigh || sweptLow) {
      const closedBack = sweptHigh ? b.close < b.open : b.close > b.open;
      recentSweep = {
        price: sweptHigh ? b.high : b.low,
        confidence: clamp(70 + (closedBack ? 15 : 0)),
        strength: "Major", age: n - 1 - i, touched: true, broken: true,
        type: closedBack ? "StopHunt" : "Sweep",
        scope: "External", side: sweptHigh ? "buy" : "sell",
        label: closedBack ? "Stop Hunt" : "Liquidity Sweep",
      };
      break;
    }
  }
  if (recentSweep) zones.push(recentSweep);

  zones.sort((a, b) => b.price - a.price);
  return {
    zones,
    buySide: zones.filter((z) => z.side === "buy" && z.type !== "StopHunt" && z.type !== "Sweep"),
    sellSide: zones.filter((z) => z.side === "sell" && z.type !== "StopHunt" && z.type !== "Sweep"),
    recentSweep,
    range: { hi, lo },
  };
}
