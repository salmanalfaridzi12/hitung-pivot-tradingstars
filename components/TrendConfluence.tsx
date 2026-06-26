"use client";

import React, { useMemo } from "react";
import { OHLCV } from "../utils/vcp";
import { analyzeMultiTimeframe, TrendStatus } from "../utils/trend";

interface TrendConfluenceProps {
  data: OHLCV[];
}

const TREND_CONFIG: Record<TrendStatus, { label: string; glow: string; textClass: string }> = {
  NAIK: {
    label: "Bullish",
    glow: "bg-green-400 shadow-[0_0_12px_#4ade80]",
    textClass: "text-green-400",
  },
  TURUN: {
    label: "Bearish",
    glow: "bg-red-500 shadow-[0_0_12px_#ef4444]",
    textClass: "text-red-500",
  },
  KONSOLIDASI: {
    label: "Konsolidasi",
    glow: "bg-yellow-400 shadow-[0_0_12px_#facc15]",
    textClass: "text-yellow-400",
  },
};

export default function TrendConfluence({ data }: TrendConfluenceProps): React.JSX.Element {
  const trend = useMemo(() => analyzeMultiTimeframe(data ?? []), [data]);

  if (!data || data.length < 60) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 flex items-center justify-center h-full min-h-[120px]">
         <p className="text-gray-400 text-sm text-center">Data historis kurang dari 60 hari. Analisis Trend tidak tersedia.</p>
      </div>
    );
  }

  const rows = [
    { title: "1 Hari", status: trend.daily },
    { title: "1 Minggu", status: trend.weekly },
    { title: "1 Bulan", status: trend.monthly },
  ];

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl p-5 shadow-xl shadow-black/40 flex flex-col justify-center h-full">
      <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
        Trend Confluence
      </h3>
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const config = TREND_CONFIG[row.status];
          return (
            <div key={row.title} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                {row.title}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${config.textClass}`}>
                  {config.label}
                </span>
                <span className={`w-2 h-2 rounded-full animate-pulse ${config.glow}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
