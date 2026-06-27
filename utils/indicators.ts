// Indikator teknikal bersama (reusable) untuk engine Phase 17.
// Catatan: orderBlocks.ts (Module 3) punya salinan ATR internal yang TIDAK boleh
// disentuh; modul baru memakai util ini agar tidak menduplikasi ke depannya.

import type { OHLCV } from "./vcp";

// Average True Range (rata-rata TR `period` bar terakhir). Min 1 agar aman dibagi.
export function atr(data: OHLCV[], period = 14): number {
  if (!Array.isArray(data) || data.length < 2) {
    return Math.max(1, (data?.[0]?.high ?? 1) - (data?.[0]?.low ?? 0));
  }
  const trs: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const h = data[i].high, l = data[i].low, pc = data[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length || 1;
}

export const clampScore = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
