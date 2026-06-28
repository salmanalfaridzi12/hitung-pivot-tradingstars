"use client";

import React from "react";
import type { LiquidityZone, LiquidityResult } from "../utils/liquidityEngine";
import DataSourceBadge from "./DataSourceBadge";
import { requirePipelineProp } from "../utils/invariant";

// Phase 19 (Architecture Lockdown): KOMPONEN PRESENTASI MURNI — tidak menjalankan
// Liquidity Engine. Hasil diterima via props dari orchestrator (page.jsx).
interface Props {
  /** Output Liquidity Engine dari pipeline (null = belum/ tak cukup data). WAJIB di-supply. */
  result?: LiquidityResult | null;
  /** Harga terkini untuk garis penanda (display-only). */
  currentPrice?: number;
  loading?: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="depth-3d bg-black/40 backdrop-blur-md rounded-3xl border border-purple-500/20 p-5 transition-all hover:shadow-[0_0_18px_rgba(168,85,247,0.25)]">
    <h3 className="text-sm font-black text-purple-300 uppercase tracking-widest flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" /> Institutional Liquidity
      <DataSourceBadge source="Liquidity Engine" />
    </h3>
    {children}
  </div>
);

function ZoneRow({ z }: { z: LiquidityZone }): React.JSX.Element {
  const isBuy = z.side === "buy";
  const rgb = isBuy ? "34,197,94" : "239,68,68";
  const txt = isBuy ? "text-green-300" : "text-red-300";
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${z.broken ? "opacity-50" : ""}`}
      style={{
        background: `rgba(${rgb},${0.06 + (z.confidence / 100) * 0.16})`,
        borderColor: `rgba(${rgb},0.35)`,
        boxShadow: z.strength === "Major" ? `0 0 ${Math.round(z.confidence / 7)}px rgba(${rgb},${(z.confidence / 100) * 0.4})` : undefined,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[9px] font-black uppercase tracking-wider ${txt} ${z.type === "Sweep" || z.type === "StopHunt" ? "animate-pulse" : ""}`}>{z.label}</span>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate">{z.scope} · {z.strength}</span>
        {z.broken && <span className="text-[7px] font-black text-slate-500 uppercase">swept</span>}
        {z.touched && !z.broken && <span className="text-[7px] font-black text-amber-400/70 uppercase">touched</span>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-black text-white tabular-nums">{fmt(z.price)}</span>
        <span className={`text-[10px] font-black tabular-nums ${txt}`}>{z.confidence}%</span>
      </div>
    </div>
  );
}

export default function LiquidityMap({ result: resultProp, currentPrice, loading }: Props): React.JSX.Element {
  const result = requirePipelineProp(resultProp, "result", "LiquidityMap"); // invariant: orchestrator wajib supply

  // Skeleton / loading
  if (loading) {
    return (
      <Shell>
        <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Memuat likuiditas">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-9 rounded-xl bg-slate-800/40 border border-white/5" />)}
        </div>
      </Shell>
    );
  }
  // Empty
  if (!result || result.zones.length === 0) {
    return <Shell><p className="text-[11px] text-slate-500 leading-relaxed">Belum ada area likuiditas signifikan pada data historis terakhir.</p></Shell>;
  }

  const { buySide, sellSide, recentSweep, range } = result;
  const cp = currentPrice ?? range.lo;
  const yOf = (pr: number) => Math.min(100, Math.max(0, ((range.hi - pr) / Math.max(range.hi - range.lo, 1)) * 100));

  return (
    <Shell>
      {recentSweep && (
        <div className="mb-3 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 shadow-[0_0_14px_rgba(245,158,11,0.25)] flex items-center justify-between gap-2 animate-pulse">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">⚡ {recentSweep.label}</span>
          <span className="text-[11px] font-black text-amber-200 tabular-nums">@ {fmt(recentSweep.price)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
        <div className="space-y-3 min-w-0">
          {buySide.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-green-400/70">Buy-Side Liquidity (atas)</p>
              {buySide.slice(0, 4).map((z, i) => <ZoneRow key={`b${i}`} z={z} />)}
            </div>
          )}
          {sellSide.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-red-400/70">Sell-Side Liquidity (bawah)</p>
              {sellSide.slice(0, 4).map((z, i) => <ZoneRow key={`s${i}`} z={z} />)}
            </div>
          )}
        </div>

        {/* Peta likuiditas — posisi by harga, glow = confidence */}
        <div className="relative h-[200px] rounded-xl bg-slate-950/60 border border-white/5 overflow-hidden" aria-hidden="true">
          {result.zones.map((z, i) => {
            const rgb = z.side === "buy" ? "34,197,94" : "239,68,68";
            return (
              <div key={i} className="absolute left-0 right-0 h-[2px]" style={{ top: `${yOf(z.price)}%`, background: `rgba(${rgb},${0.4 + (z.confidence / 100) * 0.6})`, boxShadow: `0 0 ${Math.round(2 + (z.confidence / 100) * 8)}px rgba(${rgb},${(z.confidence / 100) * 0.7})` }}>
                <span className="absolute right-1 -top-1.5 text-[7px] font-black text-white/70 tabular-nums">{z.confidence}</span>
              </div>
            );
          })}
          <div className="absolute left-0 right-0 border-t-2 border-dashed border-white/80 z-10" style={{ top: `${yOf(cp)}%` }}>
            <span className="absolute right-1 -top-2 text-[8px] font-black text-white bg-slate-900/85 px-1 rounded tabular-nums">{fmt(cp)}</span>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-slate-600 mt-3 pt-2 border-t border-white/5 leading-relaxed">
        EQH/EQL = liquidity pool · BSL/SSL = buy/sell-side stops · sweep = stop hunt. Deterministik dari swing OHLCV.
      </p>
    </Shell>
  );
}
