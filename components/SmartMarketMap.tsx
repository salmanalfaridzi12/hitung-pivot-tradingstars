"use client";

import React, { useMemo } from "react";
import { buildMarketMap, type LiquidityZone } from "../utils/marketMap";

interface Props {
  pivots: any;
  currentPrice: number | string;
  ma20?: number | string | null;
  volume?: number | string | null;
  ma20Volume?: number | string | null;
}

const PHASE_STYLE: Record<string, string> = {
  Accumulation: "text-green-300 border-green-400/50 bg-green-500/10",
  Markup: "text-emerald-300 border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(34,197,94,0.4)]",
  Distribution: "text-orange-300 border-orange-400/50 bg-orange-500/10",
  Markdown: "text-red-300 border-red-400/50 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.4)]",
  Consolidation: "text-slate-300 border-white/15 bg-slate-500/10",
};

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");

function ZoneCard({ z }: { z: LiquidityZone }): React.JSX.Element {
  const isDemand = z.type === "Demand Zone";
  const rgb = isDemand ? "16,185,129" : "168,85,247";
  const tone = isDemand ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-purple-500/40 bg-purple-500/10 text-purple-300";
  return (
    <div className={`rounded-xl border p-2.5 ${tone}`} style={{ boxShadow: `0 0 ${Math.round(z.confidence / 6)}px rgba(${rgb},${(z.confidence / 100) * 0.45})` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider">{z.strength} {z.type}</span>
        <span className="text-[10px] font-black text-white tabular-nums">{fmt(z.bottom)} – {fmt(z.top)}</span>
      </div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <p className="text-[9px] text-slate-400 leading-snug flex-1">{z.reason}</p>
        <span className="text-[11px] font-black tabular-nums">{z.confidence}%</span>
      </div>
    </div>
  );
}

export default function SmartMarketMap(props: Props): React.JSX.Element | null {
  const map = useMemo(
    () => buildMarketMap({
      pivots: props.pivots,
      currentPrice: Number(props.currentPrice),
      ma20: props.ma20 != null && props.ma20 !== "" ? Number(props.ma20) : null,
      volume: props.volume != null && props.volume !== "" ? Number(props.volume) : null,
      ma20Volume: props.ma20Volume != null && props.ma20Volume !== "" ? Number(props.ma20Volume) : null,
    }),
    [props.pivots, props.currentPrice, props.ma20, props.volume, props.ma20Volume]
  );

  if (!map) return null;
  const cp = Number(props.currentPrice);
  const { hi, lo } = map.range;
  const yOf = (pr: number) => Math.min(100, Math.max(0, ((hi - pr) / Math.max(hi - lo, 1)) * 100));

  return (
    <div className="depth-3d bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl border border-purple-500/20 p-5 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-black text-purple-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" /> Smart Market Map
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${PHASE_STYLE[map.phase]}`}>{map.phase}</span>
          <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${
            map.position === "Premium" ? "text-red-300 border-red-400/40 bg-red-500/10"
            : map.position === "Discount" ? "text-green-300 border-green-400/40 bg-green-500/10"
            : "text-slate-300 border-white/15 bg-slate-500/10"
          }`}>{map.position}</span>
          <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${
            map.trend === "Bullish" ? "text-green-300 border-green-400/40 bg-green-500/10"
            : map.trend === "Bearish" ? "text-red-300 border-red-400/40 bg-red-500/10"
            : "text-yellow-300 border-yellow-400/40 bg-yellow-500/10"
          }`}>{map.trend}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_136px] gap-4">
        {/* Zona kunci */}
        <div className="space-y-2.5">
          <p className="text-[10px] text-slate-400 leading-snug">{map.phaseReason}</p>
          {map.majorSupply && <ZoneCard z={map.majorSupply} />}
          {map.majorDemand && <ZoneCard z={map.majorDemand} />}
          {map.nearestLiquidity && (
            <p className="text-[9px] text-slate-500 leading-snug">
              Likuiditas terdekat: <span className="text-purple-300 font-black">{map.nearestLiquidity.type}</span>{" "}
              {fmt(map.nearestLiquidity.bottom)}–{fmt(map.nearestLiquidity.top)} ({map.nearestLiquidity.confidence}%)
            </p>
          )}
        </div>

        {/* Liquidity Heatmap — rectangle glow, opacity = confidence, posisi by harga */}
        <div className="relative h-[190px] rounded-xl bg-slate-950/60 border border-white/5 overflow-hidden">
          {map.heatmap.map((z, i) => {
            const top = yOf(z.top);
            const h = Math.max(5, yOf(z.bottom) - yOf(z.top));
            const isDemand = z.type === "Demand Zone";
            const rgb = isDemand ? "16,185,129" : "168,85,247";
            return (
              <div
                key={i}
                className="absolute left-0 right-0 rounded-sm"
                style={{
                  top: `${top}%`, height: `${h}%`,
                  background: `rgba(${rgb},${0.1 + (z.confidence / 100) * 0.5})`,
                  boxShadow: `inset 0 0 12px rgba(${rgb},${(z.confidence / 100) * 0.55})`,
                  borderTop: `1px solid rgba(${rgb},0.5)`, borderBottom: `1px solid rgba(${rgb},0.5)`,
                }}
              >
                <span className="absolute right-1 top-0 text-[7px] font-black text-white/70 tabular-nums">{z.confidence}</span>
              </div>
            );
          })}
          {/* Garis harga saat ini */}
          <div className="absolute left-0 right-0 border-t-2 border-dashed border-white/80 z-10" style={{ top: `${yOf(cp)}%` }}>
            <span className="absolute right-1 -top-2 text-[8px] font-black text-white bg-slate-900/85 px-1 rounded tabular-nums">{fmt(cp)}</span>
          </div>
        </div>
      </div>
      <p className="text-[9px] text-slate-600 mt-3 pt-2 border-t border-white/5 leading-relaxed">
        Zona dihitung deterministik dari struktur pivot (anchor matematis). Validasi AI menyusul untuk menyetel confidence.
      </p>
    </div>
  );
}
