import { NextResponse } from "next/server";
import { MOCK_MARKET_SENTIMENT, filterByTicker } from "../../../lib/marketSentiment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ambil sentimen pasar terbaru, opsional difilter `?ticker=BBCA`.
// Sumber utama Supabase (saat ENV diset); fallback ke mock statis bila Supabase
// tidak terkonfigurasi atau gagal — agar app tidak pernah crash saat review.
export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker");

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (url && anon) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(url, anon);
      let q = sb
        .from("market_sentiment")
        .select("id, ticker, title, summary, sentiment, score, source, published_at")
        .order("published_at", { ascending: false })
        .limit(50);
      if (ticker) q = q.ilike("ticker", ticker.trim()); // filter sisi server
      const { data, error } = await q;
      if (!error && data) {
        return NextResponse.json({ ok: true, source: "supabase", ticker: ticker || null, data });
      }
      // error → jatuh ke fallback di bawah
    } catch {
      // paket/koneksi gagal → fallback
    }
  }

  // --- Fallback mock (filter sisi server juga) -----------------------------
  const data = filterByTicker(MOCK_MARKET_SENTIMENT, ticker);
  return NextResponse.json({ ok: true, source: "mock", ticker: ticker || null, data });
}
