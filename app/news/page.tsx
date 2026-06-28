"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Newspaper, Search, ArrowLeft } from "lucide-react";
import {
  SENTIMENT_BADGE,
  overallLabel,
  avgScore,
  type MarketSentiment,
} from "../../lib/marketSentiment";

function scoreColor(score: number): string {
  if (score >= 60) return "text-green-400";
  if (score <= 40) return "text-red-400";
  return "text-yellow-400";
}

export default function NewsPage(): React.JSX.Element {
  // Phase 17.2 (Zero Mock): mulai kosong; isi HANYA dari Route Handler (Supabase).
  const [items, setItems] = useState<MarketSentiment[]>([]);
  const [source, setSource] = useState<string>("loading"); // "loading" | "supabase" | "unavailable"
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/market-sentiment")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d?.data)) { setItems(d.data); setSource(d.source || "unavailable"); } })
      .catch(() => { if (alive) setSource("unavailable"); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return items;
    return items.filter((i) => i.ticker.toUpperCase().includes(q) || i.title.toUpperCase().includes(q));
  }, [items, query]);

  const avg = avgScore(items); // gauge mewakili keseluruhan pasar
  const label = overallLabel(avg);

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Top nav: kembali ke dashboard + tab News aktif (glow ungu) */}
        <nav className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-purple-300 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Analysis
          </Link>
          <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-black bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)]">
            <Newspaper className="w-3.5 h-3.5" /> News
          </span>
        </nav>

        {/* Header besar */}
        <header className="pt-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">MARKET PULSE</span>
          </h1>
          <p className="text-sm font-bold text-slate-400 tracking-wide flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
            News &amp; Sentiment Aggregator
          </p>
        </header>

        {/* Fear & Greed gauge (besar) */}
        <section className="depth-3d bg-black/40 backdrop-blur-md rounded-3xl border border-purple-500/20 p-6 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]">
          <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fear &amp; Greed Index</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-white tabular-nums" style={{ textShadow: "0 0 24px rgba(168,85,247,0.4)" }}>{avg}</span>
                <span className={`px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${SENTIMENT_BADGE[label]}`}>{label}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{items.length} sinyal pasar</span>
          </div>
          <div className="relative h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 shadow-inner">
            <div className="absolute -top-1.5 transition-all duration-700" style={{ left: `${Math.min(97, Math.max(3, avg))}%`, transform: "translateX(-50%)" }}>
              <div className="w-7 h-7 rounded-full bg-white border-[3px] border-slate-900 shadow-[0_0_14px_rgba(255,255,255,0.8)]" />
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-600 mt-3">
            <span>Extreme Fear</span><span>Neutral</span><span>Extreme Greed</span>
          </div>
        </section>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari sentimen berdasarkan kode emiten (mis. BBCA)…"
            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-white placeholder:text-slate-600 backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500/40 transition-all"
          />
        </div>

        {/* Grid kartu sentimen */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-12">
            {query
              ? `Tidak ada sentimen untuk "${query}".`
              : source === "loading"
                ? "Memuat sentimen pasar…"
                : "No market sentiment data available."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((it) => (
              <article
                key={it.id}
                className="depth-3d bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4 flex flex-col gap-2 transition-all hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-white tracking-wide">{it.ticker}</span>
                  <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${SENTIMENT_BADGE[it.sentiment]}`}>{it.sentiment}</span>
                </div>
                <p className="text-[12px] font-bold text-slate-100 leading-snug">{it.title}</p>
                <p className="text-[10px] text-slate-400 leading-relaxed flex-1">{it.summary}</p>
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/5">
                  <span className="text-[9px] font-medium text-slate-600">{it.source} · {it.published_at?.slice(11, 16)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Score</span>
                    <span className={`text-sm font-black tabular-nums ${scoreColor(it.score)}`}>{it.score}</span>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" style={{ width: `${Math.min(100, Math.max(0, it.score))}%` }} />
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="text-center text-[9px] text-slate-600 pt-2 pb-8">
          {source === "supabase"
            ? <>Sumber data: <span className="text-purple-400 font-bold">Supabase</span> (live).</>
            : <>Sumber data: <span className="text-purple-400 font-bold">Supabase</span>. Isi tabel <span className="text-purple-400 font-bold">market_sentiment</span> untuk menampilkan sentimen live.</>}
        </p>
      </div>
    </div>
  );
}
