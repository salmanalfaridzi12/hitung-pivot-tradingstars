import { describe, it, expect } from "vitest";
import { buildChatContext, compressHistory, estimateTokens, buildChatRequest, MAX_HISTORY, type ChatMessage } from "./chatContext";
import { parseSSE } from "./chatClient";
import { scoreConfluence, type FactorInput } from "../../utils/institutionalConfluence";
import type { ValidatorInput } from "./institutionalSchema";

const factors: FactorInput[] = [
  { key: "trend", label: "Trend", value: 80, weight: 0.15, bullish: true },
  { key: "volume", label: "Volume", value: 70, weight: 0.10, bullish: true },
];
const input: ValidatorInput = { ticker: "BBCA", timeframe: "weekly", confluence: scoreConfluence(factors) };
const msgs = (n: number): ChatMessage[] => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `msg ${i}` }));

describe("chatContext", () => {
  it("buildChatContext: berisi ringkasan confluence & TANPA OHLC/candle/array besar", () => {
    const ctx = buildChatContext(input);
    const json = JSON.stringify(ctx);
    expect(ctx.data.ticker).toBe("BBCA");
    expect(ctx.data.confluence).toBeTruthy();
    expect(/ohlc|candle|"open"|"high"|"low"/i.test(json)).toBe(false);
    expect(json.length).toBeLessThan(4000); // terkompresi
  });

  it("buildChatContext: menyertakan ringkasan validator & focus bila diberikan", () => {
    const validator: any = { institutionalBias: "Bullish", executiveSummary: "ringkas", tradeManagement: { entryLogic: "e", stopLogic: "s", takeProfitLogic: "t", invalidations: [] } };
    const ctx = buildChatContext(input, { validator, focus: "Confluence" });
    expect(ctx.validator?.bias).toBe("Bullish");
    expect(ctx.focus).toBe("Confluence");
  });

  it("compressHistory: pertahankan ≤MAX & ringkas yang lama", () => {
    expect(compressHistory(msgs(10)).length).toBe(10);
    const big = compressHistory(msgs(40));
    expect(big.length).toBe(MAX_HISTORY + 1); // 1 ringkasan + 20 terakhir
    expect(big[0].content).toContain("Ringkasan");
    expect(big[big.length - 1].content).toBe("msg 39");
  });

  it("estimateTokens & buildChatRequest", () => {
    expect(estimateTokens("abcd")).toBe(1);
    const req = buildChatRequest(buildChatContext(input), msgs(30), "Kenapa bullish?");
    expect(req.question).toBe("Kenapa bullish?");
    expect(req.history.length).toBeLessThanOrEqual(MAX_HISTORY + 1);
  });
});

describe("parseSSE", () => {
  it("parse beberapa event lengkap + sisakan buffer parsial", () => {
    const { events, rest } = parseSSE(`data: ${JSON.stringify({ delta: "Ha" })}\n\ndata: ${JSON.stringify({ delta: "lo" })}\n\ndata: {"del`);
    expect(events.length).toBe(2);
    expect(events[0].delta).toBe("Ha");
    expect(events[1].delta).toBe("lo");
    expect(rest).toBe('data: {"del');
  });

  it("event done & error terbaca; baris rusak diabaikan", () => {
    const { events } = parseSSE(`data: not-json\n\ndata: ${JSON.stringify({ done: true })}\n\ndata: ${JSON.stringify({ error: "x" })}\n\n`);
    expect(events.some((e) => e.done)).toBe(true);
    expect(events.some((e) => e.error === "x")).toBe(true);
    expect(events.length).toBe(2); // baris rusak tidak masuk
  });
});
