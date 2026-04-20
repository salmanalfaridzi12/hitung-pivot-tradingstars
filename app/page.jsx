"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Target, Shield, AlertCircle,
  Share2, Save, Bell, LineChart, Table, History, Image as ImageIcon,
  ChevronRight, ArrowRight, Activity, Zap, Info, Search, Trash2, Calendar,
  Loader2, CheckCircle2, XCircle, WifiOff
} from "lucide-react";
import { toPng } from "html-to-image";
import dynamic from "next/dynamic";
import { identifyPattern, getConfluenceLabel } from "../utils/patterns";
const RiskRewardVisualizer = dynamic(() => import("../components/RiskRewardVisualizer"), { ssr: false });
const BrokerSummary = dynamic(() => import("../components/BrokerSummary"), { ssr: false });
const TradingChart = dynamic(() => import("../components/TradingChart"), { ssr: false });
import StoryExportCard from "../components/StoryExportCard";

// ─── Helper Utilities ────────────────────────────────────────────────────────
const fmt = (n) => (n != null ? n.toLocaleString("id-ID") : "—");
const fmtDec = (n) =>
  n != null
    ? n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "—";

// ─── Input Field Component ───────────────────────────────────────────────────
function InputField({ label, value, onChange, type = "number", color = "", placeholder = "", labelClass = "text-slate-500", borderClass = "border-white/10", ringClass = "focus:ring-purple-500" }) {
  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase ml-2 flex items-center gap-1 ${labelClass}`}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-slate-950/50 border ${borderClass} rounded-2xl px-4 py-3 text-sm font-black placeholder:text-slate-700 focus:outline-none focus:ring-1 ${ringClass} transition-all ${color}`}
      />
    </div>
  );
}

// ─── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Component Error Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-xl border border-white/5 space-y-3">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase animate-pulse">Sedang menyiapkan grafik...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PivotAnalyzer() {
  // ── State: OHLC Inputs
  const [stockCode, setStockCode] = useState("");
  const [high, setHigh] = useState("");
  const [low, setLow] = useState("");
  const [close, setClose] = useState("");
  const [open, setOpen] = useState("");
  const [volume, setVolume] = useState("");
  const [ma20Volume, setMa20Volume] = useState("");
  const [ma20Price, setMa20Price] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  // ── State: Timeframe
  const [timeframe, setTimeframe] = useState("DAILY");

  // ── State: Auto-Fill
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState(null); // null | { type: 'success'|'error', msg: string }

  // ── State: Application
  const [tab, setTab] = useState("main");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [pattern, setPattern] = useState(null);
  const [confluence, setConfluence] = useState(null);
  const [isClient, setIsClient] = useState(false);

  // ── Refs
  const analysisCardRef = useRef(null);

  // ── Load persisted data
  useEffect(() => {
    setIsClient(true);
    try {
      if (typeof window !== 'undefined') {
        const savedHistory = JSON.parse(localStorage.getItem("pivot_history") || "[]");
        const savedWatchlist = JSON.parse(localStorage.getItem("pivot_watchlist") || "[]");
        setHistory(savedHistory);
        setWatchlist(savedWatchlist);
        if ("Notification" in window) Notification.requestPermission();
      }
    } catch (e) {
      console.error("DEBUG: Failed to parse localStorage", e);
    }
  }, []);

  // ── Debounced Auto-Fill: fires 800ms after user stops typing a valid code
  useEffect(() => {
    const code = stockCode.trim();
    // Only trigger if 2–6 chars (typical IDX stock codes are 4 chars)
    if (code.length < 2 || code.length > 6) return;
    const timer = setTimeout(() => {
      handleAutoFill();
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCode]);

  // ─── Derived: Trend Context (Current Price vs MA20 Price) ─────────────────
  const trendContext = useMemo(() => {
    if (!result) return null;
    const cp = parseFloat(currentPrice) || parseFloat(close);
    if (isNaN(cp) || cp <= 0) return null;
    const ma = parseFloat(ma20Price);
    // If MA20 Price provided → compare against it; else fall back to PP
    const isBullish = !isNaN(ma) && ma > 0 ? cp > ma : cp > result.PP;
    return {
      isBullish,
      label: `${stockCode || "Stock"} – ${isBullish ? "Bullish Trend" : "Bearish Trend"}`,
    };
  }, [result, currentPrice, close, ma20Price, stockCode]);

  // ─── Derived: RRR Calculation (robust) ───────────────────────────────────
  const calcRRR = useMemo(() => {
    if (!result) return null;
    const cp = parseFloat(currentPrice) || parseFloat(close);
    if (isNaN(cp) || cp <= 0) return null;
    const risk = cp - result.S1;   // downside to S1
    const reward = result.R1 - cp; // upside to R1
    if (risk <= 0 || reward <= 0) return null; // guard: must be positive
    return (reward / risk).toFixed(2);
  }, [result, currentPrice, close]);

  // ─── Pivot Calculation ────────────────────────────────────────────────────
  const calculatePivot = (h, l, c) => {
    console.log(`DEBUG: Calculating pivot for H:${h}, L:${l}, C:${c}`);
    const p = (h + l + c) / 3;
    return {
      PP: Math.round(p),
      R1: Math.round(2 * p - l),
      S1: Math.round(2 * p - h),
      R2: Math.round(p + (h - l)),
      S2: Math.round(p - (h - l)),
      R3: Math.round(h + 2 * (p - l)),
      S3: Math.round(l - 2 * (h - p)),
    };
  };

  const handleCalculate = () => {
    console.log('DEBUG: Calculation started');
    let h = parseFloat(high);
    let l = parseFloat(low);
    const c = parseFloat(close);
    let o = parseFloat(open);

    if (isNaN(h) || isNaN(l) || isNaN(c)) {
      alert("⚠️ DATA TIDAK VALID: Pastikan input High, Low, dan Close terisi angka.");
      return;
    }

    if (h < l) {
      alert("⚠️ DATA TIDAK MASUK AKAL: High tidak boleh lebih kecil dari Low. Proses dibatalkan.");
      return;
    }

    if (isNaN(o) || o === 0) o = c; // Fallback safe open price

    setLoading(true);
    setTimeout(() => {
      try {
        const levels = calculatePivot(h, l, c);

        // Sanity check: Ensure calculation produced valid numbers
        if (!levels || Object.values(levels).some(val => isNaN(val))) {
          throw new Error("Kalkulasi Pivot menghasilkan NaN. Pastikan input angka valid.");
        }

        console.log('DEBUG: Levels calculated safely', levels);
        setResult(levels);

        const detectedPattern = identifyPattern({ open: o, high: h, low: l, close: c });
        setPattern(detectedPattern);

        const cp = parseFloat(currentPrice) || c;
        const nearestLvl = Object.entries(levels).reduce((prev, curr) =>
          Math.abs(curr[1] - cp) < Math.abs(prev[1] - cp) ? curr : prev,
          ["PP", levels.PP]
        );
        const conf = getConfluenceLabel(detectedPattern, { label: nearestLvl[0], value: nearestLvl[1] });
        setConfluence(conf);

        if (cp <= levels.S1 && "Notification" in window && Notification.permission === "granted") {
          new Notification("TradingStars Alert", {
            body: `Area Buy Terdeteksi di [${stockCode || "Saham"}] — Harga menyentuh S1 (${fmt(levels.S1)})`,
            icon: "/logo-ts.png",
          });
        }

        const entry = {
          id: Date.now(),
          stockCode,
          levels,
          date: new Date().toLocaleDateString("id-ID"),
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          ohlc: { h, l, c, o },
        };
        const newHistory = [entry, ...history].slice(0, 20);
        setHistory(newHistory);
        
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem("pivot_history", JSON.stringify(newHistory));
          }
        } catch (storageErr) {
          console.error("DEBUG: Failed to save to localStorage", storageErr);
        }

      } catch (err) {
        console.error("Calculate Error:", err);
        setResult(null);
        alert(err.message || "Telah terjadi error struktural saat melakukan kalkulasi.");
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const handleClear = () => {
    setHigh(""); setLow(""); setClose(""); setOpen("");
    setVolume(""); setMa20Volume(""); setMa20Price(""); setCurrentPrice("");
    setResult(null); setPattern(null); setConfluence(null);
    setFetchStatus(null);
  };

  // ─── Auto-Fill: Fetch OHLCV + MA20 from Yahoo Finance via API route ────────
  const handleAutoFill = useCallback(async () => {
    const code = stockCode.trim().toUpperCase();
    if (!code) return;

    setFetchLoading(true);
    setFetchStatus(null);

    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) {
        setFetchStatus({ type: "error", msg: data.error || "Fetch gagal." });
        return;
      }

      // ── Populate all fields automatically (from original Python API) ──
      if (data.open   != null) setOpen(String(data.open));
      if (data.high   != null) setHigh(String(data.high));
      if (data.low    != null) setLow(String(data.low));
      if (data.close  != null) setClose(String(data.close));
      if (data.volume != null) setVolume(String(data.volume));
      if (data.ma20_volume != null) setMa20Volume(String(data.ma20_volume));
      if (data.ma20_price != null && data.ma20_price > 0) setMa20Price(String(data.ma20_price));
      if (data.close != null) setCurrentPrice(String(data.close));

      setFetchStatus({
        type: "success",
        msg: `Data ${code} berhasil diisi${data.tradingDate ? " (" + data.tradingDate + ")" : ""}.`,
      });
    } catch (err) {
      setFetchStatus({ type: "error", msg: "Koneksi bermasalah. Coba lagi." });
    } finally {
      setFetchLoading(false);
    }
  }, [stockCode]);

  const addToWatchlist = () => {
    if (!result) return;
    const entry = { id: Date.now(), stockCode: stockCode || "IDX", levels: result, date: new Date().toLocaleDateString("id-ID") };
    const newWatchlist = [entry, ...watchlist];
    setWatchlist(newWatchlist);
    try {
      localStorage.setItem("pivot_watchlist", JSON.stringify(newWatchlist));
    } catch (e) {
      console.error("DEBUG: Failed to save to watchlist", e);
    }
    alert("Saved to Watchlist!");
  };

  const captureImage = async () => {
    if (analysisCardRef.current) {
      const dataUrl = await toPng(analysisCardRef.current);
      const link = document.createElement("a");
      link.download = `tradingstars-${stockCode || "analysis"}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  // ─── Pivot Ladder Row Config ──────────────────────────────────────────────
  const pivotRows = result
    ? [
        { l: "R3", v: result.R3, c: "text-orange-500", b: "bg-orange-500/5", bar: "bg-orange-500/30" },
        { l: "R2", v: result.R2, c: "text-orange-500", b: "bg-orange-500/5", bar: "bg-orange-500/30", supplyZoneAfter: true },
        { l: "R1", v: result.R1, c: "text-orange-400", b: "bg-red-500/5",    bar: "bg-orange-400/30" },
        { l: "PP", v: result.PP, c: "text-purple-500", b: "bg-purple-500/10",bar: "bg-purple-500/40" },
        { l: "S1", v: result.S1, c: "text-green-400",  b: "bg-green-500/5",  bar: "bg-green-400/30", demandZoneAfter: true },
        { l: "S2", v: result.S2, c: "text-green-500",  b: "bg-green-500/5",  bar: "bg-green-500/30" },
        { l: "S3", v: result.S3, c: "text-green-500",  b: "bg-green-500/5",  bar: "bg-green-500/30" },
      ]
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#09090b] text-white p-4 pb-24 font-sans selection:bg-purple-500/30">

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header className="max-w-xl mx-auto flex items-center justify-between mb-3 pt-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-[2px] shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#09090b] rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black text-purple-400">TS</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase text-slate-100">
              Pivot Analyzer <span className="text-purple-500 italic">PRO</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">
              <Activity className="w-3 h-3" /> Advanced Momentum Tech
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={captureImage}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Sedia Laporan Teks"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={addToWatchlist}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Save"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ══ TIMEFRAME SELECTOR ════════════════════════════════════════════════ */}
      <div className="max-w-xl mx-auto mb-5 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
        <div className="flex bg-slate-900/70 p-1 rounded-2xl border border-purple-500/10 backdrop-blur-md gap-1">
          {["DAILY", "WEEKLY", "MONTHLY"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 ${
                timeframe === tf
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-lg shadow-amber-500/30"
                  : "text-slate-500 hover:text-amber-400 hover:bg-slate-800/60"
              }`}
            >
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">

        {/* ── Navigation Tabs ─────────────────────────────────────────────── */}
        <nav className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
          {[
            { id: "main",      label: "Analysis", icon: Zap     },
            { id: "watchlist", label: "Watchlist", icon: Shield  },
            { id: "history",   label: "History",   icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                tab === t.id
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* ══ MAIN ANALYSIS TAB ════════════════════════════════════════════ */}
        {tab === "main" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">

            {/* ── DATA OHLC Input Panel ────────────────────────────────── */}
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" /> DATA OHLC
                </h2>
                <button
                  onClick={handleClear}
                  className="text-[10px] font-bold text-red-400/70 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Stock Code + Auto-Fill */}
                <div className="col-span-2 space-y-2">
                  <div className="relative">
                    <input
                      id="input-stock-code"
                      type="text"
                      value={stockCode}
                      onChange={(e) => {
                        setStockCode(e.target.value.toUpperCase());
                        setFetchStatus(null);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAutoFill(); }}
                      onBlur={() => { if (stockCode.trim().length >= 2) handleAutoFill(); }}
                      placeholder="Ketik kode saham, data terisi otomatis..."
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm font-black tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all uppercase"
                    />
                    {/* Clickable Search / Loading Button */}
                    <button
                      onClick={handleAutoFill}
                      disabled={fetchLoading || !stockCode.trim()}
                      title="Auto-Fill OHLC dari IDX"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-lg shadow-purple-500/20"
                    >
                      {fetchLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Search className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Fetch Status Toast */}
                  {fetchStatus && (
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
                      fetchStatus.type === "success"
                        ? "bg-green-500/12 border border-green-500/30 text-green-400"
                        : "bg-red-500/12 border border-red-500/30 text-red-400"
                    }`}>
                      {fetchStatus.type === "success"
                        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {fetchStatus.msg}
                    </div>
                  )}
                </div>

                {/* Open */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Open</label>
                  <input type="number" value={open} onChange={(e) => setOpen(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all" />
                </div>

                {/* High */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">High</label>
                  <input type="number" value={high} onChange={(e) => setHigh(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-black text-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all" />
                </div>

                {/* Low */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Low</label>
                  <input type="number" value={low} onChange={(e) => setLow(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-black text-green-400 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all" />
                </div>

                {/* Close */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Close</label>
                  <input type="number" value={close} onChange={(e) => setClose(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-black text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all" />
                </div>

                {/* Current Price */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Harga Saat Ini</label>
                  <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-black text-amber-400 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all" />
                </div>

                {/* Volume */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Volume</label>
                  <input type="number" value={volume} onChange={(e) => setVolume(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all" />
                </div>

                {/* MA20 Volume */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400/80 uppercase ml-2">MA20 Volume</label>
                  <input type="number" value={ma20Volume} onChange={(e) => setMa20Volume(e.target.value)}
                    className="w-full bg-slate-950/50 border border-indigo-500/20 rounded-2xl px-4 py-3 text-sm font-black text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>

                {/* ★ MA20 Price — NEW FIELD ★ */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-amber-500/90 uppercase ml-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                    MA20 Price
                  </label>
                  <input
                    type="number"
                    value={ma20Price}
                    onChange={(e) => setMa20Price(e.target.value)}
                    placeholder="MA20 Harga"
                    className="w-full bg-slate-950/50 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm font-black text-amber-400 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/60 transition-all"
                  />
                </div>

                {/* Hitung Pivot Point Button */}
                <div className="col-span-2 pt-2">
                  <button
                    onClick={handleCalculate}
                    disabled={loading}
                    id="btn-hitung-pivot"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-purple-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:shadow-purple-500/30"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menghitung Pivot...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Hitung Pivot Point <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── ANALYSIS RESULTS ────────────────────────────────────────────────────────── */}
            {result && isClient && (
              <div ref={analysisCardRef} className="space-y-5 animate-in slide-in-from-bottom-10 fade-in duration-1000">

                {/* ══ TREND CONTEXT + RRR SUMMARY ROW ═══════════════════ */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Trend Context Card */}
                  <div className={`rounded-2xl border p-4 flex flex-col gap-2.5 transition-all ${
                    trendContext?.isBullish
                      ? "bg-green-500/8 border-green-500/25 shadow-[0_0_20px_rgba(34,197,94,0.06)]"
                      : "bg-red-500/8 border-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  }`}>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trend Context</p>
                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        trendContext?.isBullish ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {trendContext?.isBullish
                          ? <TrendingUp className="w-4 h-4" />
                          : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <p className={`text-[11px] font-black leading-tight ${
                        trendContext?.isBullish ? "text-green-400" : "text-red-400"
                      }`}>
                        {trendContext?.label ?? `${stockCode || "Stock"} – N/A`}
                      </p>
                    </div>
                    {ma20Price && (
                      <p className="text-[9px] text-slate-300 font-medium">
                        MA20 Price: <span className="text-amber-400">{fmt(parseFloat(ma20Price))}</span>
                      </p>
                    )}
                  </div>

                  {/* Trading Plan / RRR Card */}
                  <div
                    className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 p-4 flex flex-col gap-2.5"
                    style={{ boxShadow: "0 0 20px rgba(234,179,8,0.08)" }}
                  >
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trading Plan</p>
                    {calcRRR ? (
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">RRR Setup</p>
                        <p
                          className="text-xl font-black text-yellow-400 leading-tight"
                          style={{ textShadow: "0 0 24px rgba(234,179,8,0.55)" }}
                        >
                          1 : {calcRRR}
                        </p>
                        <p className="text-[9px] text-slate-300 font-medium mt-1">
                          {parseFloat(calcRRR) >= 2
                            ? "✅ Setup Favorit"
                            : parseFloat(calcRRR) >= 1
                            ? "⚡ Setup Layak"
                            : "⚠️ Risk Tinggi"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-medium italic leading-snug">
                        Isi Harga Saat Ini untuk kalkulasi RRR
                      </p>
                    )}
                  </div>
                </div>

                {/* Visual Context (charts & broker) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <ErrorBoundary>
                      {/* <RiskRewardVisualizer entry={currentPrice || close} stopLoss={result.S1} target={result.R1} /> */}
                    </ErrorBoundary>
                    <ErrorBoundary>
                      {/* <BrokerSummary stockCode={stockCode} currentPrice={currentPrice || close} /> */}
                    </ErrorBoundary>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-slate-800/20 p-5 rounded-2xl border border-white/10">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Arah Trend</p>
                        {confluence && (
                          <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-[9px] font-black text-green-400 uppercase animate-pulse">
                            {confluence.text}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${parseFloat(currentPrice || close) > result.PP ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {parseFloat(currentPrice || close) > result.PP ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="text-lg font-black">{parseFloat(currentPrice || close) > result.PP ? "UPTREND" : "DOWNTREND"}</p>
                          <p className="text-[10px] text-slate-300 font-medium uppercase">
                            Price {parseFloat(currentPrice || close) > result.PP ? "above" : "below"} Pivot Point
                          </p>
                        </div>
                      </div>
                      {pattern && (
                        <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-white/5 flex items-start gap-3">
                          <Info className="w-4 h-4 text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-purple-400">{pattern.name} Detected</p>
                            <p className="text-[10px] text-slate-300 font-medium">{pattern.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <ErrorBoundary>
                      <TradingChart ohlc={{ open, high, low, close }} levels={result} pattern={pattern} />
                    </ErrorBoundary>
                  </div>
                </div>

                {/* ══ PIVOT LADDER with Demand / Supply Zones ════════════ */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
                  {/* Ladder Header */}
                  <div className="bg-slate-900/60 px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                      <Table className="w-4 h-4 text-purple-500" /> Pivot Ladder
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[9px] font-black text-slate-300 uppercase">Supply</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-[9px] font-black text-slate-300 uppercase">Demand</span>
                      </div>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-white/5">
                    {pivotRows.map((row) => (
                      <React.Fragment key={row.l}>
                        {/* ── Normal Pivot Row ── */}
                        <div className={`flex items-center justify-between px-4 py-3.5 group hover:bg-white/5 transition-all ${row.b}`}>
                          <div className="flex items-center gap-3">
                            {/* Label badge */}
                            <span className={`w-8 text-[10px] font-black p-1 rounded text-center border border-current/20 flex-shrink-0 ${row.c}`}>
                              {row.l}
                            </span>
                            {/* Mini progress bar — hidden on very small screens */}
                            <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden xs:block sm:block">
                              <div
                                className={`h-full rounded-full ${row.bar} transition-all duration-700`}
                                style={{
                                  width: `${Math.min(100, Math.max(8,
                                    ((row.v - result.S3) / Math.max(result.R3 - result.S3, 1)) * 100
                                  ))}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                              {row.l === "PP"
                                ? "Pivot Equilibrium"
                                : row.l.startsWith("R")
                                ? "Resistance"
                                : "Support Foundation"}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black transition-all group-hover:scale-110 ${row.c}`}>{fmt(row.v)}</p>
                            <p className="text-[9px] text-slate-400 font-medium uppercase">Price Point</p>
                          </div>
                        </div>

                        {/* ── Supply Area Zone Banner (after R2, before R1) ── */}
                        {row.supplyZoneAfter && (
                          <div className="relative bg-red-500/10 border-l-4 border-red-500/40 px-5 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">▲ Supply Area</span>
                            </div>
                            <span className="text-[9px] text-red-400/60 font-medium italic">R1 — R2 Zone</span>
                          </div>
                        )}

                        {/* ── Demand Area Zone Banner (after S1, before S2) ── */}
                        {row.demandZoneAfter && (
                          <div className="relative bg-green-500/10 border-l-4 border-green-500/40 px-5 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">▼ Demand Area</span>
                            </div>
                            <span className="text-[9px] text-green-400/60 font-medium italic">S1 — S2 Zone</span>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* ── BANDAR POWER DETECTOR / Strategic Insights ─────── */}
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-3xl border border-purple-500/20">
                  <h3 className="text-sm font-black text-purple-400 uppercase mb-5 tracking-tighter flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Bandar Power Detector
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Volatility Range</p>
                      <p className="text-lg font-black text-slate-100">{fmt(result.R3 - result.S3)} <span className="text-xs font-bold text-slate-400">pts</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Safety Margin (S1)</p>
                      <p className="text-lg font-black text-green-400">{((result.PP - result.S1) / result.PP * 100).toFixed(2)}%</p>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Rejection Potential</p>
                      <p className="text-lg font-black text-orange-400">{((result.R1 - result.PP) / result.PP * 100).toFixed(2)}%</p>
                    </div>
                    {volume && ma20Volume && (
                      <div className="col-span-2 sm:col-span-3 pt-2 border-t border-white/5">
                        <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest mb-1">Volume Momentum</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${parseFloat(volume) > parseFloat(ma20Volume) ? "bg-green-400" : "bg-red-400"}`}
                              style={{ width: `${Math.min(100, (parseFloat(volume) / parseFloat(ma20Volume)) * 50)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-black ${parseFloat(volume) > parseFloat(ma20Volume) ? "text-green-400" : "text-red-400"}`}>
                            {parseFloat(volume) > parseFloat(ma20Volume) ? "Above Avg" : "Below Avg"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ HISTORY TAB ══════════════════════════════════════════════════ */}
        {tab === "history" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-700 space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No Recent Activity</p>
              </div>
            ) : (
              history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setHigh(h.ohlc.h); setLow(h.ohlc.l); setClose(h.ohlc.c); setOpen(h.ohlc.o || "");
                    setStockCode(h.stockCode); setResult(h.levels); setTab("main");
                  }}
                  className="w-full bg-slate-900/50 p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-purple-500 font-black tracking-tight group-hover:bg-purple-500 group-hover:text-white transition-all">
                      {h.stockCode?.slice(0, 4) || "PX"}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-100 uppercase tracking-widest">{h.stockCode || "Unknown"}</h4>
                      <p className="text-[10px] text-slate-300 font-medium uppercase">{h.date} at {h.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-purple-400 italic">PP: {fmt(h.levels.PP)}</p>
                    <p className="text-[10px] text-slate-300 font-medium uppercase flex items-center justify-end gap-1">
                      Recall <ChevronRight className="w-3 h-3" />
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ══ WATCHLIST TAB ════════════════════════════════════════════════ */}
        {tab === "watchlist" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-700 space-y-4">
            {watchlist.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                <Shield className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">Your Watchlist is Empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {watchlist.map((w) => (
                  <div key={w.id} className="relative group">
                    <button
                      onClick={() => { setStockCode(w.stockCode); setResult(w.levels); setTab("main"); }}
                      className="w-full bg-slate-900/50 p-5 rounded-2xl border border-white/5 flex items-center justify-between hover:border-green-500/30 transition-all text-left"
                    >
                      <div>
                        <h4 className="font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                          {w.stockCode}
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20">SAVED</span>
                        </h4>
                        <p className="text-[10px] text-slate-300 font-medium uppercase">Stored on {w.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-green-400 italic">PP: {fmt(w.levels.PP)}</p>
                        <p className="text-[10px] text-slate-300 font-medium uppercase flex items-center justify-end gap-1">
                          Open Analysis <ChevronRight className="w-3 h-3" />
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newW = watchlist.filter(item => item.id !== w.id);
                        setWatchlist(newW);
                        localStorage.setItem("pivot_watchlist", JSON.stringify(newW));
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ FLOATING LIVE INDICATOR ══════════════════════════════════════════ */}
      {result && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-20 duration-500 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black tracking-tight">{stockCode || "ANALYSIS"} LIVE</p>
              <p className="text-[9px] text-slate-300 font-medium uppercase">{timeframe} • Pivot Equilibrium Found</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={captureImage}
              id="btn-share"
              className="px-4 py-2 bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2"
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
          </div>
        </div>
      )}
    </main>
  );
}