// Phase 24 — AI CONTENT ENGINE · REGISTRY & DISPATCH (presentation-only).
//
// composeContent(data, { mode }) memilih formatter dari registry. Menambah
// platform baru (Phase 9): buat file formatter → registerFormatter → selesai;
// tidak ada kode lama yang perlu diubah.
//
// Keacakan (Phase 7): default seed acak per panggilan supaya wording tidak
// pernah persis sama dua kali; `seed` eksplisit membuatnya deterministik
// (untuk test/preview). Informasi trading TIDAK pernah ikut acak.

import type { ComposeOptions, ContentFormatter, ContentInput } from "./types";
import { mulberry32, truncateWords } from "./helpers";
import report from "./report";
import telegram from "./telegram";
import threads from "./threads";
import discord from "./discord";
import whatsapp from "./whatsapp";
import instagram from "./instagram";
import twitter from "./twitter";

const registry = new Map<string, ContentFormatter>();

export function registerFormatter(f: ContentFormatter): void {
  registry.set(f.mode, f);
}

export function listModes(): string[] {
  return Array.from(registry.keys());
}

for (const f of [report, telegram, threads, discord, whatsapp, instagram, twitter]) {
  registerFormatter(f);
}

export function composeContent(data: ContentInput, opts: ComposeOptions): string {
  const f = registry.get(opts.mode);
  if (!f) {
    throw new Error(`Mode konten tidak dikenal: "${opts.mode}". Tersedia: ${listModes().join(", ")}`);
  }
  const seed = opts.seed ?? ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  const out = f.compose(data, { rng: mulberry32(seed) });
  // Guard akhir batas platform — formatter seharusnya sudah fit lewat fitSections.
  return out.length <= f.limit ? out : truncateWords(out, f.limit);
}

export type { ContentInput, ContentFormatter, ComposeOptions, ComposeContext, Mood } from "./types";
export { buildHashtags } from "./hashtags";
export { humanizeJargon } from "./humanizer";
