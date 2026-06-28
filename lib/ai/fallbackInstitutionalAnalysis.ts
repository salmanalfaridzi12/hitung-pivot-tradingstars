// Phase 17 · Module 2 — fallback deterministik (TANPA Gemini).
// Menyusun analisa naratif dari output engine yang sudah dihitung, agar dashboard
// tidak pernah kosong saat AI gagal/timeout/ENV belum diset.

import type { CompressedPayload, InstitutionalAnalysis } from "./institutionalSchema";

const z = (zone: any) => (zone ? `${zone.bottom ?? zone.low}–${zone.top ?? zone.high}` : "n/a");

export function fallbackInstitutionalAnalysis(p: CompressedPayload): InstitutionalAnalysis {
  const c: any = p.confluence;
  const mm: any = p.marketMap;
  const ob: any = p.orderBlocks;
  const fvg: any = p.fairValueGaps;
  const bias = c.bullProbability >= c.bearProbability ? "Bullish" : "Bearish";
  const strongBias = Math.abs(c.bullProbability - c.bearProbability) >= 25;
  const biasLabel = c.grade === "WAIT" ? "Wait & See / Netral" : `${strongBias ? "Kuat " : ""}${bias}`;

  const demand = mm?.majorDemand ? z(mm.majorDemand) : (ob?.strongestBullish ? z(ob.strongestBullish) : "area support terdekat");
  const supply = mm?.majorSupply ? z(mm.majorSupply) : (ob?.strongestBearish ? z(ob.strongestBearish) : "area resistance terdekat");

  return {
    institutionalBias: `${biasLabel} — Confluence ${c.overallScore}/100 (${c.grade}), confidence ${c.confidence}%.`,
    confidenceExplanation: `Confidence ${c.confidence}% mencerminkan kesepakatan antar-engine; ${c.conflictingSignals?.length ? `terdapat konflik pada ${c.conflictingSignals.join(", ")}` : "tidak ada sinyal yang berkonflik"}.`,
    executiveSummary: `${p.ticker} (${p.timeframe}) skor institusional ${c.overallScore}/100 grade ${c.grade}. Fase pasar ${mm?.phase ?? "n/a"}, posisi ${mm?.position ?? "n/a"}, tren ${mm?.trend ?? "n/a"}. Probabilitas Bull ${c.bullProbability}% / Bear ${c.bearProbability}% / Netral ${c.neutralProbability}%.`,
    marketNarrative: `Struktur menunjukkan fase ${mm?.phase ?? "n/a"} dengan harga di area ${mm?.position ?? "n/a"}. Major demand di ${demand}, major supply di ${supply}. Kekuatan utama: ${(c.topStrengths || []).join(", ") || "—"}. Kelemahan: ${(c.topWeaknesses || []).join(", ") || "—"}.`,
    bullScenario: `Skenario bullish (≈${c.bullProbability}%): reaksi bullish dari demand ${demand} memicu kelanjutan menuju supply ${supply}. Breakout probability ${c.breakoutProbability}%.`,
    bearScenario: `Skenario bearish (≈${c.bearProbability}%): kegagalan di demand ${demand} membuka tekanan jual menuju support lebih bawah. Reversal probability ${c.reversalProbability}%.`,
    neutralScenario: `Skenario netral (≈${c.neutralProbability}%): harga berkonsolidasi di antara ${demand} dan ${supply} hingga muncul katalis/konfirmasi volume.`,
    topRisks: [
      ...(c.topWeaknesses || []).map((w: string) => `Faktor lemah: ${w}`),
      ...(c.conflictingSignals?.length ? [`Sinyal konflik: ${c.conflictingSignals.join(", ")}`] : []),
      `Risk score ${c.riskScore}/100 (volatilitas/ATR).`,
    ].slice(0, 5),
    topStrengths: (c.topStrengths || []).map((s: string) => `Faktor kuat: ${s}`).slice(0, 5),
    missingConfirmations: c.missingConfirmations || [],
    conflictingSignals: c.conflictingSignals || [],
    tradeManagement: {
      entryLogic: `Cari entry pada reaksi di demand ${demand}${ob?.nearestActive ? ` / order block ${ob.nearestActive.type} (${ob.nearestActive.low}–${ob.nearestActive.high})` : ""}.`,
      stopLogic: `Stop di bawah demand ${demand} (struktur invalid bila ditembus close).`,
      takeProfitLogic: `Target bertahap menuju supply ${supply}${fvg?.nearestActive ? ` / FVG ${fvg.nearestActive.low}–${fvg.nearestActive.high}` : ""}.`,
      invalidations: [
        `Close menembus demand ${demand}.`,
        c.grade === "WAIT" ? "Confluence < 60 — tunggu konfirmasi sebelum entry." : "Confidence turun di bawah 50%.",
      ],
    },
    institutionalCommentary: `Analisa fallback deterministik (AI tidak tersedia). Keputusan berbasis Confluence Engine: grade ${c.grade}, ${biasLabel}.`,
    nextCatalysts: ["Konfirmasi volume di area kunci", "Break of Structure / Change of Character", "Rilis berita/sentimen emiten"],
  };
}
