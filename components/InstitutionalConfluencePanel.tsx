"use client";

import React from "react";
import type { InstitutionalConfluence, ScoredFactor } from "../utils/institutionalConfluence";

interface Props {
  result?: InstitutionalConfluence | null;
  loading?: boolean;
}

const scoreColor = (s: number) => (s >= 80 ? "#22c55e" : s >= 60 ? "#a3e635" : s >= 45 ? "#facc15" : s >= 30 ? "#fb923c" : "#ef4444");
const gradeColor = (g: string) =>
  g.startsWith("AAA") ? "text-green-300 border-green-400/50 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
  : g === "AA" || g === "A" ? "text-emerald-300 border-emerald-400/40 bg-emerald-500/10"
  : g === "BBB" || g === "BB" ? "text-yellow-300 border-yellow-400/40 bg-yellow-500/10"
  : "text-slate-300 border-white/15 bg-slate-500/10";

function RadialGauge({ value, label, color, size = 92 }: { value: number; label: string; color?: string; size?: number }): React.JSX.Element {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
  const col = color ?? scoreColor(value);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.8s ease-out", filter: `drop-shadow(0 0 5px ${col})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-white tabular-nums">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

function FactorBar({ f, tone }: { f: ScoredFactor; tone: "pos" | "neg" }): React.JSX.Element {
  const rgb = tone === "pos" ? "34,197,94" : "239,68,68";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold text-slate-400 w-20 flex-shrink-0 truncate uppercase tracking-wide">{f.label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.value}%`, background: `rgba(${rgb},0.8)` }} />
      </div>
      <span className="text-[9px] font-black tabular-nums text-slate-300 w-7 text-right">{Math.round(f.value)}</span>
    </div>
  );
}

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="depth-3d bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl border border-purple-500/25 p-5 transition-all hover:shadow-[0_0_22px_rgba(168,85,247,0.3)]">
    <h3 className="text-sm font-black text-purple-300 uppercase tracking-widest flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" /> Institutional Confluence
    </h3>
    {children}
  </div>
);

export default function InstitutionalConfluencePanel({ result, loading }: Props): React.JSX.Element {
  if (loading) {
    return (
      <Shell>
        <div className="flex gap-4 animate-pulse" aria-busy="true" aria-label="Memuat confluence">
          <div className="w-24 h-24 rounded-full bg-slate-800/40" />
          <div className="flex-1 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-3 rounded bg-slate-800/40" />)}</div>
        </div>
      </Shell>
    );
  }
  if (result === undefined) {
    return <Shell><p className="text-[11px] text-red-400/90 leading-relaxed" role="alert">Gagal menghitung confluence.</p></Shell>;
  }
  if (!result) {
    return <Shell><p className="text-[11px] text-slate-500 leading-relaxed">Jalankan analisa saham untuk menghitung Institutional Confluence.</p></Shell>;
  }

  const r = result;
  return (
    <Shell>
      <div className="flex items-center gap-4 flex-wrap mb-4">
        <RadialGauge value={r.overallScore} label="Confluence" size={96} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full border text-[12px] font-black uppercase tracking-widest w-fit ${gradeColor(r.institutionalGrade)}`}>{r.institutionalGrade}</span>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-copilot", { detail: { question: "Jelaskan Confluence Score ini: kenapa nilainya segini, faktor apa yang paling berpengaruh, dan apa yang menahannya?", focus: "Confluence" } }))}
              className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all"
              aria-label="Tanya Copilot tentang Confluence"
            >
              Why?
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug max-w-[220px]">{r.summaryFactors[1]}</p>
        </div>
        <div className="flex gap-3 ml-auto">
          <RadialGauge value={r.confidence} label="Confidence" color="#a78bfa" size={72} />
          <RadialGauge value={r.riskScore} label="Risk" color={r.riskScore > 50 ? "#ef4444" : "#facc15"} size={72} />
        </div>
      </div>

      {/* Probabilitas Bull / Neutral / Bear */}
      <div className="mb-4">
        <div className="flex h-3 rounded-full overflow-hidden border border-white/5">
          <div className="bg-green-500/70 transition-all duration-700" style={{ width: `${r.bullProbability}%` }} title={`Bull ${r.bullProbability}%`} />
          <div className="bg-slate-500/60 transition-all duration-700" style={{ width: `${r.neutralProbability}%` }} title={`Neutral ${r.neutralProbability}%`} />
          <div className="bg-red-500/70 transition-all duration-700" style={{ width: `${r.bearProbability}%` }} title={`Bear ${r.bearProbability}%`} />
        </div>
        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mt-1">
          <span className="text-green-400">Bull {r.bullProbability}%</span>
          <span className="text-slate-400">Neutral {r.neutralProbability}%</span>
          <span className="text-red-400">Bear {r.bearProbability}%</span>
        </div>
      </div>

      {/* Metrik turunan */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4 text-center">
        {[
          ["Trend", r.trendStrength], ["Entry", r.entryQuality], ["Exit", r.exitQuality],
          ["Breakout", r.breakoutProbability], ["Reversal", r.reversalProbability],
        ].map(([lbl, v]) => (
          <div key={lbl as string} className="rounded-lg bg-slate-950/40 border border-white/5 py-1.5">
            <div className="text-sm font-black text-white tabular-nums">{v as number}</div>
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-500">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Kontribusi faktor: positif & negatif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[8px] font-black uppercase tracking-widest text-green-400/70">Top Positive</p>
          {r.explanation.topPositive.length ? r.explanation.topPositive.map((f) => <FactorBar key={f.key} f={f} tone="pos" />) : <p className="text-[10px] text-slate-600">—</p>}
        </div>
        <div className="space-y-1.5">
          <p className="text-[8px] font-black uppercase tracking-widest text-red-400/70">Top Negative</p>
          {r.explanation.topNegative.length ? r.explanation.topNegative.map((f) => <FactorBar key={f.key} f={f} tone="neg" />) : <p className="text-[10px] text-slate-600">—</p>}
        </div>
      </div>

      {(r.explanation.conflictingSignals.length > 0 || r.explanation.missingConfirmations.length > 0) && (
        <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-slate-500 leading-relaxed space-y-0.5">
          {r.explanation.conflictingSignals.length > 0 && <p>⚠️ Konflik: <span className="text-amber-400/80">{r.explanation.conflictingSignals.join(", ")}</span></p>}
          {r.explanation.missingConfirmations.length > 0 && <p>Konfirmasi belum ada: {r.explanation.missingConfirmations.slice(0, 6).join(", ")}</p>}
        </div>
      )}
    </Shell>
  );
}
