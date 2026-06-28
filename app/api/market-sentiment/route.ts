import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ambil sentimen pasar terbaru, opsional difilter `?ticker=BBCA`.
// Phase 17.2 (Zero Mock): SATU sumber data — Supabase. Bila Supabase tidak
// terkonfigurasi/gagal, kembalikan data KOSONG dengan source "unavailable".
// TIDAK ada fallback mock. UI menampilkan "No market sentiment data available."
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
      // error → unavailable di bawah (TANPA mock)
    } catch {
      // paket/koneksi gagal → unavailable (TANPA mock)
    }
  }

  // Phase 17.2 (Zero Mock): Supabase tidak tersedia → data KOSONG, source "unavailable".
  return NextResponse.json({ ok: true, source: "unavailable", ticker: ticker || null, data: [] });
}
