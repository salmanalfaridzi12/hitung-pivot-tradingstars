// Phase 24 — CONTENT ENGINE · EMOJI (presentation-only).
// Satu sumber emoji supaya konsisten antar platform & mudah dihitung/diaudit.

export const E = {
  up: "📈",
  down: "📉",
  chart: "📊",
  watch: "👀",
  fire: "🔥",
  warn: "⚠️",
  wait: "⏳",
  entry: "📍",
  target: "🎯",
  stop: "🛑",
  shield: "🛡️",
  robot: "🤖",
  point: "👉",
} as const;

const ALL = Object.values(E);

/** Hitung pemakaian emoji milik engine (untuk menjaga "no emoji spam"). */
export function countEmoji(text: string): number {
  let n = 0;
  for (const e of ALL) n += text.split(e).length - 1;
  return n;
}
