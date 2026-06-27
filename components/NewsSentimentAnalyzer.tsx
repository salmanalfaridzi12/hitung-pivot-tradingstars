"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MOCK_MARKET_SENTIMENT,
  SENTIMENT_BADGE,
  overallLabel,
  avgScore,
  filterByTicker,
  type MarketSentiment,
} from "../lib/marketSentiment";

interface Props {
  /** Bila diisi, widget hanya menampilkan berita emiten ini. */
  ticker?: string;
  /** Maksimal kartu yang dirender (widget = 3). */
  limit?: number;
}

export default function NewsSentimentAnalyzer({ ticker, limit = 3 }: Props): React.JSX.Element {
  // Render instan dgn mock (sudah difilter ticker); lalu sinkron dari Route Handler.
  const [items, setItems] = useState<MarketSentiment[]>(() => filterByTicker(MOCK_MARKET_SENTIMENT, ticker));

  useEffect(() => {
    let alive = true;
    const qs = ticker ? `?ticker=${encodeURIComponent(ticker)}` : "";
    fetch(`/api/market-sentiment${qs}`)
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d?.data)) setItems(d.data); })
      .catch(() => {/* tetap pakai mock */});
    return () => { alive = false; };
  }, [ticker]);

  const shown = items.slice(0, limit);
  const avg = useMemo(() => avgScore(items), [items]);
  const label = overallLabel(avg);

  return (
    <div className="depth-3d bg-black/40 backdrop-blur-md rounded-3xl border border-purple-500/20 p-5 transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
          News &amp; Sentiment{ticker ? <span className="text-purple-400 normal-case tracking-normal">· {ticker}</span> : null}
        </h3>
        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${SENTIMENT_BADGE[label]}`}>
          {label}
        </span>
      </div>

      {/* Sentiment Meter — gauge merah → kuning → hijau, marker di skor rata-rata */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
          <span>Bearish</span>
          <span className="text-slate-300">Fear &amp; Greed: {avg}</span>
          <span>Bullish</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-visible bg-gradient-to-r from-red-500 via-yellow-400 to-green-500">
          <div className="absolute -top-1 transition-all duration-700" style={{ left: `${Math.min(96, Math.max(4, avg))}%`, transform: "translateX(-50%)" }}>
            <div className="w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
          </div>
        </div>
      </div>

      {/* List sentimen (maks `limit`) */}
      <div className="flex flex-col gap-2 flex-1">
        {shown.length === 0 ? (
          <p className="text-[11px] text-slate-500 leading-relaxed py-2">
            Belum ada sentimen untuk {ticker || "pasar"}. Lihat seluruh sentimen pasar di bawah.
          </p>
        ) : (
          shown.map((it) => (
            <div key={it.id} className="group flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/40 border border-white/5 transition-all hover:border-purple-500/30 hover:bg-slate-900/70">
              <span className="text-[11px] font-black text-white w-12 flex-shrink-0 tracking-wide pt-0.5">{it.ticker}</span>
              <p className="text-[10px] text-slate-300 leading-snug flex-1">{it.summary}</p>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-wider ${SENTIMENT_BADGE[it.sentiment]}`}>
                  {it.sentiment}
                </span>
                <span className="text-[8px] font-mono text-slate-600">{it.published_at?.slice(11, 16)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CTA ke halaman Market Pulse */}
      <Link
        href="/news"
        className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-1 text-[11px] font-black text-purple-300 hover:text-purple-200 transition-all group"
      >
        Lihat Semua Sentimen Pasar
        <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
      </Link>
    </div>
  );
}
