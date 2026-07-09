// Phase 24 · Phase 5 — DYNAMIC HASHTAG GENERATOR (presentation-only).
// Hashtag dibangun dari market (IDX), bias, sektor, simbol, dan timeframe.
// Maksimal 8, tanpa duplikat, simbol & brand selalu diprioritaskan.

import type { Mood } from "./types";

export interface HashtagInput {
  symbol?: string | null;
  mood?: Mood | null;
  timeframe?: string | null;
  sector?: string | null;
}

const MOOD_TAGS: Record<Mood, string> = {
  bullish: "#SwingTrade",
  bearish: "#WaitAndSee",
  sideways: "#MarketUpdate",
  wait: "#WaitAndSee",
};

// "Consumer Goods" → "#ConsumerGoods"; buang karakter non-alfanumerik.
function toTag(raw: string): string {
  const words = raw.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const clean = words.join("").replace(/[^A-Za-z0-9]/g, "");
  return clean ? `#${clean}` : "";
}

export function buildHashtags(input: HashtagInput, max = 8): string[] {
  const sym = String(input.symbol ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const tf = String(input.timeframe ?? "").toLowerCase();

  const tags: string[] = ["#IHSG", "#SahamIndonesia", "#Trading"];
  if (sym) tags.push(`#${sym}`);
  if (input.sector) tags.push(toTag(String(input.sector)));
  if (input.mood) tags.push(MOOD_TAGS[input.mood]);
  tags.push(/week|month/.test(tf) ? "#InvestasiSaham" : "#AnalisaSaham");
  tags.push("#Investasi");
  tags.push("#TradingStars");

  // Dedupe (jaga urutan), pastikan brand ikut, lalu batasi max.
  const uniq = Array.from(new Set(tags.filter(Boolean)));
  if (uniq.length > max) {
    const kept = uniq.slice(0, max);
    if (!kept.includes("#TradingStars")) kept[max - 1] = "#TradingStars";
    return kept;
  }
  return uniq;
}
