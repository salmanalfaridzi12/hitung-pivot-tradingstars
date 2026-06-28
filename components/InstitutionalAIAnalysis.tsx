"use client";

import React, { useEffect, useState } from "react";
import type { ValidatorResult } from "../lib/ai/institutionalValidator";
import type { ValidatorInput, InstitutionalAnalysis } from "../lib/ai/institutionalSchema";
import DataSourceBadge from "./DataSourceBadge";

// Phase 19 (Architecture Lockdown): KOMPONEN PRESENTASI MURNI.
// Tidak menjalankan Institutional Validator. Eksekusi ada di orchestrator (page.jsx);
// hasil + status diterima via props, aksi didelegasikan lewat onGenerate.
interface Props {
  /** Output pipeline (aiValidatorInput) — penanda apakah analisa bisa di-generate. */
  input?: ValidatorInput | null;
  /** Hasil Validator yang dijalankan orchestrator (page.jsx). */
  analysis?: ValidatorResult | null;
  loading?: boolean;
  error?: string | null;
  /** Minta orchestrator menjalankan Validator (komponen tidak mengeksekusi engine). */
  onGenerate: () => void;
}

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="depth-3d bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl border border-purple-500/25 p-5 transition-all hover:shadow-[0_0_22px_rgba(168,85,247,0.3)]">
    <h3 className="text-sm font-black text-purple-300 uppercase tracking-widest flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" /> Institutional AI Analysis
      <DataSourceBadge source="InstitutionalValidator" />
    </h3>
    {children}
  </div>
);

function Section({ title, body }: { title: string; body: string }): React.JSX.Element | null {
  if (!body) return null;
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</p>
      <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}

function Chips({ title, items, tone }: { title: string; items: string[]; tone: "pos" | "neg" | "neutral" }): React.JSX.Element | null {
  if (!items?.length) return null;
  const cls = tone === "pos" ? "text-green-300 border-green-400/30 bg-green-500/10"
    : tone === "neg" ? "text-red-300 border-red-400/30 bg-red-500/10"
    : "text-slate-300 border-white/10 bg-slate-500/10";
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((it, i) => <span key={i} className={`text-[10px] leading-snug px-2 py-1 rounded-lg border ${cls}`}>{it}</span>)}
      </div>
    </div>
  );
}

const sourceBadge: Record<string, string> = {
  ai: "text-green-300 border-green-400/50 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.4)]",
  cache: "text-blue-300 border-blue-400/40 bg-blue-500/10",
};

export default function InstitutionalAIAnalysis({ input, analysis, loading = false, error = null, onGenerate }: Props): React.JSX.Element {
  const [typed, setTyped] = useState("");
  const result = analysis ?? null;

  // Animasi "streaming": ketik executiveSummary bertahap (display-only).
  useEffect(() => {
    const full = result?.analysis.executiveSummary ?? "";
    if (!full) { setTyped(""); return; }
    setTyped("");
    let i = 0;
    const id = setInterval(() => { i += 3; setTyped(full.slice(0, i)); if (i >= full.length) clearInterval(id); }, 16);
    return () => clearInterval(id);
  }, [result]);

  if (!input) {
    return <Shell><p className="text-[11px] text-slate-500 leading-relaxed">Jalankan analisa saham dulu agar Institutional Confluence tersedia.</p></Shell>;
  }

  if (loading) {
    return (
      <Shell>
        <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Memuat analisa AI institusional">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-3 rounded bg-slate-800/40" style={{ width: `${90 - i * 8}%` }} />)}
        </div>
      </Shell>
    );
  }

  // Phase 17.2 (Zero Mock): AI gagal → state eksplisit "AI Analysis Unavailable".
  // Tidak ada narasi/fallback yang dirender.
  if (error) {
    return (
      <Shell>
        <div className="space-y-2">
          <p className="text-[12px] font-black uppercase tracking-widest text-amber-300" role="alert">AI Analysis Unavailable</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">Reason: {error}</p>
          <button onClick={onGenerate} className="mt-1 px-4 py-2 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-300 text-[11px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all">
            Coba Lagi →
          </button>
        </div>
      </Shell>
    );
  }

  if (!result) {
    return (
      <Shell>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">Hasilkan interpretasi institusional (Gemini menjelaskan output Confluence Engine — tidak menghitung apa pun).</p>
        <button onClick={onGenerate} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:brightness-110 transition-all">
          Generate Institutional Analysis →
        </button>
      </Shell>
    );
  }

  const a: InstitutionalAnalysis = result.analysis;
  const tm = a.tradeManagement;
  const isDev = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

  return (
    <Shell>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className="text-[11px] font-black text-white">{a.institutionalBias}</span>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${sourceBadge[result.telemetry.source]}`}>
            {result.telemetry.source === "cache" ? "Cached" : "AI"}
          </span>
          <button onClick={onGenerate} className="text-[9px] font-black text-purple-300 hover:text-purple-200 uppercase tracking-wider">↻ Ulangi</button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Executive summary dengan animasi ketik */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Executive Summary</p>
          <p className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-line">
            {typed}{typed.length < (a.executiveSummary?.length ?? 0) && <span className="text-purple-400 animate-pulse">▋</span>}
          </p>
        </div>
        <Section title="Confidence" body={a.confidenceExplanation} />
        <Section title="Market Narrative" body={a.marketNarrative} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-2.5"><p className="text-[8px] font-black uppercase tracking-widest text-green-400 mb-1">Bull</p><p className="text-[10px] text-slate-300 leading-snug">{a.bullScenario}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-500/5 p-2.5"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Neutral</p><p className="text-[10px] text-slate-300 leading-snug">{a.neutralScenario}</p></div>
          <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-2.5"><p className="text-[8px] font-black uppercase tracking-widest text-red-400 mb-1">Bear</p><p className="text-[10px] text-slate-300 leading-snug">{a.bearScenario}</p></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Chips title="Top Strengths" items={a.topStrengths} tone="pos" />
          <Chips title="Top Risks" items={a.topRisks} tone="neg" />
        </div>
        {(a.missingConfirmations?.length > 0 || a.conflictingSignals?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Chips title="Missing Confirmations" items={a.missingConfirmations} tone="neutral" />
            <Chips title="Conflicting Signals" items={a.conflictingSignals} tone="neg" />
          </div>
        )}

        {/* Trade management */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-purple-300">Trade Management</p>
          <p className="text-[10px] text-slate-300 leading-snug"><span className="text-green-300 font-bold">Entry:</span> {tm.entryLogic}</p>
          <p className="text-[10px] text-slate-300 leading-snug"><span className="text-red-300 font-bold">Stop:</span> {tm.stopLogic}</p>
          <p className="text-[10px] text-slate-300 leading-snug"><span className="text-emerald-300 font-bold">TP:</span> {tm.takeProfitLogic}</p>
          {tm.invalidations?.length > 0 && <p className="text-[9px] text-amber-400/80 leading-snug">Invalidasi: {tm.invalidations.join(" · ")}</p>}
        </div>

        <Section title="Institutional Commentary" body={a.institutionalCommentary} />
        <Chips title="Next Catalysts" items={a.nextCatalysts} tone="neutral" />

        {isDev && (
          <p className="text-[8px] text-slate-600 font-mono pt-2 border-t border-white/5">
            dev · {result.telemetry.responseTimeMs}ms · source={result.telemetry.source} · retries={result.telemetry.retryCount} · cache={String(result.telemetry.cacheHit)}
          </p>
        )}
      </div>
    </Shell>
  );
}
