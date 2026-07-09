// Phase 24 — FORMATTER: DISCORD (maks 1800 karakter).
// Memakai penekanan markdown (**bold**) yang dirender Discord.

import type { ContentFormatter } from "./types";
import { DISCLAIMER, deriveCrisis, fitSections, moodOf, parseRR, planDetail, scoreOf, symbolOf } from "./helpers";
import { BIAS_LABEL, conclusionLine, questionLine, riskLine, storyParts } from "./narrator";
import { humanizeJargon } from "./humanizer";
import { buildHashtags } from "./hashtags";
import { E } from "./emoji";

const LIMIT = 1800;

const discord: ContentFormatter = {
  mode: "discord",
  limit: LIMIT,
  compose(d, { rng }) {
    const mood = moodOf(d.sentiment);
    const crisis = deriveCrisis(d, mood);
    const score = scoreOf(d);
    const tf = String(d.timeframe ?? "").trim() || "DAILY";
    const { what, watch } = storyParts(mood, rng);
    return fitSections(
      [
        { text: `**${E.chart} ${symbolOf(d)} · ${tf}**` },
        { text: `**Bias:** ${BIAS_LABEL[mood]}${score != null ? ` (${score}/100)` : ""}` },
        { text: `${what} ${watch}`, flex: 2, min: 60 },
        { text: humanizeJargon(d.narrative), flex: 4, min: 80 },
        { text: `**Rencana Trading**\n${planDetail(d, crisis)}` },
        { text: riskLine(crisis ? null : parseRR(d.rrr), rng), flex: 3, min: 30 },
        { text: `${E.point} ${conclusionLine(mood, rng)}` },
        { text: questionLine(mood, rng) },
        { text: buildHashtags({ symbol: d.symbol, mood, timeframe: d.timeframe, sector: d.sector }, 5).join(" ") },
        { text: DISCLAIMER },
      ],
      LIMIT
    );
  },
};

export default discord;
