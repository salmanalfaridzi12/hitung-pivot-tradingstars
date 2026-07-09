// Phase 24 — FORMATTER: REPORT (maks 4000 karakter).
// Laporan lengkap ala riset premium (setara teks "Salin"), dengan wording
// bervariasi dari narrator. Struktur: header → kondisi → keyakinan →
// ringkasan → plan → risiko → kesimpulan → disclaimer.

import type { ContentFormatter } from "./types";
import { DISCLAIMER, deriveCrisis, fitSections, moodOf, parseRR, planDetail, scoreOf, symbolOf } from "./helpers";
import { BIAS_LABEL, conclusionLine, questionLine, riskLine, scoreLine, storyParts } from "./narrator";
import { humanizeJargon } from "./humanizer";
import { E } from "./emoji";

const LIMIT = 4000;
const DIVIDER = "━━━━━━━━━━━━━━━━━━";

const report: ContentFormatter = {
  mode: "report",
  limit: LIMIT,
  compose(d, { rng }) {
    const mood = moodOf(d.sentiment);
    const crisis = deriveCrisis(d, mood);
    const score = scoreOf(d);
    const tf = String(d.timeframe ?? "").trim() || "DAILY";
    const { what, watch } = storyParts(mood, rng);
    const catatan = humanizeJargon(d.risk);
    return fitSections(
      [
        { text: `${E.chart} Analisa — ${symbolOf(d)} (${tf})` },
        { text: `Kondisi Pasar: ${BIAS_LABEL[mood]}${score != null ? `\n${scoreLine(score, rng)}` : ""}` },
        { text: DIVIDER },
        { text: `${E.robot} Ringkasan\n\n${what} ${watch}` },
        { text: humanizeJargon(d.narrative), flex: 4, min: 100 },
        { text: DIVIDER },
        { text: `Rencana Trading\n${planDetail(d, crisis)}` },
        { text: [riskLine(crisis ? null : parseRR(d.rrr), rng), catatan ? `Catatan: ${catatan}` : ""].filter(Boolean).join("\n"), flex: 3, min: 40 },
        { text: `${E.point} ${conclusionLine(mood, rng)}` },
        { text: questionLine(mood, rng), flex: 2, min: 0 },
        { text: DIVIDER },
        { text: DISCLAIMER },
      ],
      LIMIT
    );
  },
};

export default report;
