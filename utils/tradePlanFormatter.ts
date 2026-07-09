// Phase 20.1 / 20.2 — Institutional Trade Plan FORMATTER (PRESENTATION LAYER).
//
// Mengubah output engine deterministik yang SUDAH ada menjadi data siap-UI.
// TIDAK ada business logic pasar, TIDAK ada technical analysis, TIDAK ada
// kalkulasi level baru. Satu-satunya aritmetika harga: Risk/Reward =
// |TP−Entry| / |Entry−SL|.
//
// P20.2 — PRIORITY SYSTEM: alih-alih mengambil struktur PERTAMA, setiap level
// deterministik di-SKOR memakai metadata yang SUDAH ada (status Fresh/Mitigated,
// confidence, strength, priorityScore, type, proximity ke harga via ATR yang
// sudah dihitung, confluence, arah Market Map). Skor hanya menyusun ulang
// (rank/select) level yang ada — bukan menghasilkan level/angka baru.
//
// LARANGAN: ✗ level harga baru ✗ measured move/target sintetis ✗ estimasi
//           ✗ recompute Liquidity/OB/FVG/Confluence/ATR ✗ confidence baru.
//
// Sumber yang BOLEH dikonsumsi (read-only): Liquidity · Order Block · FVG ·
// Institutional Confluence · Market Map · AI Validator · Current Price ·
// Pivot · Swing High/Low · ATR (semua sudah dihitung engine lain).

import type { OrderBlockResult, OrderBlock } from "./orderBlocks";
import type { FVGResult, FairValueGap } from "./fairValueGaps";
import type { LiquidityResult } from "./liquidityEngine";
import type { MarketMap } from "./marketMap";
import type { InstitutionalConfluence } from "./institutionalConfluence";

export type TradeDirection = "bullish" | "bearish";
export type RRBadge = "Poor" | "Good" | "Excellent";
export type TargetQuality = "Very High" | "High" | "Medium" | "Low";
export type DecisionState = "READY" | "WAIT" | "SKIP";

// P20.4 — Execution Decision Layer (klasifikasi Trade Plan deterministik).
export interface TradeDecision {
  state: DecisionState;
  reasons: string[];   // 2–4 alasan ringkas yang merujuk struktur terpilih
}

export interface PivotLevels {
  PP: number; R1: number; R2: number; R3: number; S1: number; S2: number; S3: number;
}

export interface TradePlanInput {
  currentPrice: number;
  pivots: PivotLevels;
  /** Entry yang SUDAH dipilih AI Validator (mis. aiData.entry.agresif.level). Dipakai apa adanya bila valid. */
  aiSelectedEntry?: number | null;
  orderBlocks?: OrderBlockResult | null;
  fvg?: FVGResult | null;
  liquidity?: LiquidityResult | null;
  marketMap?: MarketMap | null;
  confluence?: InstitutionalConfluence | null;
}

export interface PlanLevel {
  price: number;
  /** Reason ringkas yang tampil langsung di bawah kartu. */
  reasons: string[];
  source: string;
  /** Skor prioritas (P20.2) — hasil rank metadata yang sudah ada. */
  score?: number;
}
export interface PlanTarget extends PlanLevel {
  rr: number;            // |TP−Entry| / |Entry−SL| (satu-satunya aritmetika harga)
  badge: RRBadge;
  quality: TargetQuality; // label dari skor prioritas (display)
}

export interface TradePlanView {
  valid: boolean;
  direction: TradeDirection;
  entry: PlanLevel;
  entryZone: { low: number; high: number };
  stopLoss: PlanLevel;
  targets: PlanTarget[];     // hanya struktur nyata (0–3); TANPA backfill sintetis
  confidence: number;        // = confluence.confidence (sudah dihitung)
  confidenceLabel: string;
  decision: TradeDecision;   // P20.4 — READY / WAIT / SKIP (klasifikasi, bukan prediksi)
}

// P20.7 — Dual Trade Plan (Aggressive & Conservative dari struktur deterministik yang SAMA).
export type ScenarioStyle = "aggressive" | "conservative";
export interface ScenarioPlan extends TradePlanView {
  style: ScenarioStyle;
  badge: "HIGH RISK" | "HIGH PROBABILITY";
  // P22.1 — lapisan rekomendasi (membandingkan metadata yang sudah ada; bukan prediksi).
  strategyScore: number;     // 0–100 dari metadata deterministik
  why: string[];             // alasan kenapa skenario ini kuat (2–4)
  timingHint: string;        // deskripsi struktur terpilih (bukan prediksi harga)
}
// P22.2 — LONG-ONLY MODE (IDX): tidak pernah menghasilkan rekomendasi SHORT.
// Struktur bearish → mode WAIT/SKIP + panduan akumulasi (kartu Entry/SL/TP disembunyikan).
export type MarketMode = "BUY" | "WAIT" | "SKIP";
export interface LongOnlyGuidance {
  /** Kenapa tidak ada setup BUY (deskripsi kondisi deterministik saat ini). */
  reasons: string[];
  /** Zona pantau — struktur support yang SUDAH ada (OB/Demand/Liquidity/Pivot). */
  watchZone: { low: number; high: number; source: string } | null;
  /** Zona akumulasi bila tersedia (Demand Zone / Fresh Bullish OB). */
  accumulationZone: { low: number; high: number; source: string } | null;
  /** Kondisi pemicu BUY — merujuk struktur yang ada, BUKAN prediksi. */
  buyTriggers: string[];
}
export interface DualTradePlan {
  direction: TradeDirection;
  /** P22.2 — BUY (struktur bullish) / WAIT / SKIP (struktur bearish, long-only). */
  mode: MarketMode;
  confidence: number;        // confluence (sama untuk kedua skenario)
  aggressive: ScenarioPlan;
  conservative: ScenarioPlan;
  recommended: ScenarioStyle;
  tie: boolean;              // skor seimbang → "kedua strategi sama-sama valid"
  /** Terisi hanya saat mode WAIT/SKIP (panduan long-only). */
  longOnly: LongOnlyGuidance | null;
}

// ── Util presentasi (bukan kalkulasi pasar) ──────────────────────────────────
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isActiveOB = (ob: OrderBlock) => ob.status === "Fresh" || ob.status === "Mitigated" || ob.status === "Breaker";
const isActiveFVG = (g: FairValueGap) => g.status === "Fresh" || g.status === "Partially Filled";

function badgeOf(rr: number): RRBadge {
  if (rr >= 2) return "Excellent";
  if (rr >= 1) return "Good";
  return "Poor";
}
function qualityOf(score: number): TargetQuality {
  if (score >= 55) return "Very High";
  if (score >= 40) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}
function confidenceLabelOf(n: number): string {
  if (n >= 80) return "Very Strong";
  if (n >= 65) return "Strong";
  if (n >= 50) return "Moderate";
  if (n >= 35) return "Weak";
  return "Very Weak";
}

// ATR yang SUDAH dihitung engine (OB/FVG). Tidak menghitung ATR baru.
function existingAtr(input: TradePlanInput): number | null {
  const a = input.orderBlocks?.atr ?? input.fvg?.atr;
  return isNum(a) && a > 0 ? a : null;
}

// Konteks skor — semuanya dari metadata yang sudah ada.
interface ScoreCtx {
  dir: TradeDirection;
  cp: number;
  atr: number | null;
  baseConf: number;        // = confluence.confidence (nilai yang sudah dihitung)
  highConf: boolean;       // confluence.confidence ≥ 65 (nilai yang sudah ada)
  trendMatch: boolean;     // arah plan == Market Map trend
  liqPrices: number[];     // harga zona likuiditas yang sudah ada (untuk cluster)
}

// Bangun konteks SEKALI (engine deterministik dikonsumsi sekali, tanpa recompute).
function buildCtx(input: TradePlanInput): ScoreCtx {
  const dir = resolveDirection(input);
  const c = input.confluence;
  const baseConf = c && isNum(c.confidence) ? c.confidence : c && isNum(c.overallScore) ? c.overallScore : 50;
  return {
    dir,
    cp: input.currentPrice,
    atr: existingAtr(input),
    baseConf,
    highConf: baseConf >= 65,
    trendMatch: (dir === "bullish" && input.marketMap?.trend === "Bullish") || (dir === "bearish" && input.marketMap?.trend === "Bearish"),
    liqPrices: [...(input.liquidity?.buySide ?? []), ...(input.liquidity?.sellSide ?? [])].map((z) => z.price).filter(isNum),
  };
}

// Bobot prioritas (P20.2) — skema rank, BUKAN kalkulasi pasar.
const W = { fresh: 40, untested: 30, zone: 20, cluster: 20, near: 10, conf: 30, trend: 20 };

// ── Arah (seleksi dari probabilitas/tren yang sudah dihitung) ─────────────────
function resolveDirection(input: TradePlanInput): TradeDirection {
  const c = input.confluence;
  if (c && isNum(c.bullProbability) && isNum(c.bearProbability) && c.bullProbability !== c.bearProbability) {
    return c.bullProbability > c.bearProbability ? "bullish" : "bearish";
  }
  const mm = input.marketMap;
  if (mm?.trend === "Bullish") return "bullish";
  if (mm?.trend === "Bearish") return "bearish";
  return input.currentPrice >= input.pivots.PP ? "bullish" : "bearish";
}

// Bonus kontekstual bersama (zone/cluster/near/confluence/trend) atas SATU level.
function contextBonus(level: number, inZone: boolean, ctx: ScoreCtx, reasons: string[]): number {
  let s = 0;
  if (inZone) { s += W.zone; reasons.push(ctx.dir === "bullish" ? "Demand Zone" : "Supply Zone"); }
  if (ctx.atr != null && ctx.liqPrices.some((p) => Math.abs(p - level) <= ctx.atr!)) { s += W.cluster; reasons.push("Liquidity Confluence"); }
  if (ctx.atr != null && Math.abs(level - ctx.cp) <= ctx.atr) { s += W.near; reasons.push("Near Current Price"); }
  if (ctx.highConf) { s += W.conf; reasons.push("High Confluence"); }
  if (ctx.trendMatch) { s += W.trend; reasons.push("Inside Market Map Trend"); }
  return s;
}

const inZoneOf = (level: number, zone: { bottom: number; top: number } | null | undefined) =>
  !!zone && isNum(zone.bottom) && isNum(zone.top) && level >= zone.bottom && level <= zone.top;

// ── P20.3 MARKET-STRUCTURE VALIDATION (gate sebelum sebuah level dipilih) ──────
// Tidak membuat level baru — hanya MENOLAK level yang tidak valid secara struktur.

// Entry tidak boleh berada di dalam Order Block yang sudah Invalidated.
function insideInvalidatedOB(level: number, ob: OrderBlockResult | null | undefined): boolean {
  return (ob?.blocks ?? []).some((b) => b.status === "Invalidated" && level >= b.priceLow && level <= b.priceHigh);
}

// Entry tidak boleh berada di dalam FVG yang sudah Filled.
function insideFilledFVG(level: number, fvg: FVGResult | null | undefined): boolean {
  return (fvg?.gaps ?? []).some((g) => g.status === "Filled" && level >= g.gapLow && level <= g.gapHigh);
}

// Entry tidak boleh "melewati" nearest liquidity (price akan menyentuh likuiditas dulu).
function beyondNearestLiquidity(level: number, dir: TradeDirection, cp: number, mm: MarketMap | null | undefined): boolean {
  const nl = mm?.nearestLiquidity;
  if (!nl || !isNum(nl.center)) return false;
  if (dir === "bullish") return nl.center < cp && Math.round(level) < Math.round(nl.center); // entry di bawah demand liquidity terdekat
  return nl.center > cp && Math.round(level) > Math.round(nl.center);                          // entry di atas supply liquidity terdekat
}

// Entry tidak boleh melawan tren Market Map (strict opposite).
function oppositeTrend(dir: TradeDirection, mm: MarketMap | null | undefined): boolean {
  if (!mm?.trend) return false;
  return (dir === "bullish" && mm.trend === "Bearish") || (dir === "bearish" && mm.trend === "Bullish");
}

// Gate validasi Entry (P20.5): tolak level yang (a) di dalam OB invalidated,
// (b) di dalam FVG filled, (c) melawan tren, (d) melewati nearest demand/supply liquidity.
function passesEntryValidation(level: number, dir: TradeDirection, input: TradePlanInput, cp: number): boolean {
  if (insideInvalidatedOB(level, input.orderBlocks)) return false;
  if (insideFilledFVG(level, input.fvg)) return false;
  if (oppositeTrend(dir, input.marketMap)) return false;
  if (beyondNearestLiquidity(level, dir, cp, input.marketMap)) return false;
  return true;
}

// ── ENTRY — SKOR semua kandidat (level = proximal; distal = sisi lebih dalam) ──
type EntryKind = "OB" | "FVG" | "Liquidity" | "Pivot" | "AI" | "Price";
interface EntryCand {
  level: number; distal: number; zoneLow: number; zoneHigh: number;
  source: string; kind: EntryKind; status?: string; score: number; reasons: string[];
}

// Bangun SEMUA kandidat entry struktural (dipakai dua skenario — engine dikonsumsi sekali).
function buildEntryCandidates(input: TradePlanInput, ctx: ScoreCtx): EntryCand[] {
  const cp = ctx.cp;
  const { orderBlocks: ob, fvg, liquidity: liq, pivots: p, marketMap: mm } = input;
  const cands: EntryCand[] = [];
  const valid = (lvl: number) => passesEntryValidation(lvl, ctx.dir, input, cp);

  const addOB = (b: OrderBlock, proximal: number, distal: number) => {
    if (!valid(proximal)) return;
    const prefix = b.status === "Fresh" ? "Fresh " : b.status === "Mitigated" ? "Untested " : "";
    const reasons: string[] = [`${prefix}${ctx.dir === "bullish" ? "Bullish Order Block" : "Bearish Order Block"}`];
    let s = 0;
    if (b.status === "Fresh") { s += W.fresh + W.untested; }
    else if (b.status === "Breaker") { s += 20; reasons.push("Breaker Block"); }
    else { s += 15; }
    reasons.push(ctx.dir === "bullish" ? "Selaras demand institusional" : "Selaras supply institusional");
    s += contextBonus(proximal, inZoneOf(proximal, ctx.dir === "bullish" ? mm?.majorDemand : mm?.majorSupply), ctx, reasons);
    s += Math.round((b.confidence ?? 0) / 10);
    cands.push({ level: proximal, distal, zoneLow: b.priceLow, zoneHigh: b.priceHigh, source: "Order Block", kind: "OB", status: b.status, score: s, reasons });
  };
  const addFVG = (g: FairValueGap, proximal: number, distal: number) => {
    if (!valid(proximal)) return;
    const reasons: string[] = [ctx.dir === "bullish" ? "Bullish Fair Value Gap" : "Bearish Fair Value Gap"];
    let s = g.status === "Fresh" ? W.fresh + W.untested : 18;
    reasons.push(g.status === "Fresh" ? "Unfilled" : "Partially Filled");
    s += contextBonus(proximal, inZoneOf(proximal, ctx.dir === "bullish" ? mm?.majorDemand : mm?.majorSupply), ctx, reasons);
    s += Math.round((g.priorityScore ?? 0) / 10);
    cands.push({ level: proximal, distal, zoneLow: g.gapLow, zoneHigh: g.gapHigh, source: "Fair Value Gap", kind: "FVG", status: g.status, score: s, reasons });
  };

  if (ctx.dir === "bullish") {
    for (const b of ob?.bullish ?? []) if (isActiveOB(b) && Math.round(b.priceLow) <= cp) addOB(b, b.priceHigh, b.priceLow);
    for (const g of fvg?.bullish ?? []) if (isActiveFVG(g) && Math.round(g.gapLow) <= cp) addFVG(g, g.gapHigh, g.gapLow);
    if (liq?.recentSweep && liq.recentSweep.side === "sell" && valid(liq.recentSweep.price)) {
      const reasons = ["Sell-side Liquidity Sweep Retest"]; let s = 25;
      s += contextBonus(liq.recentSweep.price, false, ctx, reasons);
      cands.push({ level: cp, distal: liq.recentSweep.price, zoneLow: liq.recentSweep.price, zoneHigh: cp, source: "Liquidity", kind: "Liquidity", score: s, reasons });
    }
    for (const [lvl, name] of [[p.S1, "S1"], [p.S2, "S2"], [p.S3, "S3"]] as [number, string][]) {
      if (!isNum(lvl) || Math.round(lvl) > cp || !valid(lvl)) continue;
      const reasons = [`Pivot Support ${name}`]; let s = 10;
      s += contextBonus(lvl, inZoneOf(lvl, mm?.majorDemand), ctx, reasons);
      const distal = name === "S1" ? p.S2 : name === "S2" ? p.S3 : lvl - Math.abs(p.PP - p.S1);
      cands.push({ level: lvl, distal, zoneLow: lvl, zoneHigh: cp, source: "Pivot", kind: "Pivot", score: s, reasons });
    }
  } else {
    for (const b of ob?.bearish ?? []) if (isActiveOB(b) && Math.round(b.priceHigh) >= cp) addOB(b, b.priceLow, b.priceHigh);
    for (const g of fvg?.bearish ?? []) if (isActiveFVG(g) && Math.round(g.gapHigh) >= cp) addFVG(g, g.gapLow, g.gapHigh);
    if (liq?.recentSweep && liq.recentSweep.side === "buy" && valid(liq.recentSweep.price)) {
      const reasons = ["Buy-side Liquidity Sweep Retest"]; let s = 25;
      s += contextBonus(liq.recentSweep.price, false, ctx, reasons);
      cands.push({ level: cp, distal: liq.recentSweep.price, zoneLow: cp, zoneHigh: liq.recentSweep.price, source: "Liquidity", kind: "Liquidity", score: s, reasons });
    }
    for (const [lvl, name] of [[p.R1, "R1"], [p.R2, "R2"], [p.R3, "R3"]] as [number, string][]) {
      if (!isNum(lvl) || Math.round(lvl) < cp || !valid(lvl)) continue;
      const reasons = [`Pivot Resistance ${name}`]; let s = 10;
      s += contextBonus(lvl, inZoneOf(lvl, mm?.majorSupply), ctx, reasons);
      const distal = name === "R1" ? p.R2 : name === "R2" ? p.R3 : lvl + Math.abs(p.R1 - p.PP);
      cands.push({ level: lvl, distal, zoneLow: cp, zoneHigh: lvl, source: "Pivot", kind: "Pivot", score: s, reasons });
    }
  }
  return cands;
}

// AGGRESSIVE — entry sedini mungkin: skor tertinggi (fresh-biased), edge proximal.
function pickAggressive(cands: EntryCand[], cp: number): EntryCand {
  const sorted = [...cands].sort((a, b) => b.score - a.score || Math.abs(a.level - cp) - Math.abs(b.level - cp));
  return sorted[0];
}

// Bonus "konfirmasi" untuk skenario konservatif (struktur yang sudah teruji).
function confirmScore(c: EntryCand): number {
  let s = c.score;
  if (c.kind === "OB" && c.status === "Mitigated") s += 30;       // Retested/Mitigated OB
  if (c.kind === "FVG" && c.status === "Partially Filled") s += 20; // FVG sudah bereaksi
  return s;
}
const consReasons = (source: string): string[] => [
  `Menunggu retest ${source}`,
  "Menunggu konfirmasi institusional",
  "Probabilitas lebih tinggi setelah pullback",
];

// CONSERVATIVE — tunggu konfirmasi: pilih struktur yang lebih dalam (pullback lebih jauh).
// KITA TIDAK LAGI MENGGUNAKAN `distal` SEBAGAI ENTRY. 
// Jika Conservative Entry == distal, maka ia akan sama dengan Aggressive SL (karena SL = distal).
function pickConservative(cands: EntryCand[], agg: EntryCand, cp: number, dir: TradeDirection): EntryCand {
  const deeper = (lvl: number) => (dir === "bullish" ? lvl < agg.level : lvl > agg.level);

  // Struktur terkonfirmasi yang lebih dalam (pullback lebih jauh).
  // RULE 3: Conservative Entry must NEVER equal Aggressive Stop Loss (agg.distal).
  const pool = cands.filter((c) => deeper(c.level) && Math.round(c.level) !== Math.round(agg.level) && Math.round(c.level) !== Math.round(agg.distal));
  if (pool.length) {
    pool.sort((a, b) => confirmScore(b) - confirmScore(a) || Math.abs(a.level - cp) - Math.abs(b.level - cp));
    const d = pool[0];
    return { ...d, reasons: consReasons(d.source) };
  }
  
  // Jika tidak ada struktur lebih dalam, fallback ke aggressive entry.
  return { ...agg, reasons: consReasons(agg.source) };
}

// Entry tunggal (aggressive) — kompatibilitas API lama.
function selectEntry(input: TradePlanInput, ctx: ScoreCtx): EntryCand {
  if (isNum(input.aiSelectedEntry) && input.aiSelectedEntry > 0) {
    const v = input.aiSelectedEntry;
    const distal = ctx.dir === "bullish" ? input.pivots!.S1 : input.pivots!.R1;
    return { level: v, distal, zoneLow: v, zoneHigh: v, source: "AI Validator", kind: "AI", score: input.confluence?.confidence ?? 0, reasons: ["Entry terpilih AI Validator"] };
  }
  const cands = buildEntryCandidates(input, ctx);
  if (!cands.length) return { level: ctx.cp, distal: ctx.cp, zoneLow: ctx.cp, zoneHigh: ctx.cp, source: "Current Price", kind: "Price", score: 5, reasons: ["Current Market Price"] };
  return pickAggressive(cands, ctx.cp);
}

// ── STOP LOSS — PRIORITAS struktur (P20.5), terdekat-dalam-tier ───────────────
// SL SELALU diambil dari struktur yang SAMA dengan Entry (distal edge), untuk
// menghindari SL berada di dalam struktur Entry (Bug Audit #5).
type StopCand = { level: number; source: string; reasons: string[]; tier: number };
function selectStop(dir: TradeDirection, entryCand: EntryCand): StopCand | null {
  const isBull = dir === "bullish";
  const slPrice = Math.round(entryCand.distal);

  if (!isNum(slPrice)) return null;

  return {
    level: slPrice,
    source: entryCand.source,
    reasons: [isBull ? `Below ${entryCand.source}` : `Above ${entryCand.source}`, "Invalidation struktur entry"],
    tier: 1
  };
}

// ── TARGETS — RANK by quality (probabilitas), pilih TP1/TP2/TP3 (bukan nearest-only) ─
interface TPCand { level: number; source: string; reasons: string[]; score: number; }

function selectTargets(input: TradePlanInput, ctx: ScoreCtx, entry: number, stop: number, strategy: ScenarioStyle): PlanTarget[] {
  const { orderBlocks: ob, fvg, liquidity: liq, marketMap: mm, pivots: p } = input;
  const dir = ctx.dir;
  const beyond = (lvl: number) => (dir === "bullish" ? Math.round(lvl) > entry : Math.round(lvl) < entry);
  const cands: TPCand[] = [];

  const liqSide = dir === "bullish" ? liq?.buySide : liq?.sellSide;
  for (const z of liqSide ?? []) if (beyond(z.price)) {
    const reasons = [dir === "bullish" ? "Buy Side Liquidity" : "Sell Side Liquidity"];
    let s = 30 + Math.round((z.confidence ?? 0) / 10);
    if (z.strength === "Major") { s += 10; reasons.push("Major Liquidity"); }
    if (ctx.trendMatch) s += 5;
    cands.push({ level: z.price, source: "Liquidity", reasons, score: s });
  }
  if (mm?.nearestLiquidity && isNum(mm.nearestLiquidity.center) && beyond(mm.nearestLiquidity.center)) {
    const reasons = ["Nearest Liquidity"]; let s = 28 + Math.round((mm.nearestLiquidity.confidence ?? 0) / 10);
    if (mm.nearestLiquidity.strength === "Major") { s += 8; reasons.push("Major Zone"); }
    cands.push({ level: mm.nearestLiquidity.center, source: "Liquidity", reasons, score: s });
  }
  const oppOB = dir === "bullish" ? ob?.bearish : ob?.bullish;
  for (const b of oppOB ?? []) if (isActiveOB(b)) {
    const lvl = dir === "bullish" ? b.priceLow : b.priceHigh;
    if (!beyond(lvl)) continue;
    const reasons = [dir === "bullish" ? "Opposite Bearish Order Block" : "Opposite Bullish Order Block"];
    let s = 25 + Math.round((b.confidence ?? 0) / 10);
    if (b.status === "Fresh") { s += 10; reasons.push("Fresh Block"); }
    cands.push({ level: lvl, source: "Order Block", reasons, score: s });
  }
  const oppFVG = dir === "bullish" ? fvg?.bearish : fvg?.bullish;
  for (const g of oppFVG ?? []) if (isActiveFVG(g)) {
    const lvl = dir === "bullish" ? g.gapLow : g.gapHigh;
    if (!beyond(lvl)) continue;
    cands.push({ level: lvl, source: "Fair Value Gap", reasons: ["Unfilled Fair Value Gap"], score: 20 + Math.round((g.priorityScore ?? 0) / 10) });
  }
  const pv: [number, string][] = dir === "bullish" ? [[p.R1, "R1"], [p.R2, "R2"], [p.R3, "R3"]] : [[p.S1, "S1"], [p.S2, "S2"], [p.S3, "S3"]];
  for (const [lvl, name] of pv) if (isNum(lvl) && beyond(lvl)) {
    const reasons = [dir === "bullish" ? `Resistance ${name}` : `Support ${name}`]; let s = 10;
    if (ctx.highConf) s += 5;
    cands.push({ level: lvl, source: "Pivot", reasons, score: s });
  }

  // P20.3 — TOLAK target yang berada SEBELUM likuiditas yang lebih kuat:
  // bila ada kandidat Liquidity dgn skor tertinggi, buang kandidat lemah yang
  // lebih dekat ke entry daripada likuiditas itu (price akan lari ke likuiditas).
  const strongestLiq = cands.filter((c) => c.source === "Liquidity").sort((a, b) => b.score - a.score)[0];
  let pool = cands;
  if (strongestLiq) {
    const liqDist = Math.abs(strongestLiq.level - entry);
    pool = cands.filter((c) => c.source === "Liquidity" || c.score >= strongestLiq.score || Math.abs(c.level - entry) >= liqDist);
  }

  // P20.7 — POLICY pemilihan (target deterministik yang SAMA, urutan pilih beda):
  //  aggressive → utamakan kualitas TERDEKAT; conservative → kualitas TERKUAT.
  if (strategy === "aggressive") pool.sort((a, b) => Math.abs(a.level - entry) - Math.abs(b.level - entry) || b.score - a.score);
  else pool.sort((a, b) => b.score - a.score || Math.abs(a.level - entry) - Math.abs(b.level - entry));
  const best: TPCand[] = [];
  for (const c of pool) {
    if (best.length >= 3) break;
    if (best.some((q) => Math.round(q.level) === Math.round(c.level))) continue;
    best.push(c);
  }

  // P20.3 — LADDER MONOTONIK: TP1<TP2<TP3 (bullish) / TP1>TP2>TP3 (bearish).
  // Urut menurut jarak dari entry, lalu buang yang melanggar monotonisitas/duplikat.
  best.sort((a, b) => (dir === "bullish" ? a.level - b.level : b.level - a.level));
  const risk = Math.abs(entry - stop);
  const out: PlanTarget[] = [];
  for (const t of best) {
    const price = Math.round(t.level);
    // Validasi target: bukan di belakang entry, bukan duplikat, monotonik ketat.
    if (dir === "bullish" ? price <= entry : price >= entry) continue;              // behind/at entry
    const prev = out[out.length - 1];
    if (prev && (dir === "bullish" ? price <= prev.price : price >= prev.price)) continue; // non-monotonic/dup
    const rr = risk > 0 ? Math.round((Math.abs(price - entry) / risk) * 100) / 100 : 0;     // RR matematis murni
    if (!(rr > 0)) continue;                                                        // RR harus > 0
    out.push({ price, reasons: t.reasons, source: t.source, score: t.score, rr, badge: badgeOf(rr), quality: qualityOf(t.score) });
  }
  return out;
}

// ── P20.4 EXECUTION DECISION — klasifikasi state deterministik (no prediksi) ──
interface DecisionCtx {
  valid: boolean; dir: TradeDirection; highConf: boolean; trendMatch: boolean;
  confidence: number; cp: number; atr: number | null;
  entry: PlanLevel; stopLoss: PlanLevel | null; targets: PlanTarget[];
}

function classifyDecision(d: DecisionCtx): TradeDecision {
  const tp1 = d.targets[0];
  const rr1 = tp1?.rr ?? 0;
  const uniq = (xs: string[]) => Array.from(new Set(xs)).slice(0, 4);

  // ── SKIP — tidak ada setup yang bisa dieksekusi ──
  if (!d.valid || !d.stopLoss || d.targets.length === 0 || rr1 <= 1) {
    const r: string[] = [];
    if (!d.stopLoss) r.push("• Tidak ada proteksi SL valid");
    if (d.targets.length === 0) r.push("• Tidak ada Target valid");
    if (rr1 > 0 && rr1 <= 1) r.push(`• RR ${rr1.toFixed(1)} di bawah minimum`);
    if (d.confidence < 50) r.push("• Confluence lemah");
    if (!d.valid && !r.length) r.push("• Struktur tidak valid");
    if (!r.length) r.push("• Setup tidak memenuhi syarat");
    return { state: "SKIP", reasons: uniq(r) };
  }

  // ── READY — confluence tinggi, trend selaras, entry+SL valid, TP1 ada, RR>1 ──
  if (d.highConf && d.trendMatch && rr1 > 1) {
    const r: string[] = [`✔ ${d.entry.reasons[0]}`]; // reasons[0] sudah memuat struktur (mis. "Fresh Bullish Order Block")
    if (d.entry.reasons.includes("Liquidity Confluence") || tp1.source === "Liquidity") r.push("✔ Liquidity Confluence");
    r.push("✔ Strong Market Trend");
    r.push(`✔ RR ${rr1.toFixed(1)}`);
    return { state: "READY", reasons: uniq(r) };
  }

  // ── WAIT — plan valid namun belum semua syarat READY terpenuhi ──
  const r: string[] = [];
  if (d.confidence >= 50 && d.confidence < 65) r.push("• Confluence medium — menunggu konfirmasi");
  if (!d.trendMatch) r.push("• Trend belum selaras");
  if (d.atr != null && Math.abs(d.cp - d.entry.price) > d.atr * 2) r.push("• Harga jauh dari Entry");
  if (d.entry.reasons.some((x) => /Mitigated/i.test(x))) r.push("• Menunggu mitigasi Order Block");
  if (d.entry.source === "Pivot") r.push("• Menunggu retest level kunci");
  if (!r.length) r.push("• Struktur masih terbentuk");
  return { state: "WAIT", reasons: uniq(r) };
}

// ── PIPELINE TUNGGAL — assemblePlan(strategy) ─────────────────────────────────
// SATU pipa dipakai kedua skenario: hanya POLICY seleksi (entry/SL/TP) yang beda;
// SL, TP, decision memakai engine output yang sama. Tanpa logika ganda.
function assemblePlan(input: TradePlanInput, ctx: ScoreCtx, e: EntryCand, strategy: ScenarioStyle): TradePlanView {
  const dir = ctx.dir;
  const entry: PlanLevel = { price: Math.round(e.level), reasons: e.reasons, source: e.source, score: Math.round(e.score) };
  const entryZone = { low: Math.round(Math.min(e.zoneLow, e.zoneHigh)), high: Math.round(Math.max(e.zoneLow, e.zoneHigh)) };

  const stopRaw = selectStop(dir, e);
  let stopLoss: PlanLevel | null = stopRaw ? { price: Math.round(stopRaw.level), reasons: stopRaw.reasons, source: stopRaw.source } : null;
  // SL VALIDATION: harus melindungi entry (below bullish / above bearish). Bila gagal → tolak.
  if (stopLoss) {
    const protects = dir === "bullish" ? stopLoss.price < entry.price : stopLoss.price > entry.price;
    if (!protects) stopLoss = null;
  }

  const targets = stopLoss ? selectTargets(input, ctx, entry.price, stopLoss.price, strategy) : [];
  const confidence = Math.round(ctx.baseConf);
  const valid = !!stopLoss && targets.length > 0 && entry.price !== stopLoss.price;

  const decision = classifyDecision({
    valid, dir, highConf: ctx.highConf, trendMatch: ctx.trendMatch, confidence,
    cp: ctx.cp, atr: ctx.atr, entry, stopLoss, targets,
  });

  return {
    valid,
    direction: dir,
    entry,
    entryZone,
    stopLoss: stopLoss ?? { price: entry.price, reasons: ["Stop tidak tersedia"], source: "—" },
    targets,
    confidence,
    confidenceLabel: confidenceLabelOf(confidence),
    decision,
  };
}

// ── P22.1 RECOMMENDATION LAYER ────────────────────────────────────────────────
// Membandingkan DUA plan deterministik yang sudah jadi. HANYA metadata yang
// sudah ada (confidence, trend, entry.score, status struktur, sumber SL/TP, RR,
// decision). Tidak ada level baru, tidak ada estimasi probabilitas.

// Skor strategi 0–100 dari metadata deterministik yang sudah ada.
function strategyScore(p: TradePlanView, trendMatch: boolean): number {
  if (!p.valid) return 0;
  const rr1 = p.targets[0]?.rr ?? 0;
  let s = 0;
  s += Math.min(25, Math.round(p.confidence * 0.25));                       // Confluence (sudah dihitung)
  if (trendMatch) s += 12;                                                   // Trend alignment (Market Map)
  s += Math.min(20, Math.round((p.entry.score ?? 0) / 6));                   // Entry quality (skor prioritas P20.2)
  if (/Fresh/.test(p.entry.reasons[0] ?? "")) s += 10;                       // Order Block status
  else if (/Menunggu retest|Untested/.test(p.entry.reasons[0] ?? "")) s += 6; // konfirmasi retest
  if (p.targets[0]?.source === "Liquidity") s += 8;                          // Liquidity quality (target)
  if (p.stopLoss.source === "Order Block" || p.stopLoss.source === "Market Map") s += 6; // proteksi struktural
  else if (p.stopLoss.source === "Liquidity") s += 5;
  s += Math.min(15, Math.round(rr1 * 5));                                    // RR (matematis, sudah ada)
  s += p.decision.state === "READY" ? 10 : p.decision.state === "WAIT" ? 4 : 0; // Decision
  return Math.max(0, Math.min(100, s));
}

// "Why this strategy" — alasan komparatif yang merujuk struktur terpilih saja.
function whyPreferred(win: ScenarioPlan, lose: ScenarioPlan): string[] {
  const r: string[] = [];
  const rrW = win.targets[0]?.rr ?? 0, rrL = lose.targets[0]?.rr ?? 0;
  if (/Fresh/.test(win.entry.reasons[0] ?? "")) r.push("✔ Fresh Order Block — struktur probabilitas tinggi");
  else if (/Menunggu retest/.test(win.entry.reasons[0] ?? "")) r.push("✔ Konfirmasi retest — eksekusi berprobabilitas tinggi");
  if (rrW > rrL) r.push(`✔ Risk Reward lebih baik (${rrW.toFixed(1)} vs ${rrL.toFixed(1)})`);
  if (win.stopLoss.source === "Order Block" || win.stopLoss.source === "Market Map") r.push(`✔ Proteksi struktural lebih kuat (${win.stopLoss.source})`);
  else if (win.stopLoss.source === "Liquidity") r.push("✔ Proteksi likuiditas di bawah swing");
  if (win.targets[0]?.source === "Liquidity") r.push("✔ Target likuiditas institusional");
  if (win.decision.state === "READY" && lose.decision.state !== "READY") r.push("✔ Satu-satunya setup READY");
  if (!r.length) r.push(`✔ Skor strategi lebih tinggi (${win.strategyScore} vs ${lose.strategyScore})`);
  if (r.length < 2) r.push("✔ Selaras struktur institusional saat ini");
  return Array.from(new Set(r)).slice(0, 4);
}

// Execution timing — deskripsi struktur terpilih (BUKAN prediksi harga).
function timingHintOf(p: TradePlanView, style: ScenarioStyle): string {
  const src = p.entry.source;
  if (style === "aggressive") {
    if (src === "Order Block") return "Layak dieksekusi saat harga mendekati Order Block.";
    if (src === "Fair Value Gap") return "Layak dieksekusi saat harga mengisi Fair Value Gap.";
    if (src === "Liquidity") return "Layak dieksekusi pada retest area liquidity sweep.";
    if (src === "Pivot") return "Layak dieksekusi saat harga menguji level pivot.";
    return "Eksekusi mengikuti level analisa saat ini.";
  }
  if (src === "Order Block") return "Tunggu retest penuh Order Block sebelum eksekusi.";
  if (src === "Fair Value Gap") return "Tunggu reaksi konfirmasi pada Fair Value Gap.";
  if (src === "Liquidity") return "Tunggu liquidity sweep terkonfirmasi sebelum eksekusi.";
  if (src === "Pivot") return "Tunggu konfirmasi retest pivot sebelum eksekusi.";
  return "Tunggu konfirmasi struktur sebelum eksekusi.";
}

// ── P22.2 LONG-ONLY GUIDANCE (struktur bearish → panduan tunggu, BUKAN short) ─
// Semua level berasal dari struktur yang SUDAH ada; tidak ada kalkulasi baru.
function buildLongOnlyGuidance(input: TradePlanInput, ctx: ScoreCtx): LongOnlyGuidance {
  const { orderBlocks: ob, marketMap: mm, liquidity: liq, pivots: p, confluence: c } = input;
  const cp = ctx.cp;
  const r0 = (n: number) => Math.round(n);

  // Kenapa tidak ada setup BUY — kondisi deterministik saat ini.
  const reasons: string[] = ["• Struktur pasar Bearish — mode LONG-ONLY (IDX) tidak membuka posisi short"];
  if (c && isNum(c.bearProbability) && isNum(c.bullProbability)) reasons.push(`• Bear probability ${Math.round(c.bearProbability)}% > Bull ${Math.round(c.bullProbability)}%`);
  if (mm?.phase) reasons.push(`• Fase Market Map: ${mm.phase}`);
  if (isNum(p.PP) && cp < p.PP) reasons.push("• Harga di bawah Pivot Point (PP)");

  // Zona pantau — support terdekat di bawah harga dari struktur yang ada.
  const obBelow = (ob?.bullish ?? []).filter((b) => isActiveOB(b) && b.priceHigh < cp).sort((a, b) => b.priceHigh - a.priceHigh)[0];
  const sellLiq = (liq?.sellSide ?? []).filter((z) => z.price < cp).sort((a, b) => b.price - a.price)[0];
  const watchZone =
    obBelow ? { low: r0(obBelow.priceLow), high: r0(obBelow.priceHigh), source: "Bullish Order Block" }
    : mm?.majorDemand && isNum(mm.majorDemand.bottom) && isNum(mm.majorDemand.top) && mm.majorDemand.top < cp ? { low: r0(mm.majorDemand.bottom), high: r0(mm.majorDemand.top), source: "Demand Zone" }
    : sellLiq ? { low: r0(sellLiq.price), high: r0(sellLiq.price), source: "Sell-side Liquidity" }
    : isNum(p.S1) && isNum(p.S2) && p.S1 < cp ? { low: r0(p.S2), high: r0(p.S1), source: "Pivot Support S2–S1" }
    : null;

  // Zona akumulasi — Demand Zone institusional / Fresh Bullish OB bila ada.
  const freshOB = (ob?.bullish ?? []).filter((b) => b.status === "Fresh" && b.priceHigh < cp).sort((a, b) => b.priceHigh - a.priceHigh)[0];
  const accumulationZone =
    mm?.majorDemand && isNum(mm.majorDemand.bottom) && isNum(mm.majorDemand.top) ? { low: r0(mm.majorDemand.bottom), high: r0(mm.majorDemand.top), source: "Demand Zone" }
    : freshOB ? { low: r0(freshOB.priceLow), high: r0(freshOB.priceHigh), source: "Fresh Bullish Order Block" }
    : null;

  // Pemicu BUY — kondisi pada struktur yang ada (bukan prediksi harga).
  const buyTriggers: string[] = [];
  if (isNum(p.PP)) buyTriggers.push(`Close kembali di atas Pivot Point ${r0(p.PP)}`);
  if (mm?.trend === "Bearish") buyTriggers.push("Market Map trend berbalik Bullish");
  if (sellLiq) buyTriggers.push("Sweep sell-side liquidity terkonfirmasi (close kembali di atasnya)");
  if (obBelow || freshOB) buyTriggers.push("Reaksi bullish pada Order Block demand");
  if (!buyTriggers.length) buyTriggers.push("Tunggu struktur bullish terbentuk (BoS/ChoCh)");

  return { reasons: reasons.slice(0, 4), watchZone, accumulationZone, buyTriggers: buyTriggers.slice(0, 4) };
}

// Plan placeholder long-only (valid=false → kartu Entry/SL/TP disembunyikan UI).
function longOnlyPlan(ctx: ScoreCtx, state: DecisionState, reasons: string[]): TradePlanView {
  const cp = Math.round(ctx.cp);
  return {
    valid: false,
    direction: "bearish",
    entry: { price: cp, reasons: ["Long-only: tidak ada setup BUY"], source: "—" },
    entryZone: { low: cp, high: cp },
    stopLoss: { price: cp, reasons: ["Long-only: tidak ada setup BUY"], source: "—" },
    targets: [],
    confidence: Math.round(ctx.baseConf),
    confidenceLabel: confidenceLabelOf(Math.round(ctx.baseConf)),
    decision: { state, reasons },
  };
}

// ── Public API — FORMAT saja ─────────────────────────────────────────────────
// Trade Plan tunggal (aggressive) — kompatibilitas API lama.
export function formatTradePlan(input: TradePlanInput | null | undefined): TradePlanView | null {
  if (!input || !isNum(input.currentPrice) || input.currentPrice <= 0) return null;
  if (!input.pivots || !isNum(input.pivots.PP)) return null;
  const ctx = buildCtx(input);
  // P22.2 — LONG-ONLY: struktur bearish TIDAK menghasilkan plan short.
  if (ctx.dir === "bearish") {
    const g = buildLongOnlyGuidance(input, ctx);
    return longOnlyPlan(ctx, g.watchZone || g.accumulationZone ? "WAIT" : "SKIP", g.reasons);
  }
  return assemblePlan(input, ctx, selectEntry(input, ctx), "aggressive");
}

// Dual Trade Plan (Aggressive & Conservative) — engine dikonsumsi SEKALI.
export function formatDualTradePlan(input: TradePlanInput | null | undefined): DualTradePlan | null {
  if (!input || !isNum(input.currentPrice) || input.currentPrice <= 0) return null;
  if (!input.pivots || !isNum(input.pivots.PP)) return null;

  const ctx = buildCtx(input);

  // P22.2 — LONG-ONLY MODE (IDX): struktur bearish → JANGAN buat plan SHORT.
  // Mode WAIT/SKIP + panduan (watch zone, akumulasi, buy trigger); kartu disembunyikan.
  if (ctx.dir === "bearish") {
    const g = buildLongOnlyGuidance(input, ctx);
    const state: DecisionState = g.watchZone || g.accumulationZone ? "WAIT" : "SKIP";
    const base = longOnlyPlan(ctx, state, g.reasons);
    const mk = (style: ScenarioStyle): ScenarioPlan => ({
      ...base, style, badge: style === "aggressive" ? "HIGH RISK" : "HIGH PROBABILITY",
      strategyScore: 0, why: [], timingHint: "Long-only: tunggu struktur bullish sebelum entry BUY.",
    });
    return {
      direction: ctx.dir, mode: state, confidence: base.confidence,
      aggressive: mk("aggressive"), conservative: mk("conservative"),
      recommended: "conservative", tie: true, longOnly: g,
    };
  }

  const cands = buildEntryCandidates(input, ctx);
  const cp = ctx.cp;

  // Entry agresif: override AI Validator bila ada; jika tidak, kandidat skor tertinggi.
  const aiOK = input.aiSelectedEntry && isNum(input.aiSelectedEntry);
  const aggCand: EntryCand = aiOK
    ? (() => {
        const reasons = ["Disetujui oleh Institutional AI Validator"];
        const distal = ctx.dir === "bullish" ? input.pivots!.S1 : input.pivots!.R1;
        return { level: input.aiSelectedEntry!, distal, zoneLow: input.aiSelectedEntry!, zoneHigh: input.aiSelectedEntry!, source: "AI Validator", kind: "AI", score: 100, reasons };
      })()
    : cands.length ? pickAggressive(cands, cp)
    : { level: cp, distal: cp, zoneLow: cp, zoneHigh: cp, source: "Current Price", kind: "Price", score: 5, reasons: ["Current Market Price"] };

  // Entry konservatif: konfirmasi/retest lebih dalam dari struktur yang sama.
  const consCand: EntryCand = cands.length ? pickConservative(cands, aggCand, cp, ctx.dir) : aggCand;

  // P22.1 — susun plan, lalu lapisan rekomendasi (skor dari metadata yang sudah ada).
  const aggBase = assemblePlan(input, ctx, aggCand, "aggressive");
  const consBase = assemblePlan(input, ctx, consCand, "conservative");

  const aggressive: ScenarioPlan = {
    ...aggBase, style: "aggressive", badge: "HIGH RISK",
    strategyScore: strategyScore(aggBase, ctx.trendMatch),
    why: [], timingHint: timingHintOf(aggBase, "aggressive"),
  };
  const conservative: ScenarioPlan = {
    ...consBase, style: "conservative", badge: "HIGH PROBABILITY",
    strategyScore: strategyScore(consBase, ctx.trendMatch),
    why: [], timingHint: timingHintOf(consBase, "conservative"),
  };

  // Skor tertinggi → ⭐ Recommended; skor sama → kedua strategi sama-sama valid.
  const tie = aggressive.strategyScore === conservative.strategyScore;
  const recommended: ScenarioStyle = aggressive.strategyScore > conservative.strategyScore ? "aggressive" : "conservative";
  const winner = recommended === "aggressive" ? aggressive : conservative;
  const loser = recommended === "aggressive" ? conservative : aggressive;
  winner.why = tie ? ["✔ Kedua strategi sama-sama valid — pilih sesuai profil risiko"] : whyPreferred(winner, loser);

  return {
    direction: ctx.dir,
    mode: "BUY",              // P22.2 — struktur bullish → Trade Plan BUY
    confidence: aggressive.confidence,
    aggressive,
    conservative,
    recommended,
    tie,
    longOnly: null,
  };
}
