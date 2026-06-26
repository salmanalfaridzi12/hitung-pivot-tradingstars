import { OHLCV } from "./vcp";

export type TrendStatus = "NAIK" | "TURUN" | "KONSOLIDASI";

export interface MultiTimeframeTrend {
  daily: TrendStatus;
  weekly: TrendStatus;
  monthly: TrendStatus;
}

/**
 * Menghitung Simple Moving Average (SMA) dari close price
 */
function calculateSMA(data: OHLCV[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
  return sum / period;
}

/**
 * Menentukan tren berdasarkan kondisi:
 * NAIK: Close > MA20 dan MA20 > MA50
 * TURUN: Close < MA20 dan MA20 < MA50
 * KONSOLIDASI: Selain di atas
 */
function determineTrend(data: OHLCV[]): TrendStatus {
  const ma20 = calculateSMA(data, 20);
  const ma50 = calculateSMA(data, 50);

  if (ma20 === null || ma50 === null || data.length === 0) {
    return "KONSOLIDASI";
  }

  const lastClose = data[data.length - 1]!.close;

  if (lastClose > ma20 && ma20 > ma50) {
    return "NAIK";
  } else if (lastClose < ma20 && ma20 < ma50) {
    return "TURUN";
  } else {
    return "KONSOLIDASI";
  }
}

/**
 * Menganalisis trend untuk 1D, 1W, dan 1M dari data harian.
 */
export function analyzeMultiTimeframe(dailyData: OHLCV[]): MultiTimeframeTrend {
  if (!dailyData || dailyData.length === 0) {
    return {
      daily: "KONSOLIDASI",
      weekly: "KONSOLIDASI",
      monthly: "KONSOLIDASI",
    };
  }

  // 1. Tren Harian (1D)
  const daily = determineTrend(dailyData);

  // Balikkan array agar pengelompokan dimulai dari data terbaru (paling kanan)
  const reverseData = [...dailyData].reverse();

  // 2. Tren Mingguan (1W) - Agregasi per 5 bar
  const weeklyChunks: OHLCV[] = [];
  for (let i = 0; i < reverseData.length; i += 5) {
    // Ambil 5 bar terbaru, balikkan lagi ke urutan kronologis untuk agregasi
    const chunk = reverseData.slice(i, i + 5).reverse();
    if (chunk.length > 0) {
      weeklyChunks.push({
        open: chunk[0]!.open,
        high: Math.max(...chunk.map((c) => c.high)),
        low: Math.min(...chunk.map((c) => c.low)),
        close: chunk[chunk.length - 1]!.close,
        volume: chunk.reduce((acc, c) => acc + c.volume, 0),
      });
    }
  }
  // Kembalikan chunk ke urutan kronologis untuk kalkulasi MA
  const weeklyData = weeklyChunks.reverse();
  const weekly = determineTrend(weeklyData);

  // 3. Tren Bulanan (1M) - Agregasi per 20 bar
  const monthlyChunks: OHLCV[] = [];
  for (let i = 0; i < reverseData.length; i += 20) {
    // Ambil 20 bar terbaru, balikkan lagi ke urutan kronologis untuk agregasi
    const chunk = reverseData.slice(i, i + 20).reverse();
    if (chunk.length > 0) {
      monthlyChunks.push({
        open: chunk[0]!.open,
        high: Math.max(...chunk.map((c) => c.high)),
        low: Math.min(...chunk.map((c) => c.low)),
        close: chunk[chunk.length - 1]!.close,
        volume: chunk.reduce((acc, c) => acc + c.volume, 0),
      });
    }
  }
  // Kembalikan chunk ke urutan kronologis untuk kalkulasi MA
  const monthlyData = monthlyChunks.reverse();
  const monthly = determineTrend(monthlyData);

  return { daily, weekly, monthly };
}
