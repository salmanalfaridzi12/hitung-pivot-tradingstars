/**
 * Volatility Contraction Pattern (VCP) detector — Mark Minervini style.
 * Pure, client-side, dependency-free. O(n · window) — aman untuk ratusan bar.
 */

export interface OHLCV {
  /** opsional: tanggal/epoch — tidak dipakai logika, hanya passthrough */
  time?: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type VcpStatus = "NONE" | "DEVELOPING" | "TIGHT_READY";

export interface Pivot {
  index: number; // index absolut pada array `data`
  type: "high" | "low";
  price: number;
}

export interface VcpResult {
  vcpStatus: VcpStatus;
  /** persentase drawdown tiap leg kontraksi (negatif), kronologis & makin mengecil. cth: [-22, -11, -4] */
  contractions: number[];
  contractionCount: number;
  /** kedalaman kontraksi terakhir dalam % positif (cth: 4) — null bila tidak ada */
  lastDepthPct: number | null;
  /** true bila volume 3 hari terakhir semuanya di bawah MA20 volume */
  volumeDryUp: boolean;
  /** zig-zag swing pivots (untuk overlay/visualisasi, opsional) */
  pivots: Pivot[];
}

// --- Parameter (Minervini-ish) ---------------------------------------------
const LOOKBACK_DAYS = 120; // jendela analisa
const PIVOT_WINDOW = 5; // bar di kiri/kanan untuk swing fractal
const VOLUME_MA = 20;
const TIGHT_THRESHOLD = 5; // % — kontraksi terakhir dianggap "ketat"
const MIN_CONTRACTIONS = 2; // minimal 2 leg mengecil untuk dianggap VCP
const MIN_BASE_DEPTH = 8; // % — koreksi awal harus signifikan (tolak noise sideways)

const EMPTY: VcpResult = {
  vcpStatus: "NONE",
  contractions: [],
  contractionCount: 0,
  lastDepthPct: null,
  volumeDryUp: false,
  pivots: [],
};

const mean = (arr: readonly number[]): number =>
  arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

/**
 * Analisa VCP dari deret OHLCV historis.
 * @param data deret OHLCV kronologis (lama → baru), mis. dari yfinance.
 */
export function analyzeVCP(data: OHLCV[]): VcpResult {
  if (!Array.isArray(data) || data.length < PIVOT_WINDOW * 2 + 5) return EMPTY;

  // 1. Ambil 120 bar terakhir
  const window = data.slice(-LOOKBACK_DAYS);
  const n = window.length;
  const offset = data.length - n; // untuk index absolut

  // 2. Deteksi swing highs & lows (fractal: ekstrem lokal dalam ±PIVOT_WINDOW)
  const rawPivots: Pivot[] = [];
  for (let i = PIVOT_WINDOW; i < n - PIVOT_WINDOW; i++) {
    const bar = window[i];
    if (!bar) continue;
    const hi = bar.high;
    const lo = bar.low;
    let isHigh = true;
    let isLow = true;
    for (let j = i - PIVOT_WINDOW; j <= i + PIVOT_WINDOW; j++) {
      if (j === i) continue;
      const o = window[j];
      if (!o) continue;
      if (o.high >= hi) isHigh = false;
      if (o.low <= lo) isLow = false;
    }
    if (isHigh) rawPivots.push({ index: i + offset, type: "high", price: hi });
    else if (isLow) rawPivots.push({ index: i + offset, type: "low", price: lo });
  }

  // 3. Zig-zag: rapatkan pivot sejenis berturut-turut → simpan yang paling ekstrem
  const zig: Pivot[] = [];
  for (const p of rawPivots) {
    const last = zig[zig.length - 1];
    if (!last || last.type !== p.type) {
      zig.push(p);
    } else if (
      (p.type === "high" && p.price > last.price) ||
      (p.type === "low" && p.price < last.price)
    ) {
      zig[zig.length - 1] = p;
    }
  }

  // 4. Kontraksi = drawdown dari tiap Swing High ke Swing Low berikutnya (negatif)
  const legs: number[] = [];
  for (let i = 0; i < zig.length - 1; i++) {
    const a = zig[i];
    const b = zig[i + 1];
    if (a && b && a.type === "high" && b.type === "low" && a.price > 0) {
      legs.push(((b.price - a.price) / a.price) * 100);
    }
  }

  if (legs.length < MIN_CONTRACTIONS) return { ...EMPTY, pivots: zig };

  // 5. Ambil suffix kontraksi yang magnitudonya terus mengecil (cth: -20 → -10 → -5)
  const lastLeg = legs[legs.length - 1] as number;
  const tail: number[] = [lastLeg];
  for (let i = legs.length - 2; i >= 0; i--) {
    const cur = legs[i] as number;
    const front = tail[0] as number;
    if (Math.abs(cur) > Math.abs(front)) tail.unshift(cur);
    else break;
  }

  if (tail.length < MIN_CONTRACTIONS) {
    return { ...EMPTY, contractions: tail, contractionCount: tail.length, pivots: zig };
  }

  // Tolak base yang terlalu dangkal (noise sideways) — koreksi awal harus signifikan
  if (Math.abs(tail[0] as number) < MIN_BASE_DEPTH) {
    return { ...EMPTY, pivots: zig };
  }

  const lastDepthPct = Math.abs(tail[tail.length - 1] as number);

  // 6. Volume dry-up: MA20 volume vs volume 3 hari terakhir
  const vols = data.map((d) => d.volume);
  const ma20 = mean(vols.slice(-Math.min(VOLUME_MA, vols.length)));
  const last3 = vols.slice(-3);
  const volumeDryUp = last3.length === 3 && ma20 > 0 && last3.every((v) => v < ma20);

  // 7. Status
  let vcpStatus: VcpStatus = "DEVELOPING";
  if (lastDepthPct <= TIGHT_THRESHOLD && volumeDryUp) vcpStatus = "TIGHT_READY";

  return {
    vcpStatus,
    contractions: tail,
    contractionCount: tail.length,
    lastDepthPct,
    volumeDryUp,
    pivots: zig,
  };
}
