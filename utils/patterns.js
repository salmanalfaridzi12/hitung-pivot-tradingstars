/**
 * Logic for detecting common candlestick patterns.
 * Technical terminology used: Confluence, Rejection, Accumulation, False Breakout.
 */

export function identifyPattern(ohlc) {
  const { open: o, high: h, low: l, close: c } = ohlc;
  const open = parseFloat(o);
  const high = parseFloat(h);
  const low = parseFloat(l);
  const close = parseFloat(c);

  if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) return null;

  const bodySize = Math.abs(close - open);
  const upperShadow = high - Math.max(open, close);
  const lowerShadow = Math.min(open, close) - low;
  const range = high - low;

  if (range === 0) return null;

  // Doji: Very small body relative to range
  if (bodySize <= range * 0.1) {
    return { name: "Doji", type: "neutral", description: "Market Indecision / Potential Reversal" };
  }

  // Hammer: Small body, long lower wick (2x body), little/no upper wick
  if (close > open && lowerShadow >= 2 * bodySize && upperShadow <= bodySize * 0.5) {
    return { name: "Hammer", type: "bullish", description: "Bullish Reversal / Buying Pressure" };
  }

  // Shooting Star: Small body, long upper wick (2x body), little/no lower wick
  if (open > close && upperShadow >= 2 * bodySize && lowerShadow <= bodySize * 0.5) {
    return { name: "Shooting Star", type: "bearish", description: "Bearish Rejection / Selling Pressure" };
  }

  // Bullish Engulfing (requires previous candle, but we approximate for single candle as strong close)
  if (close > open && (close - open) / range > 0.7) {
    return { name: "Bullish Marubozu", type: "bullish", description: "Strong Bullish Momentum" };
  }

  return null;
}

export function getConfluenceLabel(pattern, nearestLevel) {
  if (!pattern || !nearestLevel) return null;

  if (pattern.type === "bullish" && (nearestLevel.label === "S1" || nearestLevel.label === "S2")) {
    return { text: "Strong Bullish Reversal", color: "#22C55E" };
  }

  if (pattern.type === "bearish" && (nearestLevel.label === "R1" || nearestLevel.label === "R2")) {
    return { text: "Strong Bearish Rejection", color: "#EF4444" };
  }

  return null;
}
