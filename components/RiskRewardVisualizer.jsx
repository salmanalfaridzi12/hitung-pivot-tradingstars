"use client";
import React from "react";
import { TrendingUp, AlertTriangle, Target } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function RiskRewardVisualizer({ entry, stopLoss, target, entryLow, entryHigh }) {
  const e = parseFloat(entry);
  const sl = parseFloat(stopLoss);
  const t = parseFloat(target);

  // Zona entry (range) — kalau ada, tampilkan low–high alih-alih satu harga
  const eLow = parseFloat(entryLow);
  const eHigh = parseFloat(entryHigh);
  const hasZone = !isNaN(eLow) && !isNaN(eHigh) && eLow !== eHigh;

  if (isNaN(e) || isNaN(sl) || isNaN(t) || e === sl) {
    return (
      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400 text-xs italic">
        Input Entry, SL, and Target data to visualize Risk/Reward.
      </div>
    );
  }

  const risk = Math.abs(e - sl);
  const reward = Math.abs(t - e);
  const rrRatio = (reward / risk).toFixed(2);
  const isGoodRatio = parseFloat(rrRatio) >= 2;

  // Calculate percentage returns
  const targetPct = (((t - e) / e) * 100).toFixed(2);
  const slPct = (((sl - e) / e) * 100).toFixed(2);
  
  const targetPctLabel = parseFloat(targetPct) > 0 ? `+${targetPct}%` : `${targetPct}%`;
  const slPctLabel = `${slPct}%`;

  // Calculate percentages for the vertical bar
  const total = risk + reward;
  const riskPct = (risk / total) * 100;
  const rewardPct = (reward / total) * 100;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          Risk/Reward Visualizer
        </h3>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-black tracking-tighter",
          isGoodRatio ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
        )}>
          RATIO 1 : {rrRatio}
        </div>
      </div>

      <div className="flex gap-6 items-center">
        {/* Vertical Bar */}
        <div className="w-6 h-40 bg-slate-800 rounded-full overflow-hidden flex flex-col-reverse shadow-inner border border-white/5">
          <div 
            className="w-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-1000" 
            style={{ height: `${riskPct}%` }}
          />
          <div 
            className="w-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-1000" 
            style={{ height: `${rewardPct}%` }}
          />
        </div>

        {/* Legend / Details */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-300 font-medium">REWARD (TARGET)</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-sm font-black text-green-400">Rp {t.toLocaleString("id-ID")}</p>
                <span className="text-[11px] font-bold text-green-500/90 tracking-tight">({targetPctLabel})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-300 font-medium">{hasZone ? "ENTRY ZONE" : "ENTRY"}</p>
              {hasZone ? (
                <p className="text-sm font-black text-slate-200">
                  Rp {eLow.toLocaleString("id-ID")} <span className="text-slate-500">–</span> Rp {eHigh.toLocaleString("id-ID")}
                </p>
              ) : (
                <p className="text-sm font-black text-slate-200">Rp {e.toLocaleString("id-ID")}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-300 font-medium">RISK (STOP LOSS)</p>
              <div className="flex items-baseline gap-1.5">
                 <p className="text-sm font-black text-red-400">Rp {sl.toLocaleString("id-ID")}</p>
                 <span className="text-[11px] font-bold text-red-500/90 tracking-tight">({slPctLabel})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-slate-300 font-medium leading-relaxed border-t border-white/5 pt-3">
        {isGoodRatio 
          ? "🎯 High potential setup detected. Maintain discipline!" 
          : "⚠️ Risk is relatively high compared to potential reward. Exercise caution."}
      </p>
    </div>
  );
}
