// Phase 24 — FORMATTER: THREADS (maks 450 karakter).
// Terasa seperti trader sungguhan yang posting: hook → interpretasi pasar →
// plan → pengingat risiko → pertanyaan → hashtag. Interpretasi, BUKAN
// deskripsi indikator (Phase 2). Auto-trim menjaga Plan/Question/Hashtag.

import type { ContentFormatter } from "./types";
import { deriveCrisis, fitSections, moodOf, parseRR, planBlock, symbolOf } from "./helpers";
import { hookLine, questionLine, riskLine, storyParts } from "./narrator";
import { buildHashtags } from "./hashtags";

const LIMIT = 450;

const threads: ContentFormatter = {
  mode: "threads",
  limit: LIMIT,
  compose(d, { rng }) {
    const mood = moodOf(d.sentiment);
    const crisis = deriveCrisis(d, mood);
    const { what, watch } = storyParts(mood, rng);
    return fitSections(
      [
        { text: hookLine(mood, symbolOf(d), rng) },
        { text: `${what} ${watch}`, flex: 3, min: 40 },
        { text: planBlock(d, crisis) },
        { text: riskLine(crisis ? null : parseRR(d.rrr), rng), flex: 2 },
        { text: questionLine(mood, rng) },
        { text: buildHashtags({ symbol: d.symbol, mood, timeframe: d.timeframe, sector: d.sector }, 6).join(" ") },
      ],
      LIMIT
    );
  },
};

export default threads;
