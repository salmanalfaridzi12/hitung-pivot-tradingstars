// Phase 24 — FORMATTER: TWITTER/X (maks 280 karakter).
// Super ringkas: hook → satu kalimat interpretasi → plan satu baris →
// pertanyaan → 3 hashtag. Plan/Question/Hashtag tidak pernah dipangkas.

import type { ContentFormatter } from "./types";
import { deriveCrisis, fitSections, moodOf, planLine, symbolOf } from "./helpers";
import { hookLine, questionLine, storyParts } from "./narrator";
import { buildHashtags } from "./hashtags";

const LIMIT = 280;

const twitter: ContentFormatter = {
  mode: "twitter",
  limit: LIMIT,
  compose(d, { rng }) {
    const mood = moodOf(d.sentiment);
    const crisis = deriveCrisis(d, mood);
    const { what } = storyParts(mood, rng);
    return fitSections(
      [
        { text: hookLine(mood, symbolOf(d), rng), flex: 1, min: 24 },
        { text: what, flex: 3, min: 30 },
        { text: planLine(d, crisis) },
        { text: questionLine(mood, rng) },
        { text: buildHashtags({ symbol: d.symbol, mood, timeframe: d.timeframe }, 3).join(" ") },
      ],
      LIMIT
    );
  },
};

export default twitter;
