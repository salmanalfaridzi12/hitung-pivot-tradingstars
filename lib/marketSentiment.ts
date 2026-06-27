// Tipe + data mock + helper untuk fitur News & Sentiment.
// Dipakai bersama oleh Route Handler (/api/market-sentiment), widget dashboard,
// dan halaman /news. Saat Supabase tersambung, query menggantikan MOCK (lihat route.ts).

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

// Filter berdasarkan ticker (case-insensitive). Kosong/undefined → semua.
export function filterByTicker(items: MarketSentiment[], ticker?: string | null): MarketSentiment[] {
  const t = (ticker || "").trim().toUpperCase();
  if (!t) return items;
  return items.filter((i) => i.ticker.toUpperCase() === t);
}

export const MOCK_MARKET_SENTIMENT: MarketSentiment[] = [
  { id: "1",  ticker: "BBCA", title: "Asing kembali borong BBCA",        summary: "Net buy asing Rp1,2T sepekan; harga bertahan kokoh di atas MA20.",        sentiment: "Bullish", score: 78, source: "IDX Today",     published_at: "2026-06-27T08:10:00Z" },
  { id: "2",  ticker: "BBCA", title: "Target harga BBCA dinaikkan",       summary: "Sekuritas revisi target seiring NIM solid & kredit tumbuh dobel digit.",  sentiment: "Bullish", score: 73, source: "Market Watch",  published_at: "2026-06-27T06:40:00Z" },
  { id: "3",  ticker: "BBRI", title: "BBRI rotasi big-banks",             summary: "Rotasi dana ke big banks; volume akumulasi terus meningkat.",             sentiment: "Bullish", score: 71, source: "Kontan",        published_at: "2026-06-27T07:45:00Z" },
  { id: "4",  ticker: "BBRI", title: "Dividen BBRI jadi katalis",         summary: "Ekspektasi dividen tinggi menahan koreksi; demand kuat di area support.",  sentiment: "Neutral", score: 55, source: "Bisnis",        published_at: "2026-06-27T05:20:00Z" },
  { id: "5",  ticker: "GOTO", title: "Tekanan jual GOTO berlanjut",       summary: "Tekanan jual lanjutan pasca lock-up; menembus support kunci.",             sentiment: "Bearish", score: 29, source: "Reuters ID",    published_at: "2026-06-27T07:30:00Z" },
  { id: "6",  ticker: "TLKM", title: "TLKM konsolidasi jelang kinerja",   summary: "Konsolidasi jelang rilis kinerja kuartalan; menanti katalis.",             sentiment: "Neutral", score: 52, source: "CNBC ID",       published_at: "2026-06-27T07:05:00Z" },
  { id: "7",  ticker: "ANTM", title: "Nikel rebound angkat ANTM",         summary: "Harga nikel rebound; sentimen sektor komoditas menguat.",                  sentiment: "Bullish", score: 66, source: "Mining News",    published_at: "2026-06-27T06:50:00Z" },
  { id: "8",  ticker: "MDKA", title: "MDKA tertekan net sell asing",      summary: "Koreksi sektor tambang; net sell asing dominan.",                          sentiment: "Bearish", score: 38, source: "Investor Daily", published_at: "2026-06-27T06:20:00Z" },
  { id: "9",  ticker: "ASII", title: "ASII jelang rilis penjualan mobil", summary: "Pasar menanti data wholesales; bias netral dengan support MA50 solid.",   sentiment: "Neutral", score: 50, source: "Bisnis",        published_at: "2026-06-27T05:55:00Z" },
  { id: "10", ticker: "TPIA", title: "TPIA breakout konsolidasi",         summary: "Breakout range dengan volume tebal; struktur higher-high terjaga.",        sentiment: "Bullish", score: 69, source: "IDX Today",     published_at: "2026-06-27T05:30:00Z" },
];
