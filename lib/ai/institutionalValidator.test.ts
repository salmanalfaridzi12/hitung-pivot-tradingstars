import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getInstitutionalAnalysis, clearAiCache } from "./institutionalValidator";
import { type ValidatorInput } from "./institutionalSchema";
import { scoreConfluence, type FactorInput } from "../../utils/institutionalConfluence";

const factors: FactorInput[] = [
  { key: "trend", label: "Trend", value: 80, weight: 0.15, bullish: true },
  { key: "volume", label: "Volume", value: 70, weight: 0.10, bullish: true },
  { key: "liquidity", label: "Liquidity", value: 65, weight: 0.10, bullish: true },
];
function makeInput(ticker = "BBCA"): ValidatorInput {
  return { ticker, timeframe: "weekly", confluence: scoreConfluence(factors) };
}

const VALID = {
  institutionalBias: "Bullish", confidenceExplanation: "x", executiveSummary: "x", marketNarrative: "x",
  bullScenario: "x", bearScenario: "x", neutralScenario: "x",
  topRisks: ["r"], topStrengths: ["s"], missingConfirmations: [], conflictingSignals: [],
  tradeManagement: { entryLogic: "x", stopLogic: "x", takeProfitLogic: "x", invalidations: ["i"] },
  institutionalCommentary: "x", nextCatalysts: ["c"],
};
const ok = (analysis: unknown) => ({ json: async () => ({ ok: true, analysis }) });

beforeEach(() => { clearAiCache(); vi.restoreAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("getInstitutionalAnalysis", () => {
  it("AI sukses → source 'ai', tanpa retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(VALID));
    vi.stubGlobal("fetch", fetchMock);
    const r = await getInstitutionalAnalysis(makeInput());
    expect(r.telemetry.source).toBe("ai");
    expect(r.telemetry.retryCount).toBe(0);
    expect(r.analysis.institutionalBias).toBe("Bullish");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Phase 17.2 (Zero Mock): tidak ada fallback — kegagalan AI WAJIB melempar error.
  it("JSON malformed (gagal Zod) 2x → throw (tanpa fallback), fetch 2x", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ foo: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getInstitutionalAnalysis(makeInput())).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("malformed lalu valid → retry sukses (source 'ai', retryCount 1)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ bad: true }))
      .mockResolvedValueOnce(ok(VALID));
    vi.stubGlobal("fetch", fetchMock);
    const r = await getInstitutionalAnalysis(makeInput());
    expect(r.telemetry.source).toBe("ai");
    expect(r.telemetry.retryCount).toBe(1);
  });

  it("route error (ok:false) → throw dengan pesan error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ ok: false, error: "boom" }) }));
    await expect(getInstitutionalAnalysis(makeInput())).rejects.toThrow(/boom/);
  });

  it("timeout/abort (fetch reject) → throw, tidak fabrikasi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    await expect(getInstitutionalAnalysis(makeInput())).rejects.toThrow();
  });

  it("cache: panggilan kedua (key sama) → source 'cache', fetch tidak dipanggil lagi", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(VALID));
    vi.stubGlobal("fetch", fetchMock);
    const first = await getInstitutionalAnalysis(makeInput());
    expect(first.telemetry.source).toBe("ai");
    const second = await getInstitutionalAnalysis(makeInput());
    expect(second.telemetry.source).toBe("cache");
    expect(second.telemetry.cacheHit).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("AI tidak tersedia → throw (tanpa analysis fabricated)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("x")));
    await expect(getInstitutionalAnalysis(makeInput("ADRO"))).rejects.toThrow();
  });
});
