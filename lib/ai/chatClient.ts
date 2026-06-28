// Phase 17 · Module 7 — client SSE streaming untuk Copilot (abort/timeout/telemetry).

import type { ChatRequest } from "./chatContext";

export interface SSEEvent { delta?: string; done?: boolean; error?: string; }

// Parser SSE murni (mudah diuji): pisah event by "\n\n", ambil baris "data: {json}".
export function parseSSE(buffer: string): { events: SSEEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: SSEEvent[] = [];
  for (const part of parts) {
    const line = part.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const json = line.slice(5).trim();
    if (!json) continue;
    try { events.push(JSON.parse(json) as SSEEvent); } catch { /* abaikan baris rusak */ }
  }
  return { events, rest };
}

export interface StreamTelemetry { latencyMs: number; chars: number; aborted: boolean; errored: boolean; }
export interface StreamHandlers {
  onDelta?: (delta: string, full: string) => void;
  onDone?: (full: string) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function streamChat(payload: ChatRequest, h: StreamHandlers = {}): Promise<{ text: string; telemetry: StreamTelemetry }> {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), h.timeoutMs ?? 30000);
  if (h.signal) {
    if (h.signal.aborted) ctrl.abort();
    else h.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  let full = "", errored = false, aborted = false;
  try {
    const res = await fetch("/api/institutional-chat", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const { events, rest } = parseSSE(buf);
      buf = rest;
      for (const ev of events) {
        if (ev.error) { errored = true; h.onError?.(ev.error); }
        else if (typeof ev.delta === "string") { full += ev.delta; h.onDelta?.(ev.delta, full); }
        else if (ev.done) { h.onDone?.(full); }
      }
    }
    if (!errored) h.onDone?.(full);
  } catch (e: any) {
    aborted = e?.name === "AbortError";
    if (!errored) h.onError?.(aborted ? "Dibatalkan." : e?.message || "Koneksi gagal.");
  } finally {
    clearTimeout(timer);
  }
  return { text: full, telemetry: { latencyMs: Date.now() - start, chars: full.length, aborted, errored } };
}
