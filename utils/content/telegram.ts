// Phase 24 — FORMATTER: TELEGRAM (maks 1500 karakter).
// Update kanal: judul → bias+skor → interpretasi → narasi AI (diterjemahkan,
// dipangkas lebih dulu bila panjang) → plan berdetail → risiko → kesimpulan →
// pertanyaan → hashtag → disclaimer.

import type { ContentFormatter } from "./types";
import { DISCLAIMER, deriveCrisis, fitSections, moodOf, parseRR, planDetail, scoreOf, symbolOf } from "./helpers";
import { BIAS_LABEL, conclusionLine, hookLine, questionLine, riskLine, storyParts } from "./narrator";
import { humanizeJargon } from "./humanizer";
import { buildHashtags } from "./hashtags";
import { E } from "./emoji";

const LIMIT = 1500;

const telegram: ContentFormatter = {
  mode: "telegram",
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
        { text: `${E.chart} ${symbolOf(d)} (${tf}) — Update Analisa` },
        { text: `Bias: ${BIAS_LABEL[mood]}${score != null ? ` · Keyakinan ${score}/100` : ""}` },
        { text: hookLine(mood, symbolOf(d), rng), flex: 1, min: 24 },
        { text: `${what} ${watch}`, flex: 2, min: 60 },
        { text: humanizeJargon(d.narrative), flex: 4, min: 80 },
        { text: planDetail(d, crisis) },
        { text: [riskLine(crisis ? null : parseRR(d.rrr), rng), catatan ? `Catatan: ${catatan}` : ""].filter(Boolean).join("\n"), flex: 3, min: 40 },
        { text: `${E.point} ${conclusionLine(mood, rng)}` },
        { text: questionLine(mood, rng) },
        { text: buildHashtags({ symbol: d.symbol, mood, timeframe: d.timeframe, sector: d.sector }, 4).join(" ") },
        { text: DISCLAIMER },
      ],
      LIMIT
    );
  },
};

export default telegram;
