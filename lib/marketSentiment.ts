// Tipe + helper untuk fitur News & Sentiment.
// Dipakai bersama oleh Route Handler (/api/market-sentiment), widget dashboard,
// dan halaman /news. Sumber data tunggal: Supabase (lihat route.ts).
// Phase 17.2 (Zero Mock): TIDAK ada data mock di sini — bila Supabase tidak
// tersedia, route mengembalikan data kosong & UI menampilkan empty state.

export type SentimentLabel = "Bullish" | "Bearish" | "Neutral";

export interface MarketSentiment {
  id: string;
  ticker: string;
  title: string;
  summary: string;
  sentiment: SentimentLabel;
  score: number; // 0-100
  source: string;
  published_at: string; // ISO
}

// Kelas badge glowing per sentimen (Tailwind) — dipakai widget & halaman /news.
export const SENTIMENT_BADGE: Record<SentimentLabel, string> = {
  Bullish: "text-green-300 border-green-400/50 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.45)]",
  Bearish: "text-red-300 border-red-400/50 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.45)]",
  Neutral: "text-yellow-300 border-yellow-400/40 bg-yellow-500/10 shadow-[0_0_8px_rgba(250,204,21,0.35)]",
};

// Label sentimen keseluruhan dari skor agregat (Fear & Greed).
export function overallLabel(score: number): SentimentLabel {
  if (score >= 60) return "Bullish";
  if (score <= 40) return "Bearish";
  return "Neutral";
}

// Rata-rata skor untuk gauge Fear & Greed.
export function avgScore(items: MarketSentiment[]): number {
  if (!items.length) return 50;
  return Math.round(items.reduce((s, i) => s + (i.score || 0), 0) / items.length);
}

