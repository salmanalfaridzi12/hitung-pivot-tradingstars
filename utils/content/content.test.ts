// Phase 24 — AI CONTENT ENGINE (presentation-only).
// Menguji dispatch registry, batas karakter per platform, variasi kalimat
// ber-seed (deterministik), dan pelestarian Plan/Question/Hashtag saat trim.
import { describe, it, expect } from "vitest";
import { composeContent, registerFormatter, listModes } from "./index";
import { buildHashtags } from "./hashtags";
import type { ContentInput } from "./types";

const base: ContentInput = {
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
  sector: "Perbankan",
};

// Narasi super panjang untuk menguji auto-trim.
const longInput: ContentInput = {
  ...base,
  narrative: Array(40).fill("Harga bergerak dalam rentang yang menarik untuk dicermati para pelaku pasar.").join(" "),
};

describe("composeContent — dispatch & registry (Phase 1 & 9)", () => {
  it("semua mode bawaan terdaftar dan menghasilkan teks", () => {
    for (const mode of ["report", "telegram", "threads", "discord", "whatsapp", "instagram", "twitter"]) {
      expect(listModes()).toContain(mode);
      const out = composeContent(base, { mode, seed: 1 });
      expect(out.length).toBeGreaterThan(50);
    }
  });

  it("mode tak dikenal → error yang menyebut mode tersedia", () => {
    expect(() => composeContent(base, { mode: "myspace" })).toThrow(/tidak dikenal/i);
  });

  it("formatter baru cukup register tanpa mengubah kode lama", () => {
    registerFormatter({ mode: "tiktok", limit: 100, compose: () => "halo dari tiktok #test" });
    expect(composeContent(base, { mode: "tiktok", seed: 1 })).toContain("tiktok");
  });
});

describe("batas karakter per platform (Phase 6)", () => {
  const limits: [string, number][] = [
    ["threads", 450], ["twitter", 280], ["telegram", 1500], ["discord", 1800], ["instagram", 2200],
  ];
  for (const [mode, limit] of limits) {
    it(`${mode} ≤ ${limit} karakter meski narasi sangat panjang`, () => {
      expect(composeContent(longInput, { mode, seed: 3 }).length).toBeLessThanOrEqual(limit);
    });
  }

  it("trim mempertahankan Trading Plan, Question, dan Hashtag", () => {
    for (const mode of ["threads", "instagram", "twitter"]) {
      const out = composeContent(longInput, { mode, seed: 5 });
      expect(out).toContain("📍");          // plan
      expect(out).toContain("?");           // pertanyaan engagement
      expect(out).toContain("#");           // hashtag
    }
  });
});

describe("threads terasa seperti trader, bukan AI (Phase 2 & 8)", () => {
  it("tidak mendeskripsikan indikator mentah", () => {
    const out = composeContent(base, { mode: "threads", seed: 7 });
    expect(out).not.toMatch(/marubozu|MA ?20|\bR[123]\b|\bS[123]\b|\bBoS\b|order block/i);
  });

  it("tidak menyebut 'AI' berlebihan", () => {
    const out = composeContent(base, { mode: "threads", seed: 11 });
    expect((out.match(/\bAI\b/g) ?? []).length).toBeLessThanOrEqual(2);
  });

  it("memuat interpretasi pasar + level plan yang sama persis", () => {
    const out = composeContent(base, { mode: "threads", seed: 13 });
    expect(out).toContain("6.175");
    expect(out).toContain("6.400");
    expect(out).toContain("5.950");
  });
});

describe("variasi kalimat ber-seed (Phase 3, 4, 7)", () => {
  it("seed sama → output identik (deterministik, bisa diuji)", () => {
    const a = composeContent(base, { mode: "threads", seed: 42 });
    const b = composeContent(base, { mode: "threads", seed: 42 });
    expect(a).toBe(b);
  });

  it("seed berbeda → hook & wording bervariasi, info trading tetap sama", () => {
    const outs = Array.from({ length: 10 }, (_, i) => composeContent(base, { mode: "threads", seed: i + 1 }));
    const hooks = new Set(outs.map((t) => t.split("\n")[0]));
    expect(hooks.size).toBeGreaterThanOrEqual(2);
    expect(new Set(outs).size).toBeGreaterThanOrEqual(3);
    for (const t of outs) expect(t).toContain("6.175"); // level tidak pernah berubah
  });

  it("pertanyaan engagement ikut bervariasi", () => {
    const qs = new Set(
      Array.from({ length: 12 }, (_, i) => {
        const lines = composeContent(base, { mode: "threads", seed: i + 100 }).split("\n").filter(Boolean);
        return lines[lines.length - 2]; // baris sebelum hashtag
      })
    );
    expect(qs.size).toBeGreaterThanOrEqual(2);
  });
});

describe("hashtag dinamis (Phase 5)", () => {
  it("dibangun dari simbol, bias, sektor — maksimal 8", () => {
    const tags = buildHashtags({ symbol: "HATM", mood: "bullish", timeframe: "DAILY", sector: "Perbankan" });
    expect(tags.length).toBeLessThanOrEqual(8);
    expect(tags).toContain("#HATM");
    expect(tags).toContain("#TradingStars");
    expect(tags).toContain("#Perbankan");
    expect(tags.every((t) => t.startsWith("#"))).toBe(true);
  });

  it("tanpa sektor & simbol tetap valid tanpa duplikat", () => {
    const tags = buildHashtags({ symbol: "", mood: "wait", timeframe: null, sector: null });
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags.length).toBeGreaterThanOrEqual(4);
  });
});

describe("mode lain — struktur kunci", () => {
  it("report memuat plan + disclaimer edukatif", () => {
    const out = composeContent(base, { mode: "report", seed: 2 });
    expect(out).toContain("6.175");
    expect(out).toMatch(/edukatif/i);
  });

  it("whatsapp tanpa hashtag (bersih untuk chat)", () => {
    expect(composeContent(base, { mode: "whatsapp", seed: 2 })).not.toContain("#");
  });

  it("discord memakai penekanan markdown", () => {
    expect(composeContent(base, { mode: "discord", seed: 2 })).toContain("**");
  });

  it("crisis (bearish) → tanpa Entry, ada zona pantau", () => {
    const bearish: ContentInput = {
      ...base, sentiment: "BEARISH", crisis: true, rrr: null,
      entryAggressive: { level: "N/A" }, entryDemand: { level: "N/A" },
      tp: { level: "N/A" }, sl: { level: "N/A" },
    };
    const out = composeContent(bearish, { mode: "threads", seed: 4 });
    expect(out).not.toContain("📍");
    expect(out).toContain("5.900");
  });
});
