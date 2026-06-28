// Phase 17 · Module 2 — orchestrator AI Institutional Validator (client).
// Alur: kompres data deterministik → cache → POST /api/institutional-ai (Gemini)
// → validasi Zod → retry sekali. Tidak ada kalkulasi AI.
// Phase 17.2 (Zero Mock): TIDAK ada fallback deterministik. Bila Gemini gagal,
// lempar error → UI menampilkan state "AI Analysis Unavailable" (tanpa fabrikasi).

import {
  InstitutionalAnalysisSchema, compressForAI, aiCacheKey,
  type InstitutionalAnalysis, type ValidatorInput, type CompressedPayload,
} from "./institutionalSchema";

export type AnalysisSource = "ai" | "cache";

export interface Telemetry {
  responseTimeMs: number;
  cacheHit: boolean;
  retryCount: number;
  source: AnalysisSource;
}

export interface ValidatorResult {
  analysis: InstitutionalAnalysis;
  telemetry: Telemetry;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 menit
const cache = new Map<string, { at: number; analysis: InstitutionalAnalysis }>();
export function clearAiCache(): void { cache.clear(); }

async function callRoute(payload: CompressedPayload, signal: AbortSignal): Promise<unknown> {
  const res = await fetch("/api/institutional-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
    signal,
  });
  const json = await res.json().catch(() => null);
  if (!json || json.ok !== true) throw new Error(json?.error || `HTTP ${res.status}`);
  return json.analysis;
}

export async function getInstitutionalAnalysis(
  input: ValidatorInput,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<ValidatorResult> {
  const start = Date.now();
  const key = aiCacheKey(input.ticker, input.timeframe, input.confluence);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return { analysis: cached.analysis, telemetry: { responseTimeMs: Date.now() - start, cacheHit: true, retryCount: 0, source: "cache" } };
  }

  const payload = compressForAI(input);
  const timeoutMs = opts.timeoutMs ?? 25000;
  let attempts = 0;
  let lastError = "";

  while (attempts < 2) {
    attempts++;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    if (opts.signal) {
      if (opts.signal.aborted) ctrl.abort();
      else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
    try {
      const raw = await callRoute(payload, ctrl.signal);
      clearTimeout(timer);
      const parsed = InstitutionalAnalysisSchema.safeParse(raw);
      if (parsed.success) {
        cache.set(key, { at: Date.now(), analysis: parsed.data });
        return { analysis: parsed.data, telemetry: { responseTimeMs: Date.now() - start, cacheHit: false, retryCount: attempts - 1, source: "ai" } };
      }
      lastError = "Format respons AI tidak valid."; // JSON tak sesuai schema → retry bila masih ada attempt
    } catch (e: any) {
      clearTimeout(timer);
      lastError = e?.message || "Gemini service unavailable."; // error/timeout/abort → retry bila masih ada attempt
    }
  }

  // Phase 17.2 (Zero Mock): TIDAK ada fallback. AI tidak tersedia → lempar error.
  // UI wajib menampilkan state "AI Analysis Unavailable" — tanpa narasi/fabrikasi.
  throw new Error(lastError || "Gemini service unavailable.");
}
