"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Target, Shield, AlertCircle,
  Share2, Save, Bell, LineChart, Table, History, Image as ImageIcon,
  ChevronRight, ArrowRight, Activity, Zap, Info, Search, Trash2, Calendar,
  Loader2, CheckCircle2, XCircle, WifiOff, Star
} from "lucide-react";
import { toPng } from "html-to-image";
import dynamic from "next/dynamic";
import { identifyPattern, getConfluenceLabel } from "../utils/patterns";
const RiskRewardVisualizer = dynamic(() => import("../components/RiskRewardVisualizer"), { ssr: false });
const TradingChart = dynamic(() => import("../components/TradingChart"), { ssr: false });
import StoryExportCard from "../components/StoryExportCard";

// --- Helper Utilities --------------------------------------------------------
const fmt = (n) => (n != null ? n.toLocaleString("id-ID") : "-");
const fmtDec = (n) =>
  n != null
    ? n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "-";

// --- Input Field Component ---------------------------------------------------
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

// --- Error Boundary ------------------------------------------------------------
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

// --- Main Component -----------------------------------------------------------
export default function PivotAnalyzer() {
  // -- State: OHLC Inputs
  const [stockCode, setStockCode] = useState("");
  const [high, setHigh] = useState("");
  const [low, setLow] = useState("");
  const [close, setClose] = useState("");
  const [open, setOpen] = useState("");
  const [volume, setVolume] = useState("");
  const [ma20Volume, setMa20Volume] = useState("");
  const [ma20Price, setMa20Price] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  // -- State: Timeframe
  const [timeframe, setTimeframe] = useState("DAILY");

  // -- State: Auto-Fill
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState(null); // null | { type: 'success'|'error', msg: string }

  // -- State: Application
  const [tab, setTab] = useState("main");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [pattern, setPattern] = useState(null);
  const [confluence, setConfluence] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // -- Refs
  const analysisCardRef = useRef(null);

  // -- Load persisted data
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

  // -- Debounced Auto-Fill: fires 800ms after user stops typing a valid code
  useEffect(() => {
    const code = stockCode.trim();
    // Only trigger if 2-6 chars (typical IDX stock codes are 4 chars)
    if (code.length < 2 || code.length > 6) return;
    const timer = setTimeout(() => {
      handleAutoFill();
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCode]);

  // --- Derived: Trend Context (Current Price vs MA20 Price) -----------------
  const trendContext = useMemo(() => {
    if (!result) return null;
    const cp = parseFloat(currentPrice) || parseFloat(close);
    if (isNaN(cp) || cp <= 0) return null;
    const ma = parseFloat(ma20Price);
    // If MA20 Price provided â†’ compare against it; else fall back to PP
    const isBullish = !isNaN(ma) && ma > 0 ? cp > ma : cp > result.PP;
    return {
      isBullish,
      label: `${stockCode || "Stock"} - ${isBullish ? "Tren Naik" : "Tren Turun"}`,  
    };
  }, [result, currentPrice, close, ma20Price, stockCode]);

  // --- Derived: RRR Calculation (robust) â””-------------------------------
  const calcRRR = useMemo(() => {
    if (!result) return null;
    const cp = parseFloat(currentPrice) || parseFloat(close);
    if (isNaN(cp) || cp <= 0) return null;
    
    let risk = cp - result.S1;   // downside to S1
    const reward = result.R1 - cp; // upside to R1
    
    if (risk === 0) risk = 0.0001; // guard: prevent divide by zero
    
    return Math.abs(reward / risk).toFixed(2);
  }, [result, currentPrice, close]);

  // --- Pivot Calculation ----------------------------------------------------
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
    const hStr = String(high).trim().replace(/,/g, '');
    const lStr = String(low).trim().replace(/,/g, '');
    const cStr = String(close).trim().replace(/,/g, '');
    const oStr = String(open).trim().replace(/,/g, '');
    const epStr = String(currentPrice).trim().replace(/,/g, '');

    if (!high || !low || !close || Number(hStr) <= 0 || Number(lStr) <= 0 || Number(cStr) <= 0) {
      alert("⚠️ DATA TIDAK VALID: Pastikan input High, Low, dan Close terisi angka di atas 0.");
      return;
    }

    let h = Number(hStr);
    let l = Number(lStr);
    const c = Number(cStr);
    let o = Number(oStr);

    // Jika Entry kosong atau 0, gunakan Close sebagai fallback (don't block)
    const ep = Number(epStr) > 0 ? Number(epStr) : c;

    if (h < l) {
      alert("⚠️ DATA TIDAK MASUK AKAL: High tidak boleh lebih kecil dari Low. Proses dibatalkan.");
      return;
    }

    if (!open || o === 0 || isNaN(o)) o = c; // Fallback safe open price

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
            body: `Area Buy Terdeteksi di [${stockCode || "Saham"}] - Harga menyentuh S1 (${fmt(levels.S1)})`,
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

  // --- Auto-Fill: Fetch OHLCV + MA20 from Yahoo Finance via API route --------
  const handleAutoFill = useCallback(async () => {
    const code = stockCode.trim().toUpperCase();
    if (!code) return;

    setFetchLoading(true);
    setFetchStatus(null);
    setResult(null); // Hapus result lama
    setOpen(""); setHigh(""); setLow(""); setClose("");
    setVolume(""); setMa20Volume(""); setMa20Price(""); setCurrentPrice("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const tf = timeframe.toLowerCase();
      const fetchUrl = `/api?symbol=${encodeURIComponent(code)}&timeframe=${tf}`;
      console.log('Fetching from:', fetchUrl);
      const res = await fetch(fetchUrl, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        setFetchStatus({ type: "error", msg: data.detail || data.error || "Data emiten tidak ditemukan. Silakan Input Manual!" });
        return;
      }

      if (data.high == null || data.low == null || data.close == null || data.close === 0) {
        setFetchStatus({ type: "error", msg: "Data emiten sedang direkap/belum utuh. Coba sebentar lagi." });
        return;
      }

      // -- Jika sudah lewat sini, data valid! Matikan semua potensi error.
      setFetchStatus(null);

      // -- Populate all fields automatically (from original Python API) --
      if (data.open   != null && data.open > 0) setOpen(String(data.open));
      if (data.high   != null && data.high > 0) setHigh(String(data.high));
      if (data.low    != null && data.low > 0) setLow(String(data.low));
      
      // 2. Handle Jam Bursa: Distinguish between previous close & live price
      if (data.prev_close != null && data.prev_close > 0 && timeframe.toLowerCase() === "daily") {
        setClose(String(data.prev_close));
      } else if (data.close != null && data.close > 0) {
        setClose(String(data.close));
      }

      if (data.volume != null) setVolume(String(data.volume));
      if (data.ma20_volume != null) setMa20Volume(String(data.ma20_volume));
      if (data.ma20_price != null && data.ma20_price > 0) setMa20Price(String(data.ma20_price));
      
      if (data.current_price != null && data.current_price > 0) {
        setCurrentPrice(String(data.current_price));
      } else if (data.close != null) {
        setCurrentPrice(String(data.close));
      }

      const tfLabel = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" }[timeframe.toLowerCase()] || timeframe;
      setFetchStatus({
        type: "success",
        msg: `Data ${code} [${tfLabel}] berhasil diisi${data.tradingDate ? " (" + data.tradingDate + ")" : ""}.`,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        setFetchStatus({ type: "error", msg: "Server Sibuk (Timeout). Silakan Input Manual!" });
      } else {
        setFetchStatus({ type: "error", msg: "Koneksi bermasalah. Server butuh waktu, silakan Input Manual!" });
      }
    } finally {
      setFetchLoading(false);
    }
  }, [stockCode, timeframe]);

  // --- Giant Watchlist Auto-Click -------------------------------------------
  const handleGiantClick = useCallback(async (code) => {
    setTab("main");
    setStockCode(code);
    setFetchLoading(true);
    setFetchStatus(null);
    setResult(null); // Force screen to loading state

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const tf = timeframe.toLowerCase();
      const fetchUrl = `/api?symbol=${encodeURIComponent(code)}&timeframe=${tf}`;
      console.log('Fetching from:', fetchUrl);
      const res = await fetch(fetchUrl, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setFetchStatus({ type: "error", msg: data.detail || data.error || "Data tidak ditemukan. Silakan Input Manual!" });
        setFetchLoading(false);
        return;
      }

      if (data.high == null || data.low == null || data.close == null || data.close === 0) {
        setFetchStatus({ type: "error", msg: "Data emiten sedang direkap/belum utuh. Coba sebentar lagi." });
        setFetchLoading(false);
        return;
      }

      // Data mutlak sukses, reset potential errors
      setFetchStatus(null);

      const o = data.open != null && data.open > 0 ? String(data.open) : "";
      const h = data.high != null && data.high > 0 ? String(data.high) : "";
      const l = data.low != null && data.low > 0 ? String(data.low) : "";
      let c = "";
      if (data.prev_close != null && data.prev_close > 0 && timeframe.toLowerCase() === "daily") {
        c = String(data.prev_close);
      } else if (data.close != null && data.close > 0) {
        c = String(data.close);
      }
      
      const v = data.volume != null ? String(data.volume) : "";
      const m20v = data.ma20_volume != null ? String(data.ma20_volume) : "";
      const m20p = data.ma20_price != null && data.ma20_price > 0 ? String(data.ma20_price) : "";
      
      let curP = "";
      if (data.current_price != null && data.current_price > 0) {
        curP = String(data.current_price);
      } else if (data.close != null) {
        curP = String(data.close);
      }

      setOpen(o); setHigh(h); setLow(l); setClose(c);
      setVolume(v); setMa20Volume(m20v); setMa20Price(m20p); setCurrentPrice(curP);

      setFetchStatus({
        type: "success",
        msg: `Data ${code} [${timeframe}] berhasil diisi & dikalkulasi.`,
      });

      // INSTANT CALCULATION
      const hNum = parseFloat(h);
      const lNum = parseFloat(l);
      const cNum = parseFloat(c);
      const oNum = parseFloat(o) || cNum;

      if (!isNaN(hNum) && !isNaN(lNum) && !isNaN(cNum) && hNum >= lNum) {
         setLoading(true);
         setTimeout(() => {
           try {
             const p = (hNum + lNum + cNum) / 3;
             const levels = {
                PP: Math.round(p),
                R1: Math.round(2 * p - lNum),
                S1: Math.round(2 * p - hNum),
                R2: Math.round(p + (hNum - lNum)),
                S2: Math.round(p - (hNum - lNum)),
                R3: Math.round(hNum + 2 * (p - lNum)),
                S3: Math.round(lNum - 2 * (hNum - p)),
             };
             setResult(levels);

             const detectedPattern = identifyPattern({ open: oNum, high: hNum, low: lNum, close: cNum });
             setPattern(detectedPattern);

             const cpNum = parseFloat(curP) || cNum;
             const nearestLvl = Object.entries(levels).reduce((prev, curr) =>
               Math.abs(curr[1] - cpNum) < Math.abs(prev[1] - cpNum) ? curr : prev,
               ["PP", levels.PP]
             );
             const conf = getConfluenceLabel(detectedPattern, { label: nearestLvl[0], value: nearestLvl[1] });
             setConfluence(conf);

             const entry = {
               id: Date.now(),
               stockCode: code,
               levels,
               date: new Date().toLocaleDateString("id-ID"),
               time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
               ohlc: { h: hNum, l: lNum, c: cNum, o: oNum },
             };
             setHistory(prev => {
                const newHistory = [entry, ...prev].slice(0, 20);
                if (typeof window !== 'undefined') {
                  try { localStorage.setItem("pivot_history", JSON.stringify(newHistory)); } 
                  catch (e) {}
                }
                return newHistory;
             });

           } catch (err) {
             console.error("Auto Calculate Error:", err);
             alert(err.message || "Terjadi masalah kalkulasi.");
           } finally {
             setLoading(false);
           }
         }, 300);
      }
    } catch (err) {
       if (err.name === 'AbortError') {
         setFetchStatus({ type: "error", msg: "Server Sibuk (Timeout). Silakan Input Manual!" });
       } else {
         setFetchStatus({ type: "error", msg: "Koneksi bermasalah. Silakan Input Manual!" });
       }
    } finally {
       setFetchLoading(false);
    }
  }, [timeframe]);

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
      try {
        const dataUrl = await toPng(analysisCardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#09090b', style: { padding: '20px' } });
        if (navigator.share) {
          try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `TradingStars_${stockCode || 'Analysis'}.png`, { type: blob.type });
            await navigator.share({
              title: `Trading Stars PRO - ${stockCode}`,
              text: `Analisa Pivot Point & RRR Saham ${stockCode} dari Trading Stars PRO.`,
              files: [file],
            });
            return;
          } catch (e) {
            console.log("Share canceled", e);
          }
        }
        const link = document.createElement("a");
        link.download = `tradingstars-${stockCode || "analysis"}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Error capturing image:", err);
        alert("Gagal menyimpan gambar analisa.");
      }
    }
  };

  // --- Pivot Ladder Row Config ----------------------------------------------
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

  // --- Giants Data ----------------------------------------------------------
  const GIANTS = useMemo(() => [
    {
      group: "BAKRIE",
      badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      btnClass: "border-orange-500 hover:bg-orange-500/20 hover:text-white",
      stocks: ["BUMI", "BNBR", "BRMS", "DEWA", "ENRG", "UNSP", "VIVA", "MDIA", "ELTY", "BTEL", "GJLE", "VKTR"]
    },
    {
      group: "BARITO",
      badgeClass: "bg-green-500/10 text-green-400 border-green-500/20",
      btnClass: "border-green-500 hover:bg-green-500/20 hover:text-white",
      stocks: ["BREN", "BRPT", "TPIA", "CUAN", "PTRO", "BARA"]
    },
    {
      group: "SALIM",
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      btnClass: "border-blue-500 hover:bg-blue-500/20 hover:text-white",
      stocks: ["ASII", "BBCA", "INDF", "ICBP", "LSIP", "SIMP", "DNET", "IMAS"]
    },
    {
      group: "DJARUM",
      badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      btnClass: "border-yellow-500 hover:bg-yellow-500/20 hover:text-white",
      stocks: ["BBCA", "TOWR", "BLIB", "BELI", "RANC"]
    },
    {
      group: "ADRO",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      btnClass: "border-emerald-500 hover:bg-emerald-500/20 hover:text-white",
      stocks: ["ADRO", "ADMR", "MBMA", "ESSA", "PALM", "GOTO"]
    },
    {
      group: "MNC",
      badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      btnClass: "border-sky-500 hover:bg-sky-500/20 hover:text-white",
      stocks: ["BHIT", "MNCN", "BMTR", "KPIG", "BCAP", "BABP", "IPTV", "MSIN"]
    },
    {
      group: "SINARMAS",
      badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
      btnClass: "border-red-500 hover:bg-red-500/20 hover:text-white",
      stocks: ["BSDE", "INKP", "TKIM", "SMMA", "DMAS", "FREN", "BSIM"]
    },
    {
      group: "LIPPO",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      btnClass: "border-rose-500 hover:bg-rose-500/20 hover:text-white",
      stocks: ["LPKR", "LPPF", "MLPL", "MPPA", "SILO", "LINK"]
    },
    {
      group: "PANIN",
      badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      btnClass: "border-indigo-500 hover:bg-indigo-500/20 hover:text-white",
      stocks: ["PNBN", "PNIN", "PNLF", "PNBS", "CFIN", "PANI"]
    },
    {
      group: "SARATOGA",
      badgeClass: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      btnClass: "border-teal-500 hover:bg-teal-500/20 hover:text-white",
      stocks: ["SRTG", "MDKA", "MPMX", "GOLD"]
    },
    {
      group: "CT CORP",
      badgeClass: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      btnClass: "border-violet-500 hover:bg-violet-500/20 hover:text-white",
      stocks: ["BANK", "ALLO", "TRAN"]
    },
    {
      group: "ASTRA",
      badgeClass: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
      btnClass: "border-fuchsia-500 hover:bg-fuchsia-500/20 hover:text-white",
      stocks: ["ASII", "UNTR", "ASGR", "AUTO", "AALI"]
    }
  ], []);

  // --- Render ---------------------------------------------------------------
  return (
    <main className="min-h-screen bg-[#09090b] text-white p-4 pb-24 font-sans selection:bg-purple-500/30">

      {/* â•â• HEADER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-all shadow-lg shadow-purple-500/10"
            title="Panduan Penggunaan"
          >
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">Cara Pakai</span>
          </button>
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

      {/* â•â• TIMEFRAME SELECTOR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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

        {/* -- Navigation Tabs ----------------------------------------------- */}
        <nav className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
          {[
            { id: "main",      label: "Analysis", icon: Zap     },
            { id: "giants",    label: "SAHAM SAHAM KONGLO", icon: Star },
            { id: "watchlist", label: "Watchlist", icon: Shield  },
            { id: "history",   label: "History",   icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[9px] sm:text-[11px] font-bold transition-all duration-300 ${
                tab === t.id
                  ? t.id === 'giants'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                      : "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                  : "bg-slate-900/50 text-slate-400 border-transparent hover:text-purple-300"
              }`}
            >
              <t.icon className={`w-3.5 h-3.5 flex-shrink-0`} />
              <span className="tracking-tight hidden xs:inline-block sm:inline-block">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* â•â• MAIN ANALYSIS TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === "main" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">

            {/* -- DATA OHLC Input Panel ---------------------------------- */}
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
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-5 pr-24 py-4 text-sm font-black tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all uppercase"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        onClick={addToWatchlist}
                        disabled={!stockCode.trim()}
                        title="Tambah ke Watchlist"
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          watchlist.some(w => w.stockCode === stockCode)
                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                            : "bg-slate-800 border border-white/5 text-slate-400 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        <Star className={`w-4 h-4 ${watchlist.some(w => w.stockCode === stockCode) ? "fill-amber-500" : ""}`} />
                      </button>
                      <button
                        onClick={handleAutoFill}
                        disabled={fetchLoading || !stockCode.trim()}
                        title="Auto-Fill OHLC dari IDX"
                        className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-lg shadow-purple-500/20"
                      >
                        {fetchLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Search className="w-4 h-4" />}
                      </button>
                    </div>
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

                {/* ★ MA20 Price - NEW FIELD ★ */}
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

            {/* -- ANALYSIS RESULTS ---------------------------------------------------------- */}
            {result && isClient && (
              <div ref={analysisCardRef} className="space-y-5 animate-in slide-in-from-bottom-10 fade-in duration-1000">

                {/* â•â• TREND CONTEXT + RRR SUMMARY ROW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Trend Context Card */}
                  <div className={`rounded-2xl border p-4 flex flex-col gap-2.5 transition-all ${
                    trendContext?.isBullish
                      ? "bg-green-500/8 border-green-500/25 shadow-[0_0_20px_rgba(34,197,94,0.06)]"
                      : "bg-red-500/8 border-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  }`}>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Major Trend (MA20)</p>
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
                        {trendContext?.label ?? `${stockCode || "Stock"} - N/A`}
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
                  <ErrorBoundary>
                    <RiskRewardVisualizer 
                      entry={parseFloat(currentPrice) || parseFloat(close)} 
                      stopLoss={result.S1} 
                      target={result.R1} 
                    />
                  </ErrorBoundary>
                  
                  <div className="bg-slate-800/20 p-5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Daily Sentiment (Pivot)</p>
                        {(() => {
                           const isPivotBullish = parseFloat(currentPrice || close) > result.PP;
                           const isMa20Bullish = trendContext?.isBullish;
                           let badge = null;
                           if (isPivotBullish && !isMa20Bullish) badge = "⚠️ Tech Rebound";
                           if (!isPivotBullish && isMa20Bullish) badge = "⚠️ Sedang Koreksi";
                           
                           return (
                             <div className="flex gap-2 items-center">
                               {badge && (
                                 <div className="px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30 text-[9px] font-black text-orange-400 uppercase">
                                   {badge}
                                 </div>
                               )}
                               {confluence && (
                                 <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-[9px] font-black text-green-400 uppercase animate-pulse">
                                   {confluence.text}
                                 </div>
                               )}
                             </div>
                           );
                        })()}
                      </div>
                      <div className="flex items-center gap-3">
                        {(() => {
                          const isPivotBullish = parseFloat(currentPrice || close) > result.PP;
                          const isMa20Bullish = trendContext?.isBullish;
                          let theme = isPivotBullish ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";
                          let text = isPivotBullish ? "UPTREND" : "DOWNTREND";
                          
                          if (isPivotBullish && !isMa20Bullish) {
                             theme = "bg-yellow-500/20 text-yellow-500";
                             text = "REBOUND";
                          } else if (!isPivotBullish && isMa20Bullish) {
                             theme = "bg-orange-500/20 text-orange-400";
                             text = "KOREKSI";
                          }

                          return (
                            <>
                              <div className={`p-2 rounded-lg ${theme}`}>
                                {isPivotBullish ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                              </div>
                              <div>
                                <p className="text-lg font-black">{text}</p>
                                <p className="text-[10px] text-slate-300 font-medium uppercase">
                                  Price {isPivotBullish ? "above" : "below"} Pivot Point
                                </p>
                              </div>
                            </>
                          );
                        })()}
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
                </div>

                <div className="mt-2 text-center text-xs opacity-0"></div>

                {/* == TRADINGSTARS AI SIGNAL == */}
                {(() => {
                   const cp = parseFloat(currentPrice || close);
                   if (!result || isNaN(cp)) return null;

                   const volStrong = volume && ma20Volume && parseFloat(volume) > parseFloat(ma20Volume);
                   const isBull = cp > result.PP;
                   const volatility = (result.R3 - result.S3) / result.S3;
                   const isTrendUp = isBull && trendContext?.isBullish;
                   
                   let sig = null;
                   
                   if (cp >= result.R2 * 0.99) {
                       sig = { text: "TAKE PROFIT: Reached Target Res 2", style: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400", icon: <AlertCircle className="w-5 h-5 text-yellow-400"/> };
                   } else if (volatility > 0.1) {
                       sig = { text: "WAIT & SEE: High Volatility", style: "border-slate-500/50 bg-slate-500/10 text-slate-300", icon: <Activity className="w-5 h-5 text-slate-400"/> };
                   } else if (cp <= result.S1 * 1.02 && cp >= result.S1 * 0.95 && volStrong) {
                       sig = { text: "BUY ON WEAKNESS: Area Supp 1", style: "border-green-500/50 bg-green-500/10 text-green-400", icon: <TrendingUp className="w-5 h-5 text-green-400"/> };
                   } else if (isTrendUp) {
                       sig = { text: "HOLD: Strong Bullish Momentum", style: "border-blue-500/50 bg-blue-500/10 text-blue-400", icon: <Target className="w-5 h-5 text-blue-400"/> };
                   } else {
                       sig = { 
                           text: isBull ? "MONITOR: Bullish Bias" : "CAUTION: Bearish Bias",
                           style: isBull ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-orange-500/30 bg-orange-500/10 text-orange-400",
                           icon: isBull ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />
                       };
                   }

                   return (
                     <div className={`p-4 rounded-3xl border flex items-center gap-4 shadow-xl shadow-black/40 animate-in zoom-in-95 duration-500 ${sig.style}`}>
                        <div className="p-3 rounded-2xl bg-slate-950/40 border border-inherit shadow-inner">
                           {sig.icon}
                        </div>
                        <div>
                           <div className="flex items-center gap-1.5 mb-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                             <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">TradingStars AI Signal</p>
                           </div>
                           <p className="text-sm font-black tracking-wide leading-tight">{sig.text}</p>
                        </div>
                     </div>
                   );
                })()}

                <ErrorBoundary>
                  <TradingChart ohlc={{ open, high, low, close }} levels={result} pattern={pattern} />
                </ErrorBoundary>

                {/* â•â• PIVOT LADDER with Demand / Supply Zones â•â•â•â•â•â•â•â•â•â•â•â• */}
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
                  {/* Ladder Header */}
                  <div className="bg-slate-900/60 px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                      <Table className="w-4 h-4 text-purple-500" /> Pivot Ladder
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[9px] font-black text-slate-300 uppercase">Zona Jual (Supply)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-[9px] font-black text-slate-300 uppercase">Zona Beli (Demand)</span>
                      </div>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-white/5">
                    {pivotRows.map((row) => (
                      <React.Fragment key={row.l}>
                        {/* -- Normal Pivot Row -- */}
                        <div className={`flex items-center justify-between px-4 py-3.5 group hover:bg-white/5 transition-all ${row.b}`}>
                          <div className="flex items-center gap-3">
                            {/* Label badge */}
                            <span className={`w-8 text-[10px] font-black p-1 rounded text-center border border-current/20 flex-shrink-0 ${row.c}`}>
                              {row.l}
                            </span>
                            {/* Mini progress bar - hidden on very small screens */}
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
                                ? "Harga Tengah (Pivot)"
                                : row.l.startsWith("R")
                                ? "Target Jual (Res)"
                                : "Area Beli (Supp)"}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black transition-all group-hover:scale-110 ${row.c}`}>{fmt(row.v)}</p>
                            {(() => {
                              const cp = parseFloat(currentPrice) || parseFloat(close);
                              if (!cp || isNaN(cp)) {
                                return <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">Price Point</p>;
                              }
                              const diffPct = ((row.v - cp) / cp) * 100;
                              const isPos = diffPct > 0;
                              const isZero = Math.abs(diffPct) < 0.01;
                              const color = isPos ? "text-green-400" : isZero ? "text-slate-400" : "text-orange-400";
                              const sign = isPos ? "+" : "";
                              return (
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                  <p className="text-[9px] text-slate-400 font-medium uppercase">Price Point</p>
                                  <span className={`text-[9px] font-black tracking-tighter bg-slate-900/50 px-1 py-0.5 rounded border border-white/5 ${color}`}>
                                    {isZero ? "0.00%" : `${sign}${diffPct.toFixed(2)}%`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* -- Supply Area Zone Banner (after R2, before R1) -- */}
                        {row.supplyZoneAfter && (
                          <div className="relative bg-red-500/10 border-l-4 border-red-500/40 px-5 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">▲ Zona Jual (Supply)</span>
                            </div>
                            <span className="text-[9px] text-red-400/60 font-medium italic">R1 - R2 Zone</span>
                          </div>
                        )}

                        {/* -- Demand Area Zone Banner (after S1, before S2) -- */}
                        {row.demandZoneAfter && (
                          <div className="relative bg-green-500/10 border-l-4 border-green-500/40 px-5 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">▼ Zona Beli (Demand)</span>
                            </div>
                            <span className="text-[9px] text-green-400/60 font-medium italic">S1 - S2 Zone</span>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* -- BANDAR POWER DETECTOR / Strategic Insights ------- */}
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-3xl border border-purple-500/20">
                  <h3 className="text-sm font-black text-purple-400 uppercase mb-5 tracking-tighter flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Bandar Power Detector
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Rentang Harga</p>
                      <p className="text-lg font-black text-slate-100">{fmt(result.R3 - result.S3)} <span className="text-xs font-bold text-slate-400">pts</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Jarak ke Supp 1</p>
                      <p className="text-lg font-black text-green-400">{((result.PP - result.S1) / result.PP * 100).toFixed(2)}%</p>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Potensi Balik Arah</p>
                      <p className="text-lg font-black text-orange-400">{((result.R1 - result.PP) / result.PP * 100).toFixed(2)}%</p>
                    </div>
                    {volume && ma20Volume && (() => {
                      const vol = parseFloat(volume);
                      const avgVol = parseFloat(ma20Volume);
                      const cp = parseFloat(currentPrice || close);
                      const isBull = cp > result.PP;
                      let percentage = 50;
                      let ratio = vol / avgVol;
                      
                      if (vol > avgVol) {
                         percentage = 50 + (isBull ? 1 : -1) * (Math.min(ratio - 1, 1.5) / 1.5) * 45;
                      } else {
                         percentage = 50 + (isBull ? 1 : -1) * (1 - ratio) * 10;
                      }
                      percentage = Math.max(5, Math.min(95, percentage));
                      
                      let color = "text-yellow-500";
                      let bgTheme = "bg-yellow-500/10 border-yellow-500/20";
                      let label = "Netral";
                      if (percentage > 70) { color = "text-green-500"; bgTheme = "bg-green-500/10 border-green-500/20"; label = "Big Accumulation"; }
                      else if (percentage < 30) { color = "text-red-500"; bgTheme = "bg-red-500/10 border-red-500/20"; label = "Big Distribution"; }
                      else if (percentage > 50) { color = "text-green-400"; bgTheme = "bg-green-500/10 border-green-500/20"; label = "Accumulation"; }
                      else if (percentage < 50) { color = "text-red-400"; bgTheme = "bg-red-500/10 border-red-500/20"; label = "Distribution"; }

                      const rotation = (percentage / 100) * 180 - 90;

                      return (
                        <div className="col-span-2 sm:col-span-3 pt-6 pb-2 border-t border-white/5 flex flex-col items-center justify-center">
                          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-4">Volume Power Gauge</p>
                          <div className="relative w-40 h-20 overflow-hidden mb-3">
                             <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-md">
                                <path d="M 10 50 A 40 40 0 0 1 35 22" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="butt" className="opacity-80" />
                                <path d="M 35 22 A 40 40 0 0 1 65 22" fill="none" stroke="#eab308" strokeWidth="12" strokeLinecap="butt" className="opacity-80" />
                                <path d="M 65 22 A 40 40 0 0 1 90 50" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="butt" className="opacity-80" />
                             </svg>
                             <div 
                                className="absolute bottom-0 left-1/2 w-1.5 h-[85%] -ml-[3px] origin-bottom transition-transform duration-1000 ease-out z-10"
                                style={{ transform: `rotate(${rotation}deg)` }}
                             >
                                <div className="w-full h-full bg-slate-100 rounded-t-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-slate-800 border-[3px] border-slate-300 rounded-full shadow-lg" />
                             </div>
                          </div>
                          
                          <div className={`px-4 py-1.5 rounded-full border ${bgTheme} ${color}`}>
                             <p className="text-xs font-black uppercase tracking-widest">{label}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* WATERMARK TRADING STARS PRO */}
                <div className="pt-6 pb-2 border-t border-white/5 flex flex-col items-center justify-center space-y-1.5 opacity-90">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/20">
                    <div className="w-full h-full bg-[#09090b] rounded-[7px] flex items-center justify-center">
                      <span className="text-xs font-black text-purple-400">TS</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-black tracking-widest uppercase text-slate-300">Trading Stars <span className="text-purple-500 italic">PRO</span></p>
                  <p className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest">Pivot & Momentum Analytics</p>
                </div>
              </div>
            )}

            {/* SHARE BUTTON OUTSIDE CAPTURE AREA */}
            {result && isClient && (
              <button
                onClick={captureImage}
                className="w-full bg-slate-900 border border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-black text-sm uppercase tracking-[0.15em] transition-all group shadow-xl shadow-purple-900/10 active:scale-[0.98]"
              >
                <ImageIcon className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                Share ke Grup
              </button>
            )}
          </div>
        )}

        {/* â•â• HISTORY TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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

        {/* ══ THE GIANTS TAB ═══════════════════════════════════════════════════════════════════════ */}
        {tab === "giants" && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.05)] text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 mb-8 max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4 animate-bounce hover:animate-none">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 uppercase tracking-widest leading-tight">
                  RADAR SAHAM KONGLOMERAT
                </h2>
                <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-2 px-4 shadow-sm border border-purple-500/20 bg-purple-500/10 rounded-full inline-block py-1">
                  Pantauan Ekosistem Pasar
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 text-left">
                {GIANTS.map(giant => (
                   <div key={giant.group} className="bg-slate-950/80 p-5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 flex flex-col">
                      <div className="flex items-center gap-3 mb-5">
                        <h4 className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border tracking-widest shadow-sm ${giant.badgeClass}`}>
                          {giant.group}
                        </h4>
                        <div className="flex-1 border-t border-white/10 group-hover:border-amber-500/30 transition-colors"></div>
                      </div>
                      <div className="flex flex-wrap gap-2.5 flex-1 items-start content-start">
                         {giant.stocks.map(stock => (
                            <button 
                              key={stock}
                              onClick={() => handleGiantClick(stock)}
                              title={`Pindai otomatis saham ${stock}`}
                              className={`flex-1 min-w-[70px] px-3 py-3 rounded-xl text-[11px] font-black tracking-widest bg-slate-900 border-b-[3px] transition-all text-slate-300 hover:scale-[1.03] active:scale-[0.98] active:border-b-[1px] active:translate-y-0.5 ${giant.btnClass}`}
                            >
                              {stock}
                            </button>
                         ))}
                      </div>
                   </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ WATCHLIST TAB ═══════════════════════════════════════════════════════════════════════ */}
        {tab === "watchlist" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-700 space-y-4">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2 pb-3 border-b border-white/5">
              <Shield className="w-4 h-4 text-purple-500" /> Watchlist Saya
            </h3>
            
            {watchlist.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                <Shield className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">Your Watchlist is Empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        try { localStorage.setItem("pivot_watchlist", JSON.stringify(newW)); } catch (err){}
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

      {/* â•â• FLOATING LIVE INDICATOR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {result && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-20 duration-500 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black tracking-tight">{stockCode || "ANALYSIS"} LIVE</p>
              <p className="text-[9px] text-slate-300 font-medium uppercase">{timeframe} • Harga Tengah Ditemukan</p>
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
      {/* == GUIDE MODAL ===================== */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-purple-500/20 rounded-3xl w-full max-w-md shadow-2xl shadow-purple-900/20 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <h2 className="text-lg font-black text-slate-100 uppercase tracking-tighter flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-500" />
                Panduan Penggunaan
              </h2>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
              <div className="space-y-2">
                <h3 className="font-black text-purple-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center text-xs">1</span>
                  Pilih Timeframe
                </h3>
                <ul className="space-y-1.5 ml-8">
                  <li><strong className="text-white">DAILY:</strong> Untuk trading harian (Scalping/Day Trade).</li>
                  <li><strong className="text-white">WEEKLY:</strong> Untuk trading mingguan (Swing Trade).</li>
                  <li><strong className="text-white">MONTHLY:</strong> Untuk investasi jangka panjang.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-purple-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center text-xs">2</span>
                  Cari Saham
                </h3>
                <ul className="space-y-1.5 ml-8">
                  <li>Ketik kode saham (contoh: <strong className="text-white">BMTR, ASII</strong>) di kolom pencarian.</li>
                  <li>Tunggu data OHLC (Open, High, Low, Close) terisi <strong className="text-indigo-400">otomatis</strong>.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-amber-500 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center text-xs">3</span>
                  Hitung & Analisa
                </h3>
                <ul className="space-y-1.5 ml-8">
                  <li>Klik <strong className="text-white">'HITUNG PIVOT POINT'</strong>.</li>
                  <li>Cek <strong className="text-white">'PIVOT LADDER'</strong> untuk melihat Area Beli (Supp) dan Target Jual (Res).</li>
                  <li>Pastikan <strong className="text-yellow-400">'RRR SETUP'</strong> bernilai di atas <strong className="text-yellow-400">1:1.5</strong> agar trading tetap sehat.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-green-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center text-xs">4</span>
                  Cara Baca Tren
                </h3>
                <ul className="space-y-1.5 ml-8">
                  <li><strong className="text-green-400">TREN NAIK (Bullish):</strong> Harga kuat di atas rata-rata.</li>
                  <li><strong className="text-red-400">TREN TURUN (Bearish):</strong> Waspada harga sedang melemah.</li>
                </ul>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5 bg-slate-900/80">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


