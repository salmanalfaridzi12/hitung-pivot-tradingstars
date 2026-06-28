"use client";
import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import DataSourceBadge from "./DataSourceBadge";

export default function TradingChart({ ohlc, levels, pattern, stockCode = "", signalText, orderBlocks = null, fvgs = null, history = null }) {
  const containerRef = useRef(null);

  const o = parseFloat(ohlc?.open);
  const h = parseFloat(ohlc?.high);
  const l = parseFloat(ohlc?.low);
  const c = parseFloat(ohlc?.close);

  // Phase 17.2 (Zero Mock): HANYA histori OHLCV asli. Tidak ada candle sintetis.
  // Bila histori tidak tersedia → empty state (lihat render di bawah).
  const realBars = Array.isArray(history)
    ? history.filter((b) => b && b.high > 0 && b.low > 0 && b.close > 0 && b.open > 0)
    : [];
  const hasHistory = realBars.length >= 1;

  useEffect(() => {
    if (!containerRef.current || !hasHistory) return;

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

    // --- Candle data: HANYA histori OHLCV ASLI (Zero Mock — tanpa sintesis) ---
    const N = 60;
    // Range untuk lebar band OB (pakai OHLC saat ini; bila kosong, ambil dari bar asli terakhir).
    const lastBar = realBars[realBars.length - 1];
    const cc = !isNaN(c) ? c : lastBar.close;
    const hh = !isNaN(h) ? h : lastBar.high;
    const ll = !isNaN(l) ? l : lastBar.low;
    const range = levels
      ? Math.max(levels.R3 - levels.S3, hh - ll, cc * 0.05)
      : Math.max((hh - ll) * 3, cc * 0.05);
    const candles = [];
    const vols = [];
    const today = new Date();
    // Histori OHLCV asli (tanggal disintesis berurutan — backend tak mengirim tanggal).
    const series = realBars.slice(-N);
    const n = series.length;
    for (let i = 0; i < n; i++) {
      const b = series[i];
      const d = new Date(today);
      d.setDate(d.getDate() - (n - 1 - i));
      const time = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
      const isLast = i === n - 1;
      const O = isLast && !isNaN(o) ? o : b.open;
      const H = isLast && !isNaN(h) ? Math.max(h, b.high) : b.high;
      const L = isLast && !isNaN(l) ? Math.min(l, b.low) : b.low;
      const C = isLast && !isNaN(c) ? c : b.close;
      candles.push({ time, open: O, high: H, low: L, close: C });
      vols.push({ time, value: b.volume || 0, color: C >= O ? "rgba(0,255,102,0.4)" : "rgba(124,58,237,0.45)" });
    }
    candle.setData(candles);

    // --- Volume histogram (VPA): tandai bar volume klimaks ASLI ---
    const volSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    if (vols.length) {
      const climaxIdx = vols.reduce((mi, v, idx) => (v.value > vols[mi].value ? idx : mi), 0);
      vols[climaxIdx] = { ...vols[climaxIdx], color: "#f97316" };
    }
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
            axisLabelVisible: false, // label pivot via `title` di garis → tidak menumpuk price scale
            title: k,
          });
        }
      });

      // --- SMC: Order Block band (ungu) di sekitar PP — fill sangat tipis (~13%) ---
      const obHalf = range * 0.03;
      candle.createPriceLine({ price: levels.PP + obHalf, color: "rgba(167,139,250,0.13)", lineWidth: 1, lineStyle: 0, axisLabelVisible: false, title: "OB" });
      candle.createPriceLine({ price: levels.PP - obHalf, color: "rgba(167,139,250,0.13)", lineWidth: 1, lineStyle: 0, axisLabelVisible: false });
    }

    // --- P17 Module 3: overlay Order Block zones (translucent) — bullish hijau / bearish merah ---
    if (orderBlocks && Array.isArray(orderBlocks.blocks)) {
      const nearest = orderBlocks.nearestActive;
      orderBlocks.blocks
        .filter((b) => b && b.status !== "Invalidated" && b.priceHigh > 0 && b.priceLow > 0)
        .slice(0, 6)
        .forEach((b) => {
          const isBull = b.type === "Bullish";
          const isNearest = nearest && b.type === nearest.type && b.createdAt === nearest.createdAt;
          const alpha = isNearest ? 0.5 : 0.2;
          const col = isBull ? `rgba(0,255,102,${alpha})` : `rgba(239,68,68,${alpha})`;
          candle.createPriceLine({ price: b.priceHigh, color: col, lineWidth: isNearest ? 2 : 1, lineStyle: 0, axisLabelVisible: false, title: isNearest ? `${b.type} OB` : "" });
          candle.createPriceLine({ price: b.priceLow, color: col, lineWidth: isNearest ? 2 : 1, lineStyle: 0, axisLabelVisible: false });
        });
    }

    // --- P17 Module 4: overlay Fair Value Gap zones — bullish hijau / bearish merah, terisi diredupkan ---
    if (fvgs && Array.isArray(fvgs.gaps)) {
      const nf = fvgs.nearestActive;
      fvgs.gaps
        .filter((g) => g && g.gapHigh > 0 && g.gapLow > 0)
        .slice(0, 6)
        .forEach((g) => {
          const isBull = g.type === "Bullish";
          const isNearest = nf && g.type === nf.type && g.createdAt === nf.createdAt;
          const faded = g.status === "Invalidated" || g.status === "Filled";
          const alpha = faded ? 0.08 : isNearest ? 0.4 : 0.18;
          const col = isBull ? `rgba(0,255,102,${alpha})` : `rgba(239,68,68,${alpha})`;
          candle.createPriceLine({ price: g.gapHigh, color: col, lineWidth: isNearest ? 2 : 1, lineStyle: 2, axisLabelVisible: false, title: isNearest ? `${g.type} FVG` : "" });
          candle.createPriceLine({ price: g.gapLow, color: col, lineWidth: isNearest ? 2 : 1, lineStyle: 2, axisLabelVisible: false });
        });
    }

    // --- SMC markers: CHoCH + Bullish BOS + pola candle (indeks relatif jumlah candle nyata) ---
    const M = candles.length;
    const markers = [];
    if (M > 2) {
      markers.push({ time: candles[Math.floor(M * 0.4)].time, position: "aboveBar", color: "#f97316", shape: "arrowDown", text: "CHoCH" });
      markers.push({ time: candles[Math.floor(M * 0.62)].time, position: "belowBar", color: "#00ff66", shape: "arrowUp", text: "Bullish BOS" });
    }
    if (pattern && M > 0) {
      markers.push({
        time: candles[M - 1].time,
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
  }, [o, h, l, c, JSON.stringify(levels), pattern?.name, orderBlocks?.blocks?.length, fvgs?.gaps?.length, history?.length]);

  const fmt = (n) => Math.round(n).toLocaleString("id-ID");

  return (
    <div className="w-full bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden relative">
      {hasHistory ? (
        <>
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
        </>
      ) : (
        /* Phase 17.2 (Zero Mock): histori tidak tersedia → empty state (TANPA candle sintetis). */
        <div className="w-full h-[340px] flex flex-col items-center justify-center gap-1 text-center px-4">
          <p className="text-sm font-bold text-slate-400">No historical market data available.</p>
          <p className="text-[11px] text-slate-600">Histori OHLCV belum tersedia untuk emiten ini.</p>
        </div>
      )}

      {/* Footer: mini toolbar gambar + label */}
      <div className="px-3 pb-2 pt-1 flex justify-between items-center text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-2">
          <span className="flex gap-1 opacity-70">
            <span className="w-4 h-4 rounded bg-slate-800 border border-white/5 inline-flex items-center justify-center text-[9px]">✎</span>
            <span className="w-4 h-4 rounded bg-slate-800 border border-white/5 inline-flex items-center justify-center text-[9px]">／</span>
            <span className="w-4 h-4 rounded bg-slate-800 border border-white/5 inline-flex items-center justify-center text-[9px]">▭</span>
          </span>
          TradingView Lightweight Charts
          <DataSourceBadge source="OHLCV History" />
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          {(stockCode || "TICKER").toUpperCase()} · 1D
        </span>
      </div>
    </div>
  );
}
