"use client";

import React, { useMemo } from "react";
import { analyzeFairValueGaps, type FairValueGap, type FVGResult, type FVGStatus, type FVGPriority } from "../utils/fairValueGaps";
import type { OHLCV } from "../utils/vcp";
import type { MarketPhase } from "../utils/marketMap";

interface Props {
  data?: OHLCV[] | null;
  loading?: boolean;
  phase?: MarketPhase | null;
  /** Hasil FVG yang sudah dihitung di parent (hindari kalkulasi ganda). */
  precomputed?: FVGResult | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");

const STATUS_TAG: Record<FVGStatus, string> = {
  Fresh: "text-green-300 border-green-400/50 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.4)]",
  "Partially Filled": "text-amber-300 border-amber-400/40 bg-amber-500/10",
  Filled: "text-slate-400 border-white/10 bg-slate-500/10",
  Invalidated: "text-slate-400 border-white/10 bg-slate-500/10",
};
const PRIORITY_TAG: Record<FVGPriority, string> = {
  High: "text-purple-300 border-purple-400/50 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.45)]",
  Medium: "text-blue-300 border-blue-400/40 bg-blue-500/10",
  Low: "text-slate-400 border-white/10 bg-slate-500/10",
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="depth-3d bg-black/40 backdrop-blur-md rounded-3xl border border-purple-500/20 p-5 transition-all hover:shadow-[0_0_18px_rgba(168,85,247,0.25)]">
    <h3 className="text-sm font-black text-purple-300 uppercase tracking-widest flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" /> Fair Value Gaps
    </h3>
    {children}
  </div>
);

function GapCard({ g, nearest }: { g: FairValueGap; nearest: boolean }): React.JSX.Element {
  const isBull = g.type === "Bullish";
  const rgb = isBull ? "34,197,94" : "239,68,68";
  const txt = isBull ? "text-green-300" : "text-red-300";
  const dim = g.status === "Invalidated" || g.status === "Filled";
  return (
    <div
      className={`rounded-xl border p-2.5 transition-all ${dim ? "opacity-55" : ""} ${nearest ? "ring-1 ring-white/30" : ""}`}
      style={{
        background: `rgba(${rgb},${0.05 + (g.confidence / 100) * 0.14})`,
        borderColor: `rgba(${rgb},0.32)`,
        boxShadow: g.priority === "High" && !dim ? `0 0 ${Math.round(g.priorityScore / 7)}px rgba(${rgb},${(g.priorityScore / 100) * 0.4})` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[10px] font-black uppercase tracking-wider ${txt}`}>{g.type} FVG{nearest ? " · nearest" : ""}</span>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-wider ${PRIORITY_TAG[g.priority]} ${g.priority === "High" ? "animate-pulse" : ""}`}>{g.priority}</span>
          <span className={`text-[11px] font-black tabular-nums ${txt}`}>{g.confidence}%</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-white tabular-nums">{fmt(g.gapLow)} – {fmt(g.gapHigh)}</span>
        <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-wider ${STATUS_TAG[g.status]}`}>{g.status}</span>
      </div>
      {/* Fill meter */}
      <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden" title={`Terisi ${g.filledPercent}%`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${g.filledPercent}%`, background: `rgba(${rgb},0.8)` }} />
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider flex-wrap">
        <span>lebar {fmt(g.gapSize)} ({g.gapPercent}%)</span>
        <span>{g.atrDistance} ATR</span>
        <span>{g.filledPercent}% fill</span>
        {g.volumeConfirmation && <span className="text-amber-400/70">vol ✓</span>}
        {g.reactionCount > 0 && <span>{g.reactionCount}× react</span>}
      </div>
    </div>
  );
}

export default function FairValueGapPanel({ data, loading, phase, precomputed }: Props): React.JSX.Element {
  const result = useMemo<FVGResult | "error" | null>(() => {
    if (precomputed) return precomputed;
    if (!data || data.length < 5) return null;
    try { return analyzeFairValueGaps(data, { phase: phase ?? null }); } catch { return "error"; }
  }, [data, phase, precomputed]);

  if (loading || !data) {
    return (
      <Shell>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse" aria-busy="true" aria-label="Memuat fair value gaps">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-800/40 border border-white/5" />)}
        </div>
      </Shell>
    );
  }
  if (result === "error") {
    return <Shell><p className="text-[11px] text-red-400/90 leading-relaxed" role="alert">Gagal menghitung Fair Value Gap. Coba analisa ulang.</p></Shell>;
  }
  if (!result || (result.bullish.length === 0 && result.bearish.length === 0)) {
    return <Shell><p className="text-[11px] text-slate-500 leading-relaxed">Belum ada Fair Value Gap signifikan pada data historis terakhir.</p></Shell>;
  }

  const nid = result.nearestActive ? `${result.nearestActive.type}-${result.nearestActive.createdAt}` : null;

  return (
    <Shell>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[8px] font-black uppercase tracking-widest text-green-400/70">Bullish Gaps</p>
          {result.bullish.length ? result.bullish.map((g) => (
            <GapCard key={`bu${g.createdAt}`} g={g} nearest={nid === `${g.type}-${g.createdAt}`} />
          )) : <p className="text-[10px] text-slate-600">—</p>}
        </div>
        <div className="space-y-2">
          <p className="text-[8px] font-black uppercase tracking-widest text-red-400/70">Bearish Gaps</p>
          {result.bearish.length ? result.bearish.map((g) => (
            <GapCard key={`be${g.createdAt}`} g={g} nearest={nid === `${g.type}-${g.createdAt}`} />
          )) : <p className="text-[10px] text-slate-600">—</p>}
        </div>
      </div>
      <p className="text-[9px] text-slate-600 mt-3 pt-2 border-t border-white/5 leading-relaxed">
        FVG = imbalance 3-candle. Fresh = belum terisi · Partially/Filled = sebagian/penuh · prioritas dari ukuran (ATR), volume, reaksi, usia & fase pasar.
      </p>
    </Shell>
  );
}
