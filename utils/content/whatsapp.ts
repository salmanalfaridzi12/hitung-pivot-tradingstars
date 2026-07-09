// Phase 24 — FORMATTER: WHATSAPP (maks 1500 karakter).
// Gaya pesan personal untuk diteruskan di chat/grup: TANPA hashtag,
// bahasa hangat, plan berdetail, ditutup disclaimer.

import type { ContentFormatter } from "./types";
import { DISCLAIMER, deriveCrisis, fitSections, moodOf, parseRR, planDetail, scoreOf, symbolOf } from "./helpers";
import { BIAS_LABEL, conclusionLine, hookLine, riskLine, storyParts } from "./narrator";
import { humanizeJargon } from "./humanizer";
import { E } from "./emoji";

const LIMIT = 1500;

const whatsapp: ContentFormatter = {
  mode: "whatsapp",
  limit: LIMIT,
  compose(d, { rng }) {
    const mood = moodOf(d.sentiment);
    const crisis = deriveCrisis(d, mood);
    const score = scoreOf(d);
    const tf = String(d.timeframe ?? "").trim() || "DAILY";
    const { what, watch } = storyParts(mood, rng);
    return fitSections(
      [
        { text: `${E.chart} ${symbolOf(d)} (${tf})` },
        { text: `Bias: ${BIAS_LABEL[mood]}${score != null ? ` · Keyakinan ${score}/100` : ""}` },
        { text: hookLine(mood, symbolOf(d), rng), flex: 1, min: 24 },
        { text: `${what} ${watch}`, flex: 2, min: 60 },
        { text: humanizeJargon(d.narrative), flex: 4, min: 80 },
        { text: planDetail(d, crisis) },
        { text: riskLine(crisis ? null : parseRR(d.rrr), rng), flex: 3, min: 30 },
        { text: `${E.point} ${conclusionLine(mood, rng)}` },
        { text: DISCLAIMER },
      ],
      LIMIT
    );
  },
};

export default whatsapp;
