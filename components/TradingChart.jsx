"use client";
import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

export default function TradingChart({ ohlc, levels, pattern }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const o = parseFloat(ohlc.open);
    const h = parseFloat(ohlc.high);
    const l = parseFloat(ohlc.low);
    const c = parseFloat(ohlc.close);
    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) return;

    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.05)" },
        horzLines: { color: "rgba(148, 163, 184, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        visible: false, // Simple view for today's analysis
      },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
    });

    // Mock recent price action to make it look like a chart
    const data = [];
    const basePrice = o;
    const daySeconds = 86400;
    const now = Math.floor(Date.now() / 1000);

    // Generate 20 candles of random noise ending in our current OHLC
    for (let i = 20; i > 0; i--) {
      const time = now - (i * 300); // 5 min intervals
      const prevClose = i === 20 ? basePrice : data[data.length - 1].close;
      const noise = (Math.random() - 0.5) * (basePrice * 0.01);
      
      data.push({
        time,
        open: prevClose,
        high: prevClose + Math.abs(noise) * 1.5,
        low: prevClose - Math.abs(noise) * 1.5,
        close: prevClose + noise,
      });
    }

    // Replace last candle with actual OHLC
    data[data.length - 1] = {
      time: now,
      open: o,
      high: h,
      low: l,
      close: c,
    };

    candlestickSeries.setData(data);

    // Add Markers for pattern
    if (pattern) {
      candlestickSeries.setMarkers([
        {
          time: now,
          position: pattern.type === "bullish" ? "belowBar" : "aboveBar",
          color: pattern.type === "bullish" ? "#22C55E" : "#F97316",
          shape: pattern.type === "bullish" ? "arrowUp" : "arrowDown",
          text: pattern.name,
        },
      ]);
    }

    // Add Horizontal Price Lines for Levels
    if (levels) {
      const colors = {
        PP: "#8B5CF6", // Primary Purple
        R1: "#F97316", // Warning Orange
        R2: "#F97316",
        R3: "#F97316",
        S1: "#22C55E", // Success Green
        S2: "#22C55E",
        S3: "#22C55E",
      };

      Object.entries(levels).forEach(([k, v]) => {
        if (typeof v === "number" && v > 0) {
          candlestickSeries.createPriceLine({
            price: v,
            color: colors[k] || "#64748b",
            lineWidth: 1,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: k,
          });
        }
      });
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [ohlc, levels, pattern]);

  return (
    <div className="w-full bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden p-2">
      <div ref={chartContainerRef} className="w-full h-[300px]" />
      <div className="px-4 pb-2 flex justify-between items-center text-[10px] text-slate-500 font-medium">
        <span>TradingView Lightweight Chart</span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Live Analysis
        </span>
      </div>
    </div>
  );
}
