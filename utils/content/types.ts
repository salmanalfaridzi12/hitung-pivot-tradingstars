// Phase 24 — AI CONTENT ENGINE · TYPES (presentation-only).
// Input identik dengan AiCopyInput lama (kompatibilitas 100%) + field opsional
// baru yang bersifat metadata tampilan (sector). TIDAK ada logika pasar.

export interface ContentLevel {
  level?: number | string | null;
  /** Alasan dari AI — entry memakai `desc`, TP/SL memakai `reason`. */
  desc?: string | null;
  reason?: string | null;
}

export interface ContentInput {
  symbol?: string | null;
  timeframe?: string | null;
  /** BULLISH | BEARISH | KONSOLIDASI | wait_and_see | NETRAL (dari AI). */
  sentiment?: string | null;
  /** 0–100, dihitung deterministik di server — dipakai apa adanya. */
  confluenceScore?: number | null;
  headline?: string | null;
  narrative?: string | null;
  entryAggressive?: ContentLevel | null;
  entryDemand?: ContentLevel | null;
  tp?: ContentLevel | null;
  sl?: ContentLevel | null;
  zonaPantau?: { bottom?: number | string | null; top?: number | string | null; desc?: string | null } | null;
  risk?: string | null;
  /** Dari calcRRR — hanya DIBACA untuk memilih narasi. */
  rrr?: number | string | null;
  /** aiSetup.collapse — bearish / wait & see / entry N/A. */
  crisis?: boolean;
  /** Metadata tampilan opsional (mis. untuk hashtag sektor). */
  sector?: string | null;
}

export type Mood = "bullish" | "bearish" | "sideways" | "wait";

/** Konteks compose — SATU-SATUNYA sumber keacakan (deterministik via seed). */
export interface ComposeContext {
  rng: () => number;
}

/** Kontrak formatter (Phase 9): buat file → register → selesai. */
export interface ContentFormatter {
  mode: string;
  /** Batas karakter platform; composeContent menegakkannya sebagai guard akhir. */
  limit: number;
  compose(data: ContentInput, ctx: ComposeContext): string;
}

export interface ComposeOptions {
  mode: string;
  /** Opsional: seed deterministik (test/preview). Default: acak per panggilan. */
  seed?: number;
}
