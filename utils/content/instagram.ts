// Phase 24 — FORMATTER: INSTAGRAM (maks 2200 karakter).
// Caption panjang: hook → interpretasi (2 paragraf) → skor → narasi AI
// (diterjemahkan) → plan → risiko → kesimpulan → pertanyaan → hashtag (maks 8).

import type { ContentFormatter } from "./types";
import { deriveCrisis, fitSections, moodOf, parseRR, planBlock, scoreOf, symbolOf } from "./helpers";
import { conclusionLine, hookLine, questionLine, riskLine, scoreLine, storyParts } from "./narrator";
import { humanizeJargon } from "./humanizer";
import { buildHashtags } from "./hashtags";
import { E } from "./emoji";

const LIMIT = 2200;

const instagram: ContentFormatter = {
  mode: "instagram",
  limit: LIMIT,
  compose(d, { rng }) {
    const mood = moodOf(d.sentiment);
    const crisis = deriveCrisis(d, mood);
    const { what, watch } = storyParts(mood, rng);
    return fitSections(
      [
        { text: hookLine(mood, symbolOf(d), rng) },
        { text: what, flex: 1, min: 40 },
        { text: `${watch} ${scoreLine(scoreOf(d), rng)}`.trim(), flex: 2, min: 40 },
        { text: humanizeJargon(d.narrative), flex: 4, min: 80 },
        { text: planBlock(d, crisis) },
        { text: riskLine(crisis ? null : parseRR(d.rrr), rng), flex: 3, min: 30 },
        { text: `${E.point} ${conclusionLine(mood, rng)}` },
        { text: questionLine(mood, rng) },
        { text: buildHashtags({ symbol: d.symbol, mood, timeframe: d.timeframe, sector: d.sector }, 8).join(" ") },
      ],
      LIMIT
    );
  },
};

export default instagram;
