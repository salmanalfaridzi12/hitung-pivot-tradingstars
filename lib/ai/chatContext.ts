// Phase 17 · Module 7 — Context Builder untuk Institutional AI Copilot.
// REUSE kompresi Module 2. Hanya ringkasan terkompresi — TANPA OHLC/candle/array
// besar. Gemini hanya menafsirkan output deterministik (single source of truth).

import { compressForAI, type ValidatorInput, type CompressedPayload, type InstitutionalAnalysis } from "./institutionalSchema";

export type ChatRole = "user" | "assistant";
export interface ChatMessage { role: ChatRole; content: string; }

export interface ChatContext {
  data: CompressedPayload;
  validator: { bias: string; executiveSummary: string; tradeManagement: InstitutionalAnalysis["tradeManagement"] } | null;
  focus: string | null; // nama panel untuk fokus penjelasan ("Why?" button)
}

export function buildChatContext(
  input: ValidatorInput,
  opts: { validator?: InstitutionalAnalysis | null; focus?: string | null } = {}
): ChatContext {
  return {
    data: compressForAI(input),
    validator: opts.validator
      ? { bias: opts.validator.institutionalBias, executiveSummary: opts.validator.executiveSummary, tradeManagement: opts.validator.tradeManagement }
      : null,
    focus: opts.focus ?? null,
  };
}

export const MAX_HISTORY = 20;

// Pertahankan ≤max pesan terakhir; pesan lebih lama diringkas jadi satu catatan.
export function compressHistory(messages: ChatMessage[], max = MAX_HISTORY): ChatMessage[] {
  if (messages.length <= max) return messages;
  const recent = messages.slice(-max);
  const older = messages.slice(0, messages.length - max);
  const summary = older
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content.replace(/\s+/g, " ").slice(0, 80)}`)
    .join(" | ")
    .slice(0, 700);
  return [{ role: "assistant", content: `[Ringkasan percakapan sebelumnya]: ${summary}` }, ...recent];
}

export function estimateTokens(s: string): number {
  return Math.ceil((s || "").length / 4); // perkiraan kasar ~4 char/token
}

// Susun payload chat (context + history terkompresi + pertanyaan) untuk route.
export interface ChatRequest {
  context: ChatContext;
  history: ChatMessage[];
  question: string;
}
export function buildChatRequest(context: ChatContext, history: ChatMessage[], question: string): ChatRequest {
  return { context, history: compressHistory(history), question };
}
