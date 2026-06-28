import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getInstitutionalAnalysis, clearAiCache } from "./institutionalValidator";
import { InstitutionalAnalysisSchema, type ValidatorInput } from "./institutionalSchema";
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
    expect(r.telemetry.fallbackUsed).toBe(false);
    expect(r.analysis.institutionalBias).toBe("Bullish");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("JSON malformed (gagal Zod) 2x → fallback, retryCount 1, fetch 2x", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ foo: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await getInstitutionalAnalysis(makeInput());
    expect(r.telemetry.source).toBe("fallback");
    expect(r.telemetry.fallbackUsed).toBe(true);
    expect(r.telemetry.retryCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(InstitutionalAnalysisSchema.safeParse(r.analysis).success).toBe(true);
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

  it("route error (ok:false) → fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ ok: false, error: "boom" }) }));
    const r = await getInstitutionalAnalysis(makeInput());
    expect(r.telemetry.source).toBe("fallback");
  });

  it("timeout/abort (fetch reject) → fallback, tidak crash", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    const r = await getInstitutionalAnalysis(makeInput());
    expect(r.telemetry.source).toBe("fallback");
    expect(InstitutionalAnalysisSchema.safeParse(r.analysis).success).toBe(true);
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

  it("fallback selalu menghasilkan schema valid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("x")));
    const r = await getInstitutionalAnalysis(makeInput("ADRO"));
    const parsed = InstitutionalAnalysisSchema.safeParse(r.analysis);
    expect(parsed.success).toBe(true);
    expect(r.analysis.tradeManagement.invalidations.length).toBeGreaterThan(0);
  });
});
