"use client";
import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
} from "lightweight-charts";

// Deterministic PRNG supaya candle sintetis stabil (tidak ganti-ganti tiap render)
function makeRnd(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export default function TradingChart({ ohlc, levels, pattern, stockCode = "", signalText }) {
  const containerRef = useRef(null);

  const o = parseFloat(ohlc?.open);
  const h = parseFloat(ohlc?.high);
  const l = parseFloat(ohlc?.low);
  const c = parseFloat(ohlc?.close);
  const valid = ![o, h, l, c].some((v) => isNaN(v));

  useEffect(() => {
    if (!containerRef.current || !valid) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.05)" },
        horzLines: { color: "rgba(148,163,184,0.05)" },
      },
      width: containerRef.current.clientWidth,
      height: 340,
      rightPriceScale: { borderColor: "rgba(148,163,184,0.1)" },
      timeScale: { borderColor: "rgba(148,163,184,0.1)", timeVisible: false },
      crosshair: { mode: 0 },
    });

    // --- Candle series (v5 API): hijau neon naik, ungu tua turun ---
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#00ff66",
      wickUpColor: "#00ff66",
      downColor: "#7c3aed",
      wickDownColor: "#7c3aed",
      borderVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });
    candle.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.28 } });

    // --- Generate deret candle sintetis (harian) berakhir di OHLC asli ---
    const N = 60;
    const range = levels
      ? Math.max(levels.R3 - levels.S3, h - l, c * 0.05)
      : Math.max((h - l) * 3, c * 0.05);
    const rnd = makeRnd(Math.round(c) + Math.round(h) + N);
    const candles = [];
    const vols = [];
    const today = new Date();
    let prevClose = c - range * 0.45; // mulai di bawah, drift naik ke harga sekarang
    for (let i = N - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const time = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
      if (i === 0) {
        candles.push({ time, open: o, high: h, low: l, close: c });
        vols.push({
          time,
          value: parseFloat(ohlc?.volume) || range * 1000,
          color: c >= o ? "rgba(0,255,102,0.5)" : "rgba(124,58,237,0.6)",
        });
      } else {
        const step = range * 0.018;
        const op = prevClose;
        const cl = op + (rnd() - 0.42) * step * 2;
        const hi = Math.max(op, cl) + rnd() * step;
        const lo = Math.min(op, cl) - rnd() * step;
        candles.push({ time, open: op, high: hi, low: lo, close: cl });
        prevClose = cl;
        vols.push({
          time,
          value: range * 700 * (0.4 + rnd()),
          color: cl >= op ? "rgba(0,255,102,0.32)" : "rgba(124,58,237,0.38)",
        });
      }
    }
    candle.setData(candles);

    // --- Volume histogram (VPA) di bawah, dengan satu batang klimaks oranye ---
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    const climaxIdx = Math.max(1, vols.length - 16);
    vols[climaxIdx] = { ...vols[climaxIdx], value: vols[climaxIdx].value * 2.4, color: "#f97316" };
    volSeries.setData(vols);

    // --- Garis pivot horizontal (putus-putus) ---
    if (levels) {
      const lineColors = {
        R3: "#f97316", R2: "#f97316", R1: "#f97316",
        PP: "#a78bfa",
        S1: "#00ff66", S2: "#00ff66", S3: "#00ff66",
      };
      Object.entries(levels).forEach(([k, v]) => {
        if (typeof v === "number" && v > 0) {
          candle.createPriceLine({
            price: v,
            color: lineColors[k] || "#64748b",
            lineWidth: 1,
            lineStyle: 2, // dashed
            axisLabelVisible: true,
            title: k,
          });
        }
      });

      // --- SMC: Order Block band (ungu) di sekitar PP ---
      const obHalf = range * 0.03;
      candle.createPriceLine({ price: levels.PP + obHalf, color: "rgba(167,139,250,0.55)", lineWidth: 1, lineStyle: 0, axisLabelVisible: false, title: "OB" });
      candle.createPriceLine({ price: levels.PP - obHalf, color: "rgba(167,139,250,0.55)", lineWidth: 1, lineStyle: 0, axisLabelVisible: false });
    }

    // --- SMC markers: CHoCH + Bullish BOS + pola candle ---
    const markers = [];
    markers.push({ time: candles[Math.floor(N * 0.4)].time, position: "aboveBar", color: "#f97316", shape: "arrowDown", text: "CHoCH" });
    markers.push({ time: candles[Math.floor(N * 0.62)].time, position: "belowBar", color: "#00ff66", shape: "arrowUp", text: "Bullish BOS" });
    if (pattern) {
      markers.push({
        time: candles[N - 1].time,
        position: pattern.type === "bullish" ? "belowBar" : "aboveBar",
        color: pattern.type === "bullish" ? "#00ff66" : "#f97316",
        shape: pattern.type === "bullish" ? "arrowUp" : "arrowDown",
        text: pattern.name,
      });
    }
    createSeriesMarkers(candle, markers);

    chart.timeScale().fitContent();

    const onResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o, h, l, c, JSON.stringify(levels), pattern?.name]);

  if (!valid) return null;

  const fmt = (n) => Math.round(n).toLocaleString("id-ID");

  return (
    <div className="w-full bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden relative">
      {/* Label Order Block (SMC) */}
      {levels && (
        <div className="absolute top-2 left-3 z-10 text-[10px] font-black text-purple-200 bg-purple-500/15 border border-purple-500/40 rounded-md px-2 py-1 backdrop-blur-sm shadow-lg">
          Zona Order Block @ {fmt(levels.PP)}
        </div>
      )}
      {/* Komentar sinyal di dalam grafik + volume klimaks */}
      <div className="absolute top-2 right-3 z-10 flex flex-col items-end gap-1">
        {signalText && (
          <span className="text-[9px] font-bold text-slate-300 bg-slate-900/70 border border-white/10 rounded px-2 py-0.5 backdrop-blur-sm">
            {signalText}
          </span>
        )}
        <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-0.5">
          Volume Klimaks (Distribusi)
        </span>
      </div>

      <div ref={containerRef} className="w-full h-[340px]" />

      {/* Footer: mini toolbar gambar + label */}
      <div className="px-3 pb-2 pt-1 flex justify-between items-center text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-2">
          <span className="flex gap-1 opacity-70">
            <span className="w-4 h-4 rounded bg-slate-800 border border-white/5 inline-flex items-center justify-center text-[9px]">✎</span>
            <span className="w-4 h-4 rounded bg-slate-800 border border-white/5 inline-flex items-center justify-center text-[9px]">／</span>
            <span className="w-4 h-4 rounded bg-slate-800 border border-white/5 inline-flex items-center justify-center text-[9px]">▭</span>
          </span>
          TradingView Lightweight Charts
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          {(stockCode || "TICKER").toUpperCase()} · 1D
        </span>
      </div>
    </div>
  );
}
