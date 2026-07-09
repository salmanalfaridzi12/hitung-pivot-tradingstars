// Phase 23.2 — UI Copy helpers (presentasi dashboard AI utk pemula).
// HANYA menguji wording/label — tidak ada logika pasar di modul ini.
import { describe, it, expect } from "vitest";
import {
  humanizeReason,
  humanizeSource,
  decisionView,
  scenarioView,
  sentimentView,
  qualityView,
  aiConclusion,
  simpleComparisonRows,
} from "./uiCopy";

describe("humanizeReason — bullet engine → bahasa awam", () => {
  it("menerjemahkan reason Order Block & mempertahankan marker", () => {
    const r = humanizeReason("✔ Fresh Bullish Order Block");
    expect(r.startsWith("✔ ")).toBe(true);
    expect(r).not.toMatch(/order block/i);
    expect(r).toMatch(/institusi/i);
  });

  it("menerjemahkan level pivot & liquidity tanpa kode teknikal", () => {
    expect(humanizeReason("Pivot Support S1")).not.toMatch(/\bS1\b/);
    expect(humanizeReason("Buy Side Liquidity")).not.toMatch(/liquidity/i);
    expect(humanizeReason("Below Order Block")).toMatch(/di bawah/i);
  });

  it("mengubah RR menjadi kalimat untung-rugi", () => {
    expect(humanizeReason("✔ RR 1.5")).toMatch(/1\.5/);
    expect(humanizeReason("✔ RR 1.5")).toMatch(/untung/i);
    expect(humanizeReason("• RR 0.8 di bawah minimum")).toMatch(/0\.8/);
  });

  it("meneruskan teks yang sudah ramah & handle kosong", () => {
    expect(humanizeReason("Harga jauh dari Entry")).toContain("Harga");
    expect(humanizeReason(null)).toBe("");
  });
});

describe("label view", () => {
  it("decisionView — READY/WAIT/SKIP ramah pemula", () => {
    expect(decisionView("READY").label).toBe("✅ Siap Dipantau");
    expect(decisionView("WAIT").label).toBe("⏳ Tunggu Dulu");
    expect(decisionView("SKIP").label).toBe("❌ Lewati Dulu");
    expect(decisionView(null).label).toBe("—");
  });

  it("scenarioView — rename Aggressive/Conservative", () => {
    const agg = scenarioView("aggressive");
    const cons = scenarioView("conservative");
    expect(agg.title).toBe("🔥 Masuk Sekarang");
    expect(agg.badge).toBe("⚠️ Risiko Tinggi");
    expect(cons.title).toBe("🛡️ Tunggu Konfirmasi");
    expect(cons.badge).toMatch(/pasti/i);
    expect(agg.suitable).not.toBe(cons.suitable);
  });

  it("sentimentView & qualityView — istilah pasar jadi bahasa awam", () => {
    expect(sentimentView("BULLISH").label).toMatch(/naik/i);
    expect(sentimentView("BEARISH").label).toMatch(/turun/i);
    expect(sentimentView("KONSOLIDASI").label).toMatch(/mendatar/i);
    expect(sentimentView("wait_and_see").label).toMatch(/tunggu/i);
    expect(qualityView("Very High")).toBe("Sangat Tinggi");
    expect(qualityView("Low")).toBe("Rendah");
  });
});

describe("aiConclusion — kartu 🤖 Kesimpulan AI", () => {
  it("mode BUY + READY → bias BELI dengan aksi berisi level", () => {
    const c = aiConclusion({
      mode: "BUY", decision: "READY", confidence: 72,
      entry: 6175, stopLoss: 5950, target: 6400,
    });
    expect(c.bias).toBe("BUY");
    expect(c.label).toMatch(/BELI/);
    expect(c.why).toContain("72");
    expect(c.action).toContain("6.175");
    expect(c.action).toContain("5.950");
  });

  it("mode BUY + WAIT → aksi menunggu, bukan eksekusi", () => {
    const c = aiConclusion({ mode: "BUY", decision: "WAIT", confidence: 55, entry: 6175 });
    expect(c.bias).toBe("BUY");
    expect(c.action).toMatch(/tunggu/i);
  });

  it("mode WAIT → bias TUNGGU + zona pantau di aksi", () => {
    const c = aiConclusion({ mode: "WAIT", watchLow: 5900, watchHigh: 6000 });
    expect(c.bias).toBe("WAIT");
    expect(c.label).toMatch(/TUNGGU/);
    expect(c.action).toContain("5.900");
    expect(c.action).toContain("6.000");
  });

  it("mode SKIP → bahasa menghindar tanpa level", () => {
    const c = aiConclusion({ mode: "SKIP" });
    expect(c.bias).toBe("SKIP");
    expect(c.label).toMatch(/HINDARI/i);
  });
});

describe("simpleComparisonRows — tabel Strategy/Suitable/Opportunity/Risk", () => {
  const rows = simpleComparisonRows(
    { rr: 2.5, decision: "READY" },
    { rr: 1.2, decision: "WAIT" },
    "aggressive",
    false
  );

  it("berisi baris Cocok Untuk, Peluang, Risiko, Status, Pilihan AI", () => {
    const labels = rows.map((r) => r[0]);
    expect(labels).toContain("Cocok Untuk");
    expect(labels).toContain("Peluang");
    expect(labels).toContain("Risiko");
    expect(labels).toContain("Pilihan AI");
  });

  it("peluang memuat rasio untung-rugi dari RR yang sudah dihitung", () => {
    const peluang = rows.find((r) => r[0] === "Peluang")!;
    expect(peluang[1]).toContain("2.5");
    expect(peluang[2]).toContain("1.2");
  });

  it("pilihan AI menandai strategi rekomendasi", () => {
    const star = rows.find((r) => r[0] === "Pilihan AI")!;
    expect(star[1]).toContain("⭐");
    expect(star[2]).not.toContain("⭐");
  });

  it("tanpa target → peluang jujur bilang belum ada", () => {
    const r2 = simpleComparisonRows({ rr: null, decision: "SKIP" }, { rr: null, decision: "SKIP" }, "conservative", true);
    const peluang = r2.find((r) => r[0] === "Peluang")!;
    expect(peluang[1]).toMatch(/belum ada/i);
  });
});
