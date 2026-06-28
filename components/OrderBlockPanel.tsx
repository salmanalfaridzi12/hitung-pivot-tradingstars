"use client";

import React from "react";
import type { OrderBlock, OrderBlockResult, OBStatus } from "../utils/orderBlocks";
import DataSourceBadge from "./DataSourceBadge";
import { requirePipelineProp } from "../utils/invariant";

// Phase 19 (Architecture Lockdown): KOMPONEN PRESENTASI MURNI — tidak menjalankan
// Order Block Engine. Hasil diterima via props dari orchestrator (page.jsx).
interface Props {
  /** Output Order Block Engine dari pipeline (null = belum/ tak cukup data). WAJIB di-supply. */
  result?: OrderBlockResult | null;
  loading?: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");

const STATUS_TAG: Record<OBStatus, string> = {
  Fresh: "text-green-300 border-green-400/50 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.45)]",
  Mitigated: "text-amber-300 border-amber-400/40 bg-amber-500/10",
  Invalidated: "text-slate-400 border-white/10 bg-slate-500/10",
  Breaker: "text-purple-300 border-purple-400/50 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.45)]",
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="depth-3d bg-black/40 backdrop-blur-md rounded-3xl border border-purple-500/20 p-5 transition-all hover:shadow-[0_0_18px_rgba(168,85,247,0.25)]">
    <h3 className="text-sm font-black text-purple-300 uppercase tracking-widest flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" /> Institutional Order Blocks
      <DataSourceBadge source="Order Block Engine" />
    </h3>
    {children}
  </div>
);

function BlockCard({ ob, nearest }: { ob: OrderBlock; nearest: boolean }): React.JSX.Element {
  const isBull = ob.type === "Bullish";
  const rgb = isBull ? "34,197,94" : "239,68,68";
  const txt = isBull ? "text-green-300" : "text-red-300";
  const dim = ob.status === "Invalidated";
  return (
    <div
      className={`rounded-xl border p-2.5 transition-all ${dim ? "opacity-55" : ""} ${nearest ? "ring-1 ring-white/30" : ""}`}
      style={{
        background: `rgba(${rgb},${0.05 + (ob.confidence / 100) * 0.14})`,
        borderColor: `rgba(${rgb},0.32)`,
        boxShadow: ob.strength === "Major" && !dim ? `0 0 ${Math.round(ob.confidence / 7)}px rgba(${rgb},${(ob.confidence / 100) * 0.4})` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[10px] font-black uppercase tracking-wider ${txt}`}>{ob.type} OB{nearest ? " · nearest" : ""}</span>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-wider ${STATUS_TAG[ob.status]} ${ob.status === "Breaker" ? "animate-pulse" : ""}`}>{ob.status}</span>
          <span className={`text-[11px] font-black tabular-nums ${txt}`}>{ob.confidence}%</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-white tabular-nums">{fmt(ob.priceLow)} – {fmt(ob.priceHigh)}</span>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{ob.strength} · {ob.atrDistance.toFixed(1)} ATR</span>
      </div>
      {/* Strength meter */}
      <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ob.strengthScore}%`, background: `rgba(${rgb},0.85)` }} />
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
        <span>{ob.age} bar</span>
        {ob.volumeConfirmed && <span className="text-amber-400/70">vol ✓</span>}
        {ob.reactionCount > 0 && <span>{ob.reactionCount}× react</span>}
      </div>
    </div>
  );
}

export default function OrderBlockPanel({ result: resultProp, loading }: Props): React.JSX.Element {
  const result = requirePipelineProp(resultProp, "result", "OrderBlockPanel"); // invariant: orchestrator wajib supply

  if (loading) {
    return (
      <Shell>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse" aria-busy="true" aria-label="Memuat order block">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-800/40 border border-white/5" />)}
        </div>
      </Shell>
    );
  }
  if (!result || (result.bullish.length === 0 && result.bearish.length === 0)) {
    return <Shell><p className="text-[11px] text-slate-500 leading-relaxed">Belum ada order block signifikan pada data historis terakhir.</p></Shell>;
  }

  const nearestId = result.nearestActive ? `${result.nearestActive.type}-${result.nearestActive.createdAt}` : null;

  return (
    <Shell>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[8px] font-black uppercase tracking-widest text-green-400/70">Bullish Blocks (demand)</p>
          {result.bullish.length ? result.bullish.map((ob) => (
            <BlockCard key={`bu${ob.createdAt}`} ob={ob} nearest={nearestId === `${ob.type}-${ob.createdAt}`} />
          )) : <p className="text-[10px] text-slate-600">—</p>}
        </div>
        <div className="space-y-2">
          <p className="text-[8px] font-black uppercase tracking-widest text-red-400/70">Bearish Blocks (supply)</p>
          {result.bearish.length ? result.bearish.map((ob) => (
            <BlockCard key={`be${ob.createdAt}`} ob={ob} nearest={nearestId === `${ob.type}-${ob.createdAt}`} />
          )) : <p className="text-[10px] text-slate-600">—</p>}
        </div>
      </div>
      <p className="text-[9px] text-slate-600 mt-3 pt-2 border-t border-white/5 leading-relaxed">
        OB = candle berlawanan terakhir sebelum displacement (BoS). Fresh = belum disentuh · Mitigated = sudah ditap · Breaker = flip. Deterministik dari OHLCV.
      </p>
    </Shell>
  );
}
