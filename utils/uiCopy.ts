// Phase 23.2 — UI COPY HELPERS (PRESENTATION ONLY).
//
// Menerjemahkan label & reason-bullet dari engine deterministik (Trade Plan
// Formatter, Confluence, AI Validator) menjadi bahasa Indonesia awam untuk
// dashboard. TIDAK ada logika pasar: modul ini hanya memilih KATA dan label —
// seluruh angka/keputusan datang dari engine apa adanya.

import { humanizeJargon } from "./aiCopywriting";

export type ViewMode = "beginner" | "trader" | "pro";

// ── Util kecil (format tampilan, bukan kalkulasi) ─────────────────────────────
const fmtLevel = (v: number | null | undefined): string =>
  typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("id-ID") : "-";

const ORDINAL: Record<string, string> = { "1": "pertama", "2": "kedua", "3": "ketiga" };

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ── Terjemahan reason-bullet engine → bahasa awam ─────────────────────────────
// Frasa PERSIS dari tradePlanFormatter/decision engine diprioritaskan; sisanya
// jatuh ke kamus umum humanizeJargon. Urutan penting: spesifik dulu.
type Rule = readonly [RegExp, string] | readonly [RegExp, (m: string, ...g: string[]) => string];

const REASON_RULES: readonly Rule[] = [
  // RR & syarat keputusan
  [/\bRR\s+([\d.,]+)\s+di bawah minimum/gi, (_m, n) => `potensi untung ${n}× masih di bawah batas minimum`],
  [/\bRR\s+([\d.,]+)/gi, (_m, n) => `potensi untung ${n}× dari risiko`],
  [/confluence medium — menunggu konfirmasi/gi, "sinyal cukup tapi belum kuat — tunggu konfirmasi"],
  [/confluence lemah/gi, "sinyal pendukung masih lemah"],
  [/tidak ada proteksi SL valid/gi, "belum ada batas rugi yang aman"],
  [/tidak ada target valid/gi, "belum ada target harga yang jelas"],
  [/struktur tidak valid/gi, "struktur harga belum mendukung"],
  [/setup tidak memenuhi syarat/gi, "kondisi belum memenuhi syarat masuk"],
  // Order Block & struktur
  [/fresh\s+bullish\s+order\s?blocks?/gi, "area beli institusi yang masih segar"],
  [/fresh\s+bearish\s+order\s?blocks?/gi, "area jual institusi yang masih segar"],
  [/untested\s+bullish\s+order\s?blocks?/gi, "area beli institusi yang belum diuji ulang"],
  [/untested\s+bearish\s+order\s?blocks?/gi, "area jual institusi yang belum diuji ulang"],
  [/opposite\s+bearish\s+order\s?blocks?/gi, "area jual institusi di atas (target wajar)"],
  [/opposite\s+bullish\s+order\s?blocks?/gi, "area beli institusi di bawah (target wajar)"],
  [/breaker blocks?/gi, "area yang berubah fungsi jadi penyangga"],
  [/fresh blocks?/gi, "masih segar (belum diuji ulang)"],
  [/menunggu mitigasi order block/gi, "menunggu harga kembali ke area institusi"],
  [/menunggu retest/gi, "menunggu harga kembali menguji"],
  [/menunggu konfirmasi institusional/gi, "menunggu konfirmasi dari pelaku besar"],
  [/probabilitas lebih tinggi setelah pullback/gi, "peluang lebih besar setelah harga turun sejenak"],
  [/invalidation struktur entry/gi, "batas gagalnya skenario ini"],
  [/selaras demand institusional/gi, "searah minat beli pelaku besar"],
  [/selaras supply institusional/gi, "searah tekanan jual pelaku besar"],
  // Liquidity & konfluens
  [/sweep sell-side liquidity terkonfirmasi\s*\(close kembali di atasnya\)/gi,
    "harga sempat menusuk ke bawah lalu ditutup kembali di atasnya (jebakan turun terkonfirmasi)"],
  [/(?:sell|buy)[\s-]?side liquidity sweep retest/gi, "harga kembali menguji bekas area jebakan"],
  [/liquidity confluence/gi, "bertepatan dengan area ramai transaksi"],
  [/buy[\s-]?side liquidity/gi, "area ramai antrean beli"],
  [/sell[\s-]?side liquidity/gi, "area ramai antrean jual"],
  [/major liquidity/gi, "area ramai berskala besar"],
  [/major zone/gi, "zona besar"],
  [/nearest liquidity/gi, "area ramai terdekat"],
  [/unfilled fair value gap/gi, "celah harga yang belum terisi"],
  [/near current price/gi, "dekat dengan harga sekarang"],
  [/high confluence/gi, "banyak sinyal saling mendukung"],
  [/inside market map trend/gi, "searah tren besar pasar"],
  [/strong market trend/gi, "tren pasar sedang kuat"],
  // Pivot / level kunci
  [/pivot support S([123])\b/gi, (_m, d) => `penyangga bawah ${ORDINAL[d]}`],
  [/pivot resistance R([123])\b/gi, (_m, d) => `batas atas ${ORDINAL[d]}`],
  [/resistance R([123])\b/gi, (_m, d) => `batas atas ${ORDINAL[d]}`],
  [/support S([123])\b/gi, (_m, d) => `penyangga bawah ${ORDINAL[d]}`],
  [/menunggu retest level kunci/gi, "menunggu harga menguji ulang level kunci"],
  [/\bbelow\b/gi, "di bawah"],
  [/\babove\b/gi, "di atas"],
  // AI / harga
  [/entry terpilih ai validator/gi, "level masuk sudah diperiksa AI"],
  [/disetujui oleh institutional ai validator/gi, "sudah diperiksa & disetujui AI"],
  [/current market price/gi, "harga pasar saat ini"],
  // Long-only guidance (P22.2)
  [/struktur pasar bearish[^.]*short/gi, "pasar sedang turun — sistem hanya mencari peluang beli, lebih baik menunggu"],
  [/bear probability (\d+)% > bull (\d+)%/gi, (_m, a, b) => `peluang turun ${a}% lebih besar dari peluang naik ${b}%`],
  [/fase market map:\s*/gi, "fase pasar saat ini: "],
  [/market map trend berbalik bullish/gi, "arah pasar berbalik naik"],
  [/reaksi bullish pada order block demand/gi, "muncul reaksi beli di area institusi"],
  [/tunggu struktur bullish terbentuk\s*\(BoS\/ChoCh\)/gi, "tunggu tanda pembalikan naik terbentuk"],
  [/close kembali di atas pivot point/gi, "harga ditutup kembali di atas titik keseimbangan"],
];

/** Terjemahkan satu reason-bullet engine; marker (✔ • ·) dipertahankan. */
export function humanizeReason(reason: string | null | undefined): string {
  if (!reason) return "";
  const m = String(reason).match(/^([✔✓✅❌⏳⛔•·◦\-]+\s*)?([\s\S]*)$/);
  const marker = m?.[1] ?? "";
  let body = m?.[2] ?? String(reason);
  for (const [re, rep] of REASON_RULES) {
    body = typeof rep === "string" ? body.replace(re, rep) : body.replace(re, rep);
  }
  body = humanizeJargon(body); // sisa istilah umum (Order Block, FVG, bullish, dll.)
  return `${marker}${capitalize(body)}`;
}

/** Label sumber struktur (Entry/SL/TP source) versi awam. */
const SOURCE_LABELS: Record<string, string> = {
  "Order Block": "Area institusi",
  "Fair Value Gap": "Celah harga",
  "Liquidity": "Area ramai transaksi",
  "Pivot": "Level kunci",
  "AI Validator": "AI",
  "Market Map": "Peta pasar",
  "Current Price": "Harga sekarang",
  "Demand Zone": "Area minat beli",
  "Bullish Order Block": "Area beli institusi",
  "Fresh Bullish Order Block": "Area beli institusi (segar)",
  "Sell-side Liquidity": "Area ramai jual",
};
export function humanizeSource(source: string | null | undefined): string {
  if (!source) return "—";
  return SOURCE_LABELS[source] ?? humanizeReason(source);
}

// ── Label view (rename seksi & status) ────────────────────────────────────────
export function decisionView(state: string | null | undefined): { label: string; short: string } {
  if (state === "READY") return { label: "✅ Siap Dipantau", short: "✅ Siap" };
  if (state === "WAIT") return { label: "⏳ Tunggu Dulu", short: "⏳ Tunggu" };
  if (state === "SKIP") return { label: "❌ Lewati Dulu", short: "❌ Lewati" };
  return { label: "—", short: "—" };
}

export function scenarioView(style: "aggressive" | "conservative"): {
  title: string; badge: string; suitable: string; riskNote: string;
} {
  if (style === "aggressive") {
    return {
      title: "🔥 Masuk Sekarang",
      badge: "⚠️ Risiko Tinggi",
      suitable: "Trader aktif yang siap memantau layar",
      riskNote: "Tinggi — wajib disiplin batas rugi",
    };
  }
  return {
    title: "🛡️ Tunggu Konfirmasi",
    badge: "🎯 Peluang Lebih Pasti",
    suitable: "Pemula & yang mengutamakan keamanan",
    riskNote: "Lebih terukur — masuk setelah konfirmasi",
  };
}

export function sentimentView(sentiment: string | null | undefined): { label: string } {
  const s = String(sentiment ?? "").toLowerCase();
  if (/bullish/.test(s)) return { label: "📈 Naik" };
  if (/bearish/.test(s)) return { label: "📉 Turun" };
  if (/wait/.test(s)) return { label: "⏳ Tunggu" };
  if (/konsolidasi|netral|neutral|sideways/.test(s)) return { label: "↔️ Mendatar" };
  return { label: "↔️ Netral" };
}

const QUALITY_LABELS: Record<string, string> = {
  "Very High": "Sangat Tinggi", High: "Tinggi", Medium: "Sedang", Low: "Rendah",
};
export function qualityView(q: string | null | undefined): string {
  return q ? QUALITY_LABELS[q] ?? q : "—";
}

// ── 🤖 Kesimpulan AI — kartu utama (bias + kenapa + aksi) ─────────────────────
export interface ConclusionInput {
  /** Mode dual plan (long-only): BUY | WAIT | SKIP. */
  mode?: string | null;
  /** Decision state skenario rekomendasi. */
  decision?: string | null;
  confidence?: number | null;
  entry?: number | null;
  stopLoss?: number | null;
  target?: number | null;
  watchLow?: number | null;
  watchHigh?: number | null;
}
export interface ConclusionView {
  bias: "BUY" | "WAIT" | "SKIP";
  label: string;
  emoji: string;
  why: string;
  action: string;
}

export function aiConclusion(i: ConclusionInput): ConclusionView {
  const conf = typeof i.confidence === "number" && Number.isFinite(i.confidence) ? Math.round(i.confidence) : null;

  if (i.mode === "BUY") {
    const why =
      conf != null && conf >= 65
        ? `Banyak sinyal saling mendukung kenaikan — tingkat keyakinan AI ${conf}%.`
        : conf != null
        ? `Arah mulai condong naik, tetapi keyakinan AI baru ${conf}% — masih butuh konfirmasi.`
        : "Struktur pasar saat ini condong naik.";
    let action: string;
    if (i.decision === "READY") {
      const tp = i.target != null ? ` dan jual bertahap di ${fmtLevel(i.target)}` : "";
      const sl = i.stopLoss != null ? `, pasang batas rugi di ${fmtLevel(i.stopLoss)}` : "";
      action = `Boleh mulai masuk bertahap di area beli ${fmtLevel(i.entry)}${sl}${tp}.`;
    } else if (i.decision === "SKIP") {
      action = "Setup belum layak dieksekusi — amati dulu sampai syaratnya terpenuhi.";
    } else {
      action = `Belum saatnya masuk — tunggu harga mendekati area beli ${fmtLevel(i.entry)} atau tunggu konfirmasi berikutnya.`;
    }
    return { bias: "BUY", label: "BELI (BUY)", emoji: "🟢", why, action };
  }

  if (i.mode === "SKIP") {
    return {
      bias: "SKIP",
      label: "HINDARI DULU (SKIP)",
      emoji: "🔴",
      why: "Kondisi pasar belum memenuhi syarat minimal untuk beli.",
      action: "Simpan dana dulu dan tunggu — peluang selalu datang lagi.",
    };
  }

  // WAIT (default long-only saat struktur turun / belum ada setup)
  const watch =
    i.watchLow != null && i.watchHigh != null
      ? `Amati area ${fmtLevel(i.watchLow)} – ${fmtLevel(i.watchHigh)}; beli hanya setelah muncul tanda pembalikan yang jelas.`
      : "Tunggu tanda pembalikan yang jelas sebelum berpikir untuk beli.";
  return {
    bias: "WAIT",
    label: "TUNGGU (WAIT)",
    emoji: "🟡",
    why: "Tekanan jual masih lebih kuat — belum ada setup beli yang aman.",
    action: watch,
  };
}

// ── Tabel perbandingan sederhana (Strategy · Suitable · Opportunity · Risk) ───
interface PlanBrief { rr?: number | null; decision?: string | null }

function peluangText(rr: number | null | undefined): string {
  if (typeof rr !== "number" || !Number.isFinite(rr) || rr <= 0) return "Belum ada target";
  const x = rr.toFixed(1);
  if (rr >= 2) return `Untung ±${x}× dari risiko (besar)`;
  if (rr >= 1) return `Untung ±${x}× dari risiko (sehat)`;
  return `Untung ±${x}× dari risiko (kecil)`;
}

export function simpleComparisonRows(
  agg: PlanBrief,
  cons: PlanBrief,
  recommended: "aggressive" | "conservative",
  tie: boolean
): [string, string, string][] {
  const A = scenarioView("aggressive");
  const C = scenarioView("conservative");
  const star = (mine: boolean) => (tie ? "⚖ Sama kuat" : mine ? "⭐ Ya" : "—");
  return [
    ["Cocok Untuk", A.suitable, C.suitable],
    ["Peluang", peluangText(agg.rr), peluangText(cons.rr)],
    ["Risiko", A.riskNote, C.riskNote],
    ["Status", decisionView(agg.decision).label, decisionView(cons.decision).label],
    ["Pilihan AI", star(recommended === "aggressive"), star(recommended === "conservative")],
  ];
}
