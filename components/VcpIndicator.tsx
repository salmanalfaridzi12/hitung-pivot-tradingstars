"use client";

import React, { useMemo } from "react";
import { analyzeVCP, type OHLCV, type VcpStatus } from "../utils/vcp";

interface VcpIndicatorProps {
  data: OHLCV[];
}

interface BadgeStyle {
  label: string;
  badge: string;
  dot: string;
}

const BADGE: Record<VcpStatus, BadgeStyle> = {
  TIGHT_READY: {
    label: "VCP: Siap Breakout",
    badge:
      "text-green-300 border-green-400/60 bg-green-500/10 shadow-[0_0_18px_rgba(34,197,94,0.55)]",
    dot: "bg-green-400 shadow-[0_0_8px_#22c55e] animate-pulse",
  },
  DEVELOPING: {
    label: "VCP: Kontraksi Bertahap",
    badge: "text-yellow-300 border-yellow-400/40 bg-yellow-500/10",
    dot: "bg-yellow-400",
  },
  NONE: {
    label: "VCP: Tidak Terdeteksi",
    badge: "text-slate-400 border-white/10 bg-slate-500/10",
    dot: "bg-slate-500",
  },
};

export default function VcpIndicator({ data }: VcpIndicatorProps): React.JSX.Element {
  const result = useMemo(() => analyzeVCP(data ?? []), [data]);
  const { vcpStatus, contractions } = result;
  const style = BADGE[vcpStatus];
  const ready = vcpStatus === "TIGHT_READY";
  if (!data || data.length < 60) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 flex items-center justify-center h-full min-h-[120px]">
         <p className="text-gray-400 text-sm text-center">Data historis kurang dari 60 hari. Analisis VCP tidak tersedia.</p>
      </div>
    );
  }

  // Tahap kontraksi (data-driven): jumlah leg yang terdeteksi menentukan stage aktif.
  const nContractions = contractions.length;
  const stages = [
    { label: "C1 (Selesai)", lit: nContractions >= 1, cls: "text-green-300 border-green-400/50 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.4)]" },
    { label: "C2 (Aktif)", lit: nContractions >= 2, cls: "text-amber-300 border-amber-400/50 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.45)] animate-pulse" },
    { label: "C3 (Terjadwal)", lit: nContractions >= 3, cls: "text-slate-300 border-white/15 bg-slate-500/10" },
  ];

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-black/40 backdrop-blur-md p-5 shadow-xl shadow-black/40 h-full transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
      {/* Header + badge status */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
          Volatility Contraction (VCP)
        </h3>
        <span
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all ${style.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {/* Deret persentase kontraksi: -22% ➔ -11% ➔ -4% */}
      {contractions.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          {contractions.map((c, i) => {
            const isLast = i === contractions.length - 1;
            const chip = isLast
              ? ready
                ? "text-green-300 border-green-400/50 bg-green-500/10"
                : "text-purple-300 border-purple-500/40 bg-purple-500/10"
              : "text-slate-300 border-white/10 bg-slate-800/40";
            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-slate-600 text-sm select-none">➔</span>}
                <span className={`px-2.5 py-1.5 rounded-lg font-black text-sm tabular-nums border ${chip}`}>
                  {c.toFixed(0)}%
                </span>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Belum ada pola kontraksi yang valid pada 120 hari bursa terakhir.
        </p>
      )}

      {/* Tahap kontraksi: C1 (Selesai) · C2 (Aktif) · C3 (Terjadwal) */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {stages.map((s) => (
          <span
            key={s.label}
            className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all ${s.cls} ${s.lit ? "" : "opacity-40 grayscale"}`}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Catatan kontekstual */}
      <p className="text-[9px] text-slate-600 mt-3 pt-2 border-t border-white/5 leading-relaxed">
        {ready
          ? "Kontraksi terakhir ≤5% & volume mengering — pantau titik breakout."
          : "Butuh kontraksi yang terus mengecil + volume kering untuk status 'Siap Breakout'."}
      </p>
    </div>
  );
}
