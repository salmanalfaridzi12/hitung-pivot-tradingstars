// Phase 23.1 — Threads Copywriting (formatter BARU, bukan reuse teks Salin/Telegram).
// Menguji wording & batasan platform saja — tanpa kalkulasi pasar.
import { describe, it, expect } from "vitest";
import { composeThreadsCopy, type AiCopyInput } from "./aiCopywriting";

const bullish: AiCopyInput = {
  symbol: "HATM",
  timeframe: "DAILY",
  sentiment: "BULLISH",
  confluenceScore: 72,
  headline: "HATM breakout R1 dengan volume tinggi",
  narrative:
    "HATM ditutup dengan pola Bullish Marubozu yang mengindikasikan momentum bullish sangat kuat, didukung oleh volume yang jauh di atas MA20 Volume.",
  entryAggressive: { level: 6175, desc: "breakout R1" },
  entryDemand: { level: 6000, desc: "batas bawah area demand" },
  tp: { level: 6400, reason: "resistance R2" },
  sl: { level: 5950, reason: "di bawah S1" },
  zonaPantau: { bottom: 5900, top: 6000, desc: "area demand terdekat" },
  risk: "Volume dapat menurun sewaktu-waktu.",
  rrr: "1.85",
  crisis: false,
};

const bearish: AiCopyInput = {
  ...bullish,
  sentiment: "BEARISH",
  crisis: true,
  confluenceScore: 25,
  entryAggressive: { level: "N/A", desc: "" },
  entryDemand: { level: "N/A", desc: "" },
  tp: { level: "N/A", reason: "" },
  sl: { level: "N/A", reason: "" },
  rrr: null,
};

// Jumlah emoji dihitung dari daftar emoji yang boleh dipakai formatter ini.
const countEmoji = (t: string) => (t.match(/📈|📉|👀|⚠️|⏳|📍|🎯|🛑|🛡️/g) ?? []).length;

describe("composeThreadsCopy — batasan platform", () => {
  it("maksimal 450 karakter (bullish & crisis)", () => {
    expect(composeThreadsCopy(bullish).length).toBeLessThanOrEqual(450);
    expect(composeThreadsCopy(bearish).length).toBeLessThanOrEqual(450);
  });

  it("memakai 3–6 emoji, tanpa spam", () => {
    const nBull = countEmoji(composeThreadsCopy(bullish));
    const nBear = countEmoji(composeThreadsCopy(bearish));
    expect(nBull).toBeGreaterThanOrEqual(3);
    expect(nBull).toBeLessThanOrEqual(6);
    expect(nBear).toBeGreaterThanOrEqual(3);
    expect(nBear).toBeLessThanOrEqual(6);
  });

  it("bukan reuse format Salin/Telegram (tanpa divider & header lama)", () => {
    const t = composeThreadsCopy(bullish);
    expect(t).not.toContain("━");
    expect(t).not.toContain("Analisa AI —");
    expect(t).not.toContain("Tingkat Keyakinan");
  });
});

describe("composeThreadsCopy — struktur konten", () => {
  it("hook menyebut simbol secara dinamis", () => {
    expect(composeThreadsCopy(bullish)).toContain("HATM");
    const lain = composeThreadsCopy({
      ...bullish,
      symbol: "BBCA",
      headline: "BBCA breakout R1 dengan volume tinggi",
      narrative: "BBCA ditutup menguat di atas MA20 Price dengan volume di atas rata-rata.",
    });
    expect(lain).toContain("BBCA");
    expect(lain).not.toContain("HATM");
  });

  it("bullish → trading plan ringkas Entry/TP/SL dengan angka id-ID", () => {
    const t = composeThreadsCopy(bullish);
    expect(t).toContain("📍 Entry 6.175");
    expect(t).toContain("🎯 TP 6.400");
    expect(t).toContain("🛑 SL 5.950");
  });

  it("crisis → tanpa Entry/TP/SL, ada ajakan memantau", () => {
    const t = composeThreadsCopy(bearish);
    expect(t).not.toContain("📍 Entry");
    expect(t).not.toContain("🎯 TP");
    expect(t).toMatch(/pantau|amati/i);
  });

  it("selalu ditutup pertanyaan engagement lalu hashtag", () => {
    const t = composeThreadsCopy(bullish);
    const lines = t.split("\n").filter(Boolean);
    const last = lines[lines.length - 1];
    const beforeTags = lines[lines.length - 2];
    expect(last.startsWith("#")).toBe(true);
    expect(beforeTags).toMatch(/\?$/);
  });

  it("hashtag 5–8 buah, memuat simbol & brand", () => {
    const t = composeThreadsCopy(bullish);
    const tags = t.split("\n").filter(Boolean).pop()!.split(/\s+/);
    expect(tags.length).toBeGreaterThanOrEqual(5);
    expect(tags.length).toBeLessThanOrEqual(8);
    expect(tags).toContain("#HATM");
    expect(tags).toContain("#TradingStars");
    expect(tags.every((h) => h.startsWith("#"))).toBe(true);
  });
});

describe("composeThreadsCopy — bahasa & adaptasi", () => {
  it("bebas jargon indikator meski headline AI teknikal", () => {
    const t = composeThreadsCopy(bullish);
    expect(t).not.toMatch(/marubozu/i);
    expect(t).not.toMatch(/MA ?20/i);
    expect(t).not.toMatch(/\bR1\b|\bR2\b|\bS1\b|\bBoS\b/);
  });

  it("pengingat risiko menyesuaikan RR", () => {
    expect(composeThreadsCopy({ ...bullish, rrr: "0.54" })).toMatch(/lebih kecil dari risikonya/i);
    expect(composeThreadsCopy({ ...bullish, rrr: "1.5" })).toMatch(/cukup sehat/i);
    expect(composeThreadsCopy({ ...bullish, rrr: 2.4 })).toMatch(/RR menarik/i);
  });

  it("pertanyaan penutup mengikuti bias pasar", () => {
    expect(composeThreadsCopy(bullish)).toMatch(/menurut kalian\?/i);
    expect(composeThreadsCopy(bearish)).toMatch(/layak hold\?/i);
  });
});
