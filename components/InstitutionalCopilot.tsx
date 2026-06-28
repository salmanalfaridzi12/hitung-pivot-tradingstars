"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Zap, XCircle, Trash2, Loader2 } from "lucide-react";
import SimpleMarkdown from "./SimpleMarkdown";
import { streamChat, type StreamTelemetry } from "../lib/ai/chatClient";
import { buildChatContext, buildChatRequest, type ChatMessage } from "../lib/ai/chatContext";
import type { ValidatorInput, InstitutionalAnalysis } from "../lib/ai/institutionalSchema";

interface Props {
  input?: ValidatorInput | null;
  validator?: InstitutionalAnalysis | null;
}

interface Msg { id: number; role: "user" | "assistant"; content: string; }

const QUICK_ACTIONS = [
  { label: "Jelaskan risiko", q: "Jelaskan risiko utama setup ini." },
  { label: "Skenario bullish", q: "Jelaskan skenario bullish." },
  { label: "Skenario bearish", q: "Jelaskan skenario bearish." },
  { label: "Kenapa confidence segini?", q: "Faktor apa yang menahan/menurunkan confidence?" },
  { label: "Apakah wait?", q: "Apakah sebaiknya saya wait & see? Jelaskan." },
];

function suggestions(ticker: string): string[] {
  const t = ticker && ticker !== "—" ? ticker : "saham ini";
  return [
    `Kenapa ${t} ${"bias-nya seperti ini"}?`,
    "Di mana smart money mengakumulasi?",
    "Di mana likuiditas terdekat?",
    "Jelaskan Order Block terdekat.",
    "Jelaskan Fair Value Gap aktif.",
    "Faktor mana yang menurunkan Confluence?",
    "Jelaskan Market Phase saat ini.",
    "Jelaskan probabilitas breakout.",
  ];
}

let msgId = 1;

export default function InstitutionalCopilot({ input, validator }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [telemetry, setTelemetry] = useState<StreamTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastQuestionRef = useRef<string>("");

  const isDev = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(async (question: string, focus?: string | null) => {
    if (!question.trim() || streaming) return;
    if (!input) { setError("Analisa saham dulu agar Copilot punya konteks."); return; }
    setError(null);
    lastQuestionRef.current = question;
    const userMsg: Msg = { id: msgId++, role: "user", content: question };
    const aiMsg: Msg = { id: msgId++, role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const ctx = buildChatContext(input, { validator, focus: focus ?? null });
    const req = buildChatRequest(ctx, history, question);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const { telemetry: tel } = await streamChat(req, {
      signal: ctrl.signal,
      onDelta: (_d, fullText) => setMessages((prev) => prev.map((m) => (m.id === aiMsg.id ? { ...m, content: fullText } : m))),
      onError: (msg) => { setError(msg); setMessages((prev) => prev.map((m) => (m.id === aiMsg.id && !m.content ? { ...m, content: `⚠️ ${msg}` } : m))); },
    });
    setTelemetry(tel);
    setStreaming(false);
  }, [input, validator, messages, streaming]);

  const stop = () => { abortRef.current?.abort(); setStreaming(false); };
  const regenerate = () => { if (lastQuestionRef.current) ask(lastQuestionRef.current); };
  const clear = () => { setMessages([]); setError(null); setTelemetry(null); };
  const copy = (text: string) => { try { navigator.clipboard?.writeText(text); } catch {} };

  // "Why?" buttons di panel dashboard memicu event global ini.
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setOpen(true);
      if (d.question) setTimeout(() => ask(d.question, d.focus), 50);
    };
    window.addEventListener("open-copilot", handler as EventListener);
    return () => window.removeEventListener("open-copilot", handler as EventListener);
  }, [ask]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Buka Institutional AI Copilot"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_24px_rgba(168,85,247,0.55)] hover:brightness-110 transition-all"
      >
        <Zap className="w-4 h-4" /> AI Copilot
      </button>
    );
  }

  const ticker = input?.ticker ?? "—";

  return (
    <div
      className={`fixed z-50 flex flex-col bg-slate-950/85 backdrop-blur-xl border border-purple-500/30 shadow-2xl shadow-black/60 ${
        full ? "inset-3 rounded-3xl" : "bottom-5 right-5 w-[min(440px,calc(100vw-2.5rem))] h-[min(620px,calc(100vh-2.5rem))] rounded-3xl"
      }`}
      role="dialog" aria-label="Institutional AI Copilot"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
        <h3 className="text-xs font-black text-purple-300 uppercase tracking-widest flex items-center gap-2">
          <Zap className="w-4 h-4" /> AI Copilot <span className="text-slate-500 normal-case tracking-normal">· {ticker}</span>
        </h3>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFull((f) => !f)} aria-label="Dock / Fullscreen" className="text-slate-400 hover:text-purple-300 text-sm w-6 h-6 flex items-center justify-center">{full ? "🗗" : "⛶"}</button>
          <button onClick={clear} aria-label="Hapus percakapan" className="text-slate-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => setOpen(false)} aria-label="Tutup" className="text-slate-400 hover:text-white"><XCircle className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">Tanya apa saja tentang analisa institusional {ticker}. Jawaban berasal dari engine deterministik — AI hanya menjelaskan.</p>
            <div className="flex flex-col gap-1.5">
              {suggestions(ticker).map((s) => (
                <button key={s} onClick={() => ask(s)} className="text-left text-[10px] text-purple-200 px-2.5 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/15 transition-all">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[11px] ${m.role === "user" ? "bg-purple-600/30 border border-purple-500/30 text-white" : "bg-slate-900/60 border border-white/5 text-slate-200"}`}>
              {m.role === "assistant" ? (
                <>
                  {m.content ? <SimpleMarkdown text={m.content} className="leading-relaxed" /> : <span className="text-slate-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> berpikir…</span>}
                  {m.content && !streaming && (
                    <button onClick={() => copy(m.content)} className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-purple-300">⧉ Salin</button>
                  )}
                </>
              ) : m.content}
            </div>
          </div>
        ))}
      </div>

      {error && !streaming && <p className="px-4 text-[10px] text-red-400/90">{error}</p>}

      {/* Quick actions */}
      {input && (
        <div className="px-3 pt-1 flex gap-1.5 flex-wrap">
          {QUICK_ACTIONS.map((qa) => (
            <button key={qa.label} disabled={streaming} onClick={() => ask(qa.q)} className="text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-white/10 bg-slate-800/50 text-slate-300 hover:text-purple-200 hover:border-purple-500/30 disabled:opacity-40 transition-all">{qa.label}</button>
          ))}
          {messages.length > 0 && !streaming && <button onClick={regenerate} className="text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-white/10 bg-slate-800/50 text-slate-300 hover:text-purple-200">↻ Regenerate</button>}
        </div>
      )}

      {/* Input */}
      <div className="p-3 flex items-end gap-2">
        <textarea
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); setDraft(""); } }}
          placeholder="Tanya Copilot…" rows={1}
          className="flex-1 resize-none bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 max-h-24"
        />
        {streaming ? (
          <button onClick={stop} aria-label="Stop" className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-black">■</button>
        ) : (
          <button onClick={() => { ask(draft); setDraft(""); }} aria-label="Kirim" disabled={!draft.trim()} className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-black disabled:opacity-40">➤</button>
        )}
      </div>

      {isDev && telemetry && (
        <p className="px-4 pb-2 text-[8px] font-mono text-slate-600">dev · {telemetry.latencyMs}ms · {telemetry.chars} chars · aborted={String(telemetry.aborted)} · err={String(telemetry.errored)}</p>
      )}
    </div>
  );
}
