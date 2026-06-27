// Smart Market Map — engine deterministik (LAYER 1-2). Mengubah pivot/harga jadi
// "dynamic liquidity zones" + fase pasar, sebagai anchor matematis. AI validation
// (LAYER 3) menyusul di tahap berikutnya untuk menyetel confidence/reason.

export type ZoneType = "Demand Zone" | "Supply Zone";
export type ZoneStrength = "Major" | "Minor" | "Weak";
export type MarketPhase = "Accumulation" | "Markup" | "Distribution" | "Markdown" | "Consolidation";
export type Trend = "Bullish" | "Bearish" | "Sideways";
export type Position = "Premium" | "Discount" | "Equilibrium";

export interface LiquidityZone {
  top: number;
  bottom: number;
  center: number;
  type: ZoneType;
  strength: ZoneStrength;
  confidence: number; // 0-100
  reason: string;
}

export interface MarketMap {
  trend: Trend;
  position: Position;
  phase: MarketPhase;
  phaseReason: string;
  majorDemand: LiquidityZone | null;
  majorSupply: LiquidityZone | null;
  nearestLiquidity: LiquidityZone | null;
  heatmap: LiquidityZone[]; // diurut dari harga tertinggi → terendah
  range: { hi: number; lo: number };
}

export interface MarketMapInput {
  pivots: { PP: number; R1: number; R2: number; R3: number; S1: number; S2: number; S3: number };
  currentPrice: number;
  ma20?: number | null;
  volume?: number | null;
  ma20Volume?: number | null;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const strengthOf = (c: number): ZoneStrength => (c >= 75 ? "Major" : c >= 50 ? "Minor" : "Weak");

export function buildMarketMap(input: MarketMapInput): MarketMap | null {
  const p = input?.pivots;
  const cp = Number(input?.currentPrice);
  if (!p || !Number.isFinite(cp) || cp <= 0 || !Number.isFinite(p.PP)) return null;

  const ma20 = Number(input.ma20);
  const vol = Number(input.volume);
  const volMa = Number(input.ma20Volume);
  const volStrong = Number.isFinite(vol) && Number.isFinite(volMa) && vol > volMa;
  const span = Math.max(p.R3 - p.S3, cp * 0.04, 1);

  // Confidence: makin dekat zona ke harga + konfirmasi volume → makin tinggi.
  const conf = (center: number, base: number) => {
    const prox = 1 - Math.min(1, Math.abs(center - cp) / span); // 0..1
    return Math.round(clamp(base + prox * 28 + (volStrong ? 8 : 0)));
  };
  const mk = (bottom: number, top: number, type: ZoneType, base: number, reason: string): LiquidityZone => {
    const center = (bottom + top) / 2;
    const confidence = conf(center, base);
    return { top, bottom, center, type, strength: strengthOf(confidence), confidence, reason };
  };

  // Zona demand (support) di bawah & supply (resistance) di atas — anchor ke pivot.
  const zones: LiquidityZone[] = [
    mk(p.R2, p.R3, "Supply Zone", 48, "Resistance jauh (R2-R3) — supply sekunder."),
    mk(p.R1, p.R2, "Supply Zone", 62, "Order block supply di R1-R2; area distribusi potensial."),
    mk(p.S2, p.S1, "Demand Zone", 62, "Order block demand di S1-S2; area akumulasi potensial."),
    mk(p.S3, p.S2, "Demand Zone", 48, "Demand jauh (S2-S3) — likuiditas sekunder."),
  ];
  if (volStrong) zones.forEach((z) => (z.reason += " Volume di atas MA20 (konfirmasi)."));

  const demand = zones.filter((z) => z.type === "Demand Zone").sort((a, b) => b.confidence - a.confidence);
  const supply = zones.filter((z) => z.type === "Supply Zone").sort((a, b) => b.confidence - a.confidence);
  const majorDemand = demand[0] ?? null;
  const majorSupply = supply[0] ?? null;
  const nearestLiquidity = [...zones].sort((a, b) => Math.abs(a.center - cp) - Math.abs(b.center - cp))[0] ?? null;

  // Posisi premium/discount relatif PP.
  const position: Position = cp > p.PP * 1.001 ? "Premium" : cp < p.PP * 0.999 ? "Discount" : "Equilibrium";
  // Tren dari harga vs MA20 & PP.
  const aboveMa = Number.isFinite(ma20) ? cp > ma20 : cp > p.PP;
  const trend: Trend = cp > p.PP && aboveMa ? "Bullish" : cp < p.PP && !aboveMa ? "Bearish" : "Sideways";

  // Fase pasar (Wyckoff-ish, deterministik).
  let phase: MarketPhase;
  let phaseReason: string;
  if (cp >= p.R1) { phase = "Distribution"; phaseReason = "Harga menguji area supply (≥ R1) — waspada distribusi."; }
  else if (cp <= p.S1) { phase = "Accumulation"; phaseReason = "Harga di area demand (≤ S1) — potensi akumulasi."; }
  else if (cp > p.PP && aboveMa) { phase = "Markup"; phaseReason = "Harga di atas PP & MA20 — fase markup (tren naik)."; }
  else if (cp < p.PP && !aboveMa) { phase = "Markdown"; phaseReason = "Harga di bawah PP & MA20 — fase markdown (tren turun)."; }
  else { phase = "Consolidation"; phaseReason = "Harga berkisar di sekitar PP — konsolidasi."; }

  return {
    trend, position, phase, phaseReason,
    majorDemand, majorSupply, nearestLiquidity,
    heatmap: [...zones].sort((a, b) => b.center - a.center),
    range: { hi: p.R3, lo: p.S3 },
  };
}
