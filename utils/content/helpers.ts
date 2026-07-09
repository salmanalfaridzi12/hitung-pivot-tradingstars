// Phase 24 — CONTENT ENGINE · HELPERS (presentation-only).
// Util format & penyusunan seksi. Satu-satunya "aritmetika" adalah memformat
// angka dan menghitung panjang string — tidak ada kalkulasi pasar.

import type { ContentInput, Mood } from "./types";
import { E } from "./emoji";
import { humanizeJargon } from "./humanizer";

export const DISCLAIMER =
  "⚠️ Analisa ini bersifat edukatif dan bukan merupakan rekomendasi investasi. " +
  "Selalu lakukan analisa pribadi serta gunakan manajemen risiko sebelum mengambil keputusan trading.";

// ── Nilai & format ────────────────────────────────────────────────────────────
export const isNA = (v: unknown): boolean => {
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  return (
    s === "" || s === "-" || s === "n/a" || s === "na" ||
    s === "tidak ada" || s === "null" ||
    /wait[\s_]*(and[\s_]*)?see/.test(s)
  );
};

export const fmtLevel = (v: number | string | null | undefined): string => {
  if (v == null) return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("id-ID") : "-";
  const s = String(v).trim();
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return s !== "" && Number.isFinite(n) && /\d/.test(s) ? n.toLocaleString("id-ID") : s || "-";
};

export function parseRR(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const tokens = String(v).match(/\d+(?:[.,]\d+)?/g);
  if (!tokens?.length) return null;
  const n = Number(tokens[tokens.length - 1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function moodOf(sentiment: string | null | undefined): Mood {
  const s = String(sentiment ?? "").toLowerCase();
  if (/bullish/.test(s)) return "bullish";
  if (/bearish/.test(s)) return "bearish";
  if (/wait/.test(s)) return "wait";
  return "sideways";
}

export function symbolOf(d: ContentInput): string {
  const raw = String(d.symbol ?? "").trim();
  return raw ? raw.toUpperCase() : "Saham ini";
}

export function scoreOf(d: ContentInput): number | null {
  return typeof d.confluenceScore === "number" && Number.isFinite(d.confluenceScore)
    ? Math.round(d.confluenceScore)
    : null;
}

export function deriveCrisis(d: ContentInput, mood: Mood): boolean {
  return (
    d.crisis ??
    (mood === "bearish" || mood === "wait" || (isNA(d.entryAggressive?.level) && isNA(d.entryDemand?.level)))
  );
}

// ── Keacakan deterministik (Phase 7) ─────────────────────────────────────────
// mulberry32: PRNG kecil & stabil — seed sama selalu menghasilkan urutan sama,
// sehingga variasi kalimat tetap bisa diuji.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rng: () => number, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length) % arr.length];

// ── Penyusunan seksi + auto-trim (Phase 6) ────────────────────────────────────
// flex 0/undefined = tidak boleh disentuh (Plan, Question, Hashtag).
// flex lebih besar = dipangkas lebih dulu. min = panjang minimum sebelum dibuang.
export interface Section {
  text: string;
  flex?: number;
  min?: number;
}

export function truncateWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, Math.max(0, max - 1));
  const at = cut.lastIndexOf(" ");
  return (at > 20 ? cut.slice(0, at) : cut).replace(/[\s,;:—-]+$/, "") + "…";
}

export function fitSections(sections: Section[], limit: number): string {
  const parts = sections.filter((s) => s.text && s.text.trim());
  const join = () => parts.map((s) => s.text).filter(Boolean).join("\n\n");
  if (join().length <= limit) return join();

  const order = parts.filter((s) => (s.flex ?? 0) > 0).sort((a, b) => (b.flex ?? 0) - (a.flex ?? 0));
  for (const s of order) {
    const over = join().length - limit;
    if (over <= 0) break;
    const target = s.text.length - over;
    if (target < Math.max(s.min ?? 0, 24)) s.text = ""; // terlalu pendek → buang seksi
    else s.text = truncateWords(s.text, target);
  }
  const out = join();
  return out.length <= limit ? out : truncateWords(out, limit); // guard terakhir (teoretis)
}

// ── Blok Trading Plan bersama (level dari AI, apa adanya) ─────────────────────
export function planBlock(d: ContentInput, crisis: boolean): string {
  if (!crisis) {
    const entry = !isNA(d.entryAggressive?.level) ? d.entryAggressive?.level : d.entryDemand?.level;
    const lines: string[] = [];
    if (!isNA(entry)) lines.push(`${E.entry} Entry ${fmtLevel(entry)}`);
    if (!isNA(d.tp?.level)) lines.push(`${E.target} TP ${fmtLevel(d.tp?.level)}`);
    if (!isNA(d.sl?.level)) lines.push(`${E.stop} SL ${fmtLevel(d.sl?.level)}`);
    return lines.join("\n");
  }
  const zp = d.zonaPantau;
  return zp && !isNA(zp.bottom) && !isNA(zp.top)
    ? `${E.wait} Belum ada setup beli. Zona pantau: ${fmtLevel(zp.bottom)}–${fmtLevel(zp.top)}.`
    : `${E.wait} Belum ada setup beli — amati dulu reaksi harga.`;
}

/** Plan lengkap dengan alasan AI yang sudah diterjemahkan (format panjang). */
export function planDetail(d: ContentInput, crisis: boolean): string {
  if (crisis) return planBlock(d, crisis);
  const item = (emoji: string, label: string, level: unknown, why?: string | null) => {
    if (isNA(level)) return "";
    const reason = humanizeJargon(why ?? "");
    return `${emoji} ${label} ${fmtLevel(level as number | string)}${reason ? ` — ${reason}` : ""}`;
  };
  const entry = !isNA(d.entryAggressive?.level)
    ? item(E.entry, "Entry", d.entryAggressive?.level, d.entryAggressive?.desc)
    : item(E.entry, "Entry", d.entryDemand?.level, d.entryDemand?.desc);
  return [
    entry,
    item(E.target, "Target", d.tp?.level, d.tp?.reason),
    item(E.stop, "Stop Loss", d.sl?.level, d.sl?.reason),
  ].filter(Boolean).join("\n");
}

/** Plan satu baris (untuk platform super ringkas seperti Twitter/X). */
export function planLine(d: ContentInput, crisis: boolean): string {
  if (crisis) {
    const zp = d.zonaPantau;
    return zp && !isNA(zp.bottom) && !isNA(zp.top)
      ? `${E.wait} Pantau ${fmtLevel(zp.bottom)}–${fmtLevel(zp.top)}`
      : `${E.wait} Tunggu setup`;
  }
  const entry = !isNA(d.entryAggressive?.level) ? d.entryAggressive?.level : d.entryDemand?.level;
  const bits: string[] = [];
  if (!isNA(entry)) bits.push(`${E.entry} ${fmtLevel(entry)}`);
  if (!isNA(d.tp?.level)) bits.push(`${E.target} ${fmtLevel(d.tp?.level)}`);
  if (!isNA(d.sl?.level)) bits.push(`${E.stop} ${fmtLevel(d.sl?.level)}`);
  return bits.join(" · ");
}
