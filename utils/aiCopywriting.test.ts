// Phase 23 — AI Copywriting (lapisan presentasi tombol Salin).
// Menguji WORDING saja: tidak ada kalkulasi pasar yang boleh terjadi di modul ini.
import { describe, it, expect } from "vitest";
import { composeAiCopy, humanizeJargon, type AiCopyInput } from "./aiCopywriting";

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

describe("humanizeJargon", () => {
  it("menerjemahkan istilah teknikal ke bahasa awam", () => {
    expect(humanizeJargon("Volume berada di atas MA20 Volume")).not.toMatch(/MA ?20/i);
    expect(humanizeJargon("Terbentuk Bullish Marubozu")).toMatch(/pembeli/i);
    expect(humanizeJargon("Terbentuk Bullish Marubozu")).not.toMatch(/marubozu/i);
    expect(humanizeJargon("breakout R1")).toMatch(/menembus|penembusan/i);
    expect(humanizeJargon("breakout R1")).not.toMatch(/\bR1\b/);
    expect(humanizeJargon("Break of Structure (BoS) terkonfirmasi")).not.toMatch(/\bBoS\b/);
  });

  it("membiarkan teks tanpa jargon apa adanya", () => {
    expect(humanizeJargon("Harga bergerak stabil.")).toBe("Harga bergerak stabil.");
    expect(humanizeJargon(null)).toBe("");
  });
});

describe("composeAiCopy — header & status", () => {
  it("menulis header simbol (timeframe), kondisi pasar, dan skor keyakinan", () => {
    const t = composeAiCopy(bullish);
    expect(t).toContain("📊 Analisa AI — HATM (DAILY)");
    expect(t).toContain("Kondisi Pasar");
    expect(t).toMatch(/Bullish/);
    expect(t).toContain("Tingkat Keyakinan AI");
    expect(t).toContain("72/100");
  });

  it("fallback simbol/timeframe saat kosong", () => {
    const t = composeAiCopy({ ...bullish, symbol: null, timeframe: null });
    expect(t).toContain("📊 Analisa AI — Saham (DAILY)");
  });
});

describe("composeAiCopy — ringkasan bebas jargon", () => {
  it("tidak menyebut nama indikator mentah di seluruh output", () => {
    const t = composeAiCopy(bullish);
    expect(t).not.toMatch(/marubozu/i);
    expect(t).not.toMatch(/MA ?20/i);
    expect(t).not.toMatch(/\bR1\b|\bR2\b|\bS1\b/);
    expect(t).not.toMatch(/\bBoS\b|\bChoCh\b|\bFVG\b/);
  });

  it("ringkasan menjawab apa yang terjadi + apa yang diperhatikan", () => {
    const t = composeAiCopy(bullish);
    expect(t).toContain("📌 Ringkasan");
    expect(t).toMatch(/AI melihat/);
    expect(t).toMatch(/support utama/i); // panduan "yang perlu diperhatikan" utk bias naik
  });
});

describe("composeAiCopy — rencana trading", () => {
  it("menampilkan Entry, Buy on Pullback, TP, SL dengan format angka id-ID", () => {
    const t = composeAiCopy(bullish);
    expect(t).toContain("📍 Entry");
    expect(t).toContain("6.175");
    expect(t).toContain("🔄 Area Buy on Pullback");
    expect(t).toContain("6.000");
    expect(t).toContain("🎯 Target Profit");
    expect(t).toContain("6.400");
    expect(t).toContain("🛑 Stop Loss");
    expect(t).toContain("5.950");
  });

  it("baris dengan level N/A dilewati", () => {
    const t = composeAiCopy({ ...bullish, tp: { level: "N/A", reason: "" } });
    expect(t).not.toContain("🎯 Target Profit");
  });
});

describe("composeAiCopy — narasi risiko adaptif RR", () => {
  it("RR < 1 → peringatan potensi lebih kecil dari risiko", () => {
    const t = composeAiCopy({ ...bullish, rrr: "0.54" });
    expect(t).toMatch(/lebih kecil dibanding risiko/i);
  });

  it("1 ≤ RR < 2 → cukup sehat / layak dipertimbangkan", () => {
    const t = composeAiCopy({ ...bullish, rrr: "1.5" });
    expect(t).toMatch(/cukup sehat/i);
  });

  it("RR ≥ 2 → potensi jauh lebih besar dari risiko", () => {
    const t = composeAiCopy({ ...bullish, rrr: 2.4 });
    expect(t).toMatch(/jauh lebih besar/i);
  });

  it("tanpa RR → tidak ada klaim perbandingan risiko", () => {
    const t = composeAiCopy({ ...bullish, rrr: null });
    expect(t).not.toMatch(/dibanding risiko/i);
  });
});

describe("composeAiCopy — mode bearish / wait & see (crisis)", () => {
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

  it("tidak menampilkan Entry/TP/SL; tampilkan zona pantau + bahasa menunggu", () => {
    const t = composeAiCopy(bearish);
    expect(t).not.toContain("📍 Entry");
    expect(t).not.toContain("🎯 Target Profit");
    expect(t).toContain("Zona Pantau");
    expect(t).toContain("5.900");
    expect(t).toMatch(/menunggu|jangan memaksakan/i);
  });

  it("kesimpulan memakai bahasa bearish (jaga modal / tunggu pembalikan)", () => {
    const t = composeAiCopy(bearish);
    expect(t).toMatch(/tekanan jual|pembalikan/i);
  });
});

describe("composeAiCopy — sideways & penutup", () => {
  it("kondisi sideways → bahasa menunggu arah", () => {
    const t = composeAiCopy({ ...bullish, sentiment: "KONSOLIDASI" });
    expect(t).toMatch(/Sideways/);
    expect(t).toMatch(/menunggu|arah/i);
  });

  it("selalu ditutup disclaimer edukatif", () => {
    expect(composeAiCopy(bullish)).toMatch(
      /bersifat edukatif dan bukan merupakan rekomendasi investasi/
    );
  });
});
