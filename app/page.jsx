"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Target, Shield, AlertCircle,
  Share2, Save, Bell, LineChart, Table, History, Image as ImageIcon,
  ChevronRight, ArrowRight, Activity, Zap, Info, Search, Trash2, Calendar,
  Loader2, CheckCircle2, XCircle, WifiOff, Star, Calculator, Newspaper
} from "lucide-react";
import { toPng } from "html-to-image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GlossaryText from "../components/GlossaryText";
import { identifyPattern, getConfluenceLabel } from "../utils/patterns";
import { sanitizeOHLCV } from "../utils/vcp";
const TradingChart = dynamic(() => import("../components/TradingChart"), { ssr: false });
const NewsSentimentAnalyzer = dynamic(() => import("../components/NewsSentimentAnalyzer"), { ssr: false });
const VcpIndicator = dynamic(() => import("../components/VcpIndicator"), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-purple-900/20 rounded-lg h-24 w-full border border-purple-500/10"></div>
});
const TrendConfluence = dynamic(() => import("../components/TrendConfluence"), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-purple-900/20 rounded-lg h-24 w-full border border-purple-500/10"></div>
});
import StoryExportCard from "../components/StoryExportCard";

// --- Helper Utilities --------------------------------------------------------
const fmt = (n) => (n != null ? n.toLocaleString("id-ID") : "-");
const fmtDec = (n) =>
  n != null
    ? n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "-";

// Format level harga dari AI: angka → "6.175"; string "N/A"/teks → apa adanya.
const fmtLevel = (v) => {
  if (v == null) return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("id-ID") : "-";
  const s = String(v).trim();
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return s !== "" && Number.isFinite(n) && /\d/.test(s) ? n.toLocaleString("id-ID") : s || "-";
};

// --- Pivot Ladder: sel level & label zona (DISPLAY-ONLY, tanpa kalkulasi) ---
function PivotCell({ label, value, tone }) {
  const color =
    tone === "supply" ? "text-orange-400 border-orange-500/20"
    : tone === "demand" ? "text-green-400 border-green-500/20"
    : "text-purple-300 border-purple-500/20";
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/40 border transition-all hover:bg-white/5 ${color}`}>
      <span className="text-[10px] font-black w-7 flex-shrink-0">{label}</span>
      <span className="text-sm font-black tabular-nums">
        {Number.isFinite(value) && value > 0 ? Math.round(value).toLocaleString("id-ID") : "—"}
      </span>
    </div>
  );
}
function ZoneTag({ text, tone }) {
  const c = tone === "red" ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-green-400 bg-green-500/10 border-green-500/30";
  const arrow = tone === "red" ? "▲" : "▼";
  return (
    <div className={`text-center text-[8px] font-black uppercase tracking-widest py-1 rounded-md border ${c}`}>
      {arrow} {text}
    </div>
  );
}

// Stock Universe — pill filter cepat (P7). Tiap kategori = daftar ticker quick-pick.
const STOCK_UNIVERSE = {
  "Blue Chip": ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "UNVR", "ICBP"],
  "High Volatility": ["GOTO", "BUMI", "BRMS", "CUAN", "PTRO", "BREN"],
  "SMC Setup": ["ANTM", "MDKA", "INCO", "ADRO", "ITMG"],
  "Breakout": ["TPIA", "BRPT", "AMMN", "PANI", "RAJA"],
};

// Base URL backend OHLC (auto-fill). Lokal: pakai NEXT_PUBLIC_API_URL (uvicorn).
// Production hardening: kalau halaman disajikan via HTTPS tapi base menunjuk ke
// localhost/loopback (env var nyasar di Vercel), ABAIKAN → pakai path relative
// "/api/trading" (fungsi Python Vercel). Tanpa ini, browser memblokir fetch
// https→http://127.0.0.1 (mixed-content) dan muncul "Koneksi bermasalah".
function resolveApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (!raw) return "";
  const isLoopback = /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|\[?::1\]?)(:\d+)?/i.test(raw);
  const onHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  return onHttps && isLoopback ? "" : raw;
}

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
// --- 3D Magnetic Tilt Hook (lightweight, zero-dependency) --------------------
function useTilt(max = 5) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    let raf = 0, tX = 0, tY = 0, cX = 0, cY = 0, active = false;
    const render = () => {
      cX += (tX - cX) * 0.12;
      cY += (tY - cY) * 0.12;
      // perspective baked in -> self-contained, correct vanishing point, no ancestor needed
      el.style.transform = `perspective(1600px) rotateX(${cY.toFixed(2)}deg) rotateY(${cX.toFixed(2)}deg)`;
      if (active || Math.abs(tX - cX) > 0.01 || Math.abs(tY - cY) > 0.01) {
        raf = requestAnimationFrame(render);
      } else {
        raf = 0;
      }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(render); };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      tX = (px - 0.5) * 2 * max;      // rotateY (left/right)
      tY = -(py - 0.5) * 2 * max;     // rotateX (up/down, inverted)
      active = true;
      kick();
    };
    const onLeave = () => { tX = 0; tY = 0; active = false; kick(); };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [max]);
  return ref;
}

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
  const pathname = usePathname(); // untuk state aktif tombol nav "News" (route /news)
  const [universe, setUniverse] = useState(null); // P7: filter Stock Universe aktif
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // -- Lebar zona entry (% dari rentang pivot R1–S1), bisa diatur user
  const [zonePct, setZonePct] = useState(6);

  // -- Kalkulator posisi (modal & risiko per trade)
  const [capital, setCapital] = useState("");
  const [riskPct, setRiskPct] = useState(2);
  const [calcEntry, setCalcEntry] = useState(""); // Harga Entry — default Entry Agresif (AI)
  const [calcSL, setCalcSL] = useState("");        // Harga SL — default SL (AI) / S1

  // -- AI (Gemini) analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);        // hasil analisa terstruktur
  const [aiTyped, setAiTyped] = useState("");         // narasi yang sedang "diketik"
  const [aiError, setAiError] = useState(null);
  const [aiAt, setAiAt] = useState(null);             // timestamp analisa
  const [aiCached, setAiCached] = useState(false);    // hasil dari cache?
  const [aiCopied, setAiCopied] = useState(false);    // feedback tombol salin
  const [autoAi, setAutoAi] = useState(true);         // auto-analisa setelah hitung (default ON)
  const aiCacheRef = useRef(new Map());               // cache per (saham + OHLC)
  const [history, setHistory] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [pattern, setPattern] = useState(null);
  const [confluence, setConfluence] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [vcpData, setVcpData] = useState(null); // array OHLCV 120+ bar untuk VcpIndicator


  // -- State: Average Calculator
  const [avgSlots, setAvgSlots] = useState([{ id: 1, harga: "", lot: "" }, { id: 2, harga: "", lot: "" }]);

  const newTotalLot = avgSlots.reduce((acc, slot) => acc + (parseFloat(slot.lot) || 0), 0);
  const totalModalValue = avgSlots.reduce((acc, slot) => acc + ((parseFloat(slot.harga) || 0) * (parseFloat(slot.lot) || 0)), 0);
  const newAverage = newTotalLot > 0 ? totalModalValue / newTotalLot : 0;

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
  // NOTE: We intentionally do NOT re-fetch on stockCode changes to prevent
  // the button-click onBlur race condition that cleared OHLC data mid-session.
  // Auto-fill is only triggered by explicit user actions (Search button / Enter).

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

  // --- Derived: Entry Zone — berbasis pivot (rentang R1–S1) & bisa diatur user ---
  const entryZone = useMemo(() => {
    if (!result) return null;
    const anchor = parseFloat(currentPrice) || parseFloat(close);
    if (isNaN(anchor) || anchor <= 0) return null;
    const pct = Math.max(1, Math.min(25, parseFloat(zonePct) || 6));
    const pivotRange = result.R1 - result.S1;
    // setengah-lebar zona = persen × rentang pivot (fallback ke 2% harga bila perlu)
    const half = (pivotRange > 0 ? pivotRange : anchor * 0.02) * (pct / 100);
    return { low: Math.round(anchor - half), high: Math.round(anchor + half) };
  }, [result, currentPrice, close, zonePct]);

  // --- Derived: Validitas setup AI (sinkron sentimen ↔ Entry/TP/SL) ----------
  // Tujuan: cegah info kontradiktif — kalau AI bearish / wait & see / tak ada
  // level, Trading Plan & grid Entry harus ikut "tidak valid", bukan tetap hijau.
  const aiSetup = useMemo(() => {
    const isNA = (v) => {
      if (v == null) return true;
      const s = String(v).trim().toLowerCase();
      return (
        s === "" || s === "-" || s === "n/a" || s === "na" ||
        s === "tidak ada" || s === "null" ||
        /wait[\s_]*(and[\s_]*)?see/.test(s)
      );
    };
    const sentimentRaw = String(aiData?.sentiment ?? "");
    const isBearish = /bearish/i.test(sentimentRaw);
    const isWaitSee = /wait[\s_]*(and[\s_]*)?see/i.test(sentimentRaw);
    const isKonsolidasi = /konsolidasi|netral|neutral/i.test(sentimentRaw);
    // Schema nested: entry.{agresif,demand}.level, tp.level, sl.level
    const agrLevel = aiData?.entry?.agresif?.level;
    const demLevel = aiData?.entry?.demand?.level;
    const entryNA = isNA(agrLevel) && isNA(demLevel); // valid kalau salah satu ada
    const tpNA = isNA(aiData?.tp?.level);
    const slNA = isNA(aiData?.sl?.level);
    const noTargets = tpNA && slNA;
    // Crisis (Part 4.3): BEARISH / wait_and_see / entry level null-N/A →
    // sembunyikan TP+SL, Entry full-width "Wait & See", Trading Plan tidak valid.
    // KONSOLIDASI tidak otomatis crisis (selama masih ada level entry).
    const collapse = isBearish || isWaitSee || entryNA;
    return { isBearish, isWaitSee, isKonsolidasi, agrLevel, demLevel, entryNA, tpNA, slNA, noTargets, collapse, invalid: collapse || noTargets };
  }, [aiData]);

  // Smart Calculator: isi otomatis Harga Entry (=Entry Agresif AI) & SL (=SL AI/S1)
  // saat ada analisa/pivot baru. Tetap bisa di-override manual oleh user.
  useEffect(() => {
    const agr = Number(aiSetup.agrLevel);
    const aiSl = Number(aiData?.sl?.level);
    const defEntry = Number.isFinite(agr) && agr > 0 ? agr : (parseFloat(currentPrice) || parseFloat(close));
    const defSL = Number.isFinite(aiSl) && aiSl > 0 ? aiSl : (result ? result.S1 : NaN);
    if (Number.isFinite(defEntry) && defEntry > 0) setCalcEntry(String(Math.round(defEntry)));
    if (Number.isFinite(defSL) && defSL > 0) setCalcSL(String(Math.round(defSL)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiData, result]);

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

  // Minta analisa LLM (Gemini) dari data pivot yang sudah dihitung
  const handleAiAnalyze = async () => {
    if (!result) return;
    // Cache per kombinasi saham + OHLC + pivot → hemat panggil API berulang
    const cacheKey = `${stockCode}|${high}|${low}|${close}|${currentPrice}|${result.PP}`;
    const cached = aiCacheRef.current.get(cacheKey);
    if (cached) {
      setAiError(null);
      setAiCached(true);
      setAiAt(new Date());
      setAiData(cached);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiData(null);
    setAiTyped("");
    setAiCached(false);
    try {
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode,
          timeframe,
          currentPrice,
          ohlc: { open, high, low, close, volume, ma20Volume, ma20Price },
          pivots: result,
          pattern: pattern ? `${pattern.name} — ${pattern.description}` : null,
          confluence: confluence ? confluence.text : null,
          rrr: calcRRR ? `1 : ${calcRRR}` : null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        aiCacheRef.current.set(cacheKey, data.analysis);
        // Simpan ke localStorage (cap 30 entri terbaru) supaya tahan reload & hemat kuota
        try {
          const entries = Array.from(aiCacheRef.current.entries()).slice(-30);
          aiCacheRef.current = new Map(entries);
          localStorage.setItem("pivot_ai_cache", JSON.stringify(Object.fromEntries(entries)));
        } catch { /* localStorage penuh/ditolak — abaikan */ }
        setAiAt(new Date());
        setAiData(data.analysis);
      } else {
        setAiError(data.error || "Gagal menganalisa.");
      }
    } catch {
      setAiError("Koneksi gagal. Coba lagi.");
    } finally {
      setAiLoading(false);
    }
  };

  // Susun teks analisa untuk Salin / Bagikan (schema nested, fallback ke lama)
  const buildAiText = () => {
    const d = aiData;
    if (!d) return "";
    const crisis = aiSetup.collapse;
    const narrative = d.analysis_text ?? d.analysis;
    const agr = d.entry?.agresif, dem = d.entry?.demand;
    const conf = d.confluence_score != null ? ` · Confluence ${d.confluence_score}/100${d.confidence ? ` (${d.confidence})` : ""}` : "";
    const lines = [
      `📊 Analisa AI — ${stockCode || "Saham"} (${timeframe})`,
      `Sentiment: ${d.sentiment}${conf}`,
      d.headline ? `\n${d.headline}` : "",
      narrative ? `\n${narrative}` : "",
    ];
    if (crisis) {
      lines.push(`\n⚠️ WAIT & SEE: Momentum belum valid. Jangan paksakan entry beli.`);
      const zp = d.zona_pantau;
      if (zp && Number.isFinite(Number(zp.bottom)) && Number.isFinite(Number(zp.top))) {
        lines.push(`🎯 Zona Pantau: ${fmtLevel(zp.bottom)} – ${fmtLevel(zp.top)}${zp.desc ? ` (${zp.desc})` : ""}`);
      }
    } else {
      if (agr?.level != null) lines.push(`\n⚡ Entry Agresif: ${fmtLevel(agr.level)}${agr.desc ? ` (${agr.desc})` : ""}`);
      if (dem?.level != null) lines.push(`🛡️ Area Demand: ${fmtLevel(dem.level)}${dem.desc ? ` (${dem.desc})` : ""}`);
      if (d.tp?.level != null) lines.push(`🎯 TP: ${fmtLevel(d.tp.level)}${d.tp.reason ? ` — ${d.tp.reason}` : ""}`);
      if (d.sl?.level != null) lines.push(`🛑 SL: ${fmtLevel(d.sl.level)}${d.sl.reason ? ` — ${d.sl.reason}` : ""}`);
    }
    if (d.risk) lines.push(`\nRisiko: ${d.risk}`);
    if (d.disclaimer) lines.push(`\n${d.disclaimer}`);
    return lines.filter(Boolean).join("\n");
  };

  const copyAi = async () => {
    try {
      await navigator.clipboard.writeText(buildAiText());
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 1800);
    } catch { /* clipboard ditolak browser */ }
  };

  const shareAiTelegram = () => {
    if (typeof window === "undefined") return;
    const url = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(buildAiText())}`;
    window.open(link, "_blank");
  };

  // Efek "streaming": ketik narasi analisa bertahap saat hasil baru datang
  useEffect(() => {
    const narrative = aiData?.analysis_text ?? aiData?.analysis; // schema baru → lama (fallback cache)
    if (!narrative) { setAiTyped(""); return; }
    const full = String(narrative);
    setAiTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 2; // 2 karakter per tick → mulus tapi cepat
      setAiTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [aiData]);

  // Auto-analisa setiap kali ada hasil pivot baru (bila toggle Auto aktif)
  useEffect(() => {
    if (autoAi && result) handleAiAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, autoAi]);

  // Muat cache analisa AI dari localStorage saat mount (tahan reload)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pivot_ai_cache");
      if (raw) aiCacheRef.current = new Map(Object.entries(JSON.parse(raw)));
    } catch { /* cache rusak — abaikan */ }
  }, []);

  const handleCalculate = () => {
    // Parse fresh — strip formatting characters, then convert
    const h = parseFloat(String(high).trim().replace(/[,\s]/g, ''));
    const l = parseFloat(String(low).trim().replace(/[,\s]/g, ''));
    const c = parseFloat(String(close).trim().replace(/[,\s]/g, ''));
    let o  = parseFloat(String(open).trim().replace(/[,\s]/g, ''));
    const ep = parseFloat(String(currentPrice).trim().replace(/[,\s]/g, ''));

    // Guard: Jika semua field kosong, data hilang dari state (bukan panggil API lagi)
    if (!high && !low && !close) {
      setFetchStatus({ type: "error", msg: "⚠️ Data hilang, silakan search ulang terlebih dahulu." });
      return;
    }

    // Non-blocking validation — tunjukkan toast, tidak pakai alert()
    if (isNaN(h) || isNaN(l) || isNaN(c)) {
      setFetchStatus({ type: "error", msg: "⚠️ Isi kolom High, Low, dan Close dengan angka terlebih dahulu." });
      return;
    }

    if (h <= 0 || l <= 0 || c <= 0) {
      setFetchStatus({ type: "error", msg: "⚠️ High, Low, Close tidak boleh 0. Gunakan data nyata atau input manual." });
      return;
    }

    if (h < l) {
      setFetchStatus({ type: "error", msg: "⚠️ High tidak boleh lebih kecil dari Low. Cek kembali data OHLC." });
      return;
    }

    // Fallback: jika Open atau Entry kosong, pakai Close
    if (isNaN(o) || o <= 0) o = c;
    const entryPrice = (!isNaN(ep) && ep > 0) ? ep : c;


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
    setFetchStatus(null); setVcpData(null);
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
      const apiBase = resolveApiBase(); // lokal: backend uvicorn; production: relative (abaikan localhost nyasar)
      const fetchUrl = `${apiBase}/api/trading?symbol=${encodeURIComponent(code)}&timeframe=${tf}&history=true`;
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

      // /api/trading bisa balas non-JSON (mis. HTML 404 saat next dev) → parse defensif
      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (!res.ok || !data) {
        // --- LIVE SCRAPE FALLBACK ---
        try {
          const tvRes = await fetch("/api/fallback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: code })
          });
          if (tvRes.ok) {
            const tvData = await tvRes.json();
            if (tvData && tvData.data && tvData.data.length > 0) {
              const d = tvData.data[0].d; 
              if (d && d.length >= 4 && d[3] > 0) {
                setFetchStatus(null);
                setOpen(String(d[0]));
                setHigh(String(d[1]));
                setLow(String(d[2]));
                setClose(String(d[3]));
                setCurrentPrice(String(d[3]));
                if (d[4]) setVolume(String(d[4]));
                setMa20Volume("-"); 
                setMa20Price("-");
                setVcpData([]);
                const tfLabel = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" }[timeframe.toLowerCase()] || timeframe;
                setFetchStatus({ type: "success", msg: `Data ${code} [${tfLabel}] terdeteksi via Live Scrape!` });
                return;
              }
            }
          }
        } catch (fallbackErr) {
          console.error("TV Fallback failed", fallbackErr);
        }
        setFetchStatus({ type: "error", msg: (data && (data.detail || data.error)) || `Emiten ${code} tidak ditemukan. Silakan Input Manual!` });
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
      
      let calculatedMa20Price = "-";
      let calculatedMa20Volume = "-";

      if (data.ohlcv_history && data.ohlcv_history.length >= 20) {
          const last20 = data.ohlcv_history.slice(-20);
          
          const sumPrice = last20.reduce((acc, curr) => acc + (curr.close || 0), 0);
          calculatedMa20Price = Math.round(sumPrice / 20).toString();
          
          const sumVolume = last20.reduce((acc, curr) => acc + (curr.volume || 0), 0);
          // ohlcv_history.volume = raw lembar → /100 untuk samakan ke satuan LOT
          // (konsisten dgn field Volume & backend ma20_volume yang juga /100)
          calculatedMa20Volume = Math.round(sumVolume / 20 / 100).toString();
      } else {
          calculatedMa20Price = data.ma20_price != null && data.ma20_price > 0 ? String(data.ma20_price) : "-";
          calculatedMa20Volume = data.ma20_volume != null ? String(data.ma20_volume) : "-";
      }

      setMa20Price(calculatedMa20Price);
      setMa20Volume(calculatedMa20Volume);
      
      if (data.current_price != null && data.current_price > 0) {
        setCurrentPrice(String(data.current_price));
      } else if (data.close != null) {
        setCurrentPrice(String(data.close));
      }

      // -- VCP History: simpan data historis untuk VcpIndicator --
      if (Array.isArray(data.ohlcv_history) && data.ohlcv_history.length > 0) {
        // Defensive filter: pastikan tidak ada bar null/0 yang lolos dari backend
        const cleanBars = sanitizeOHLCV(data.ohlcv_history);
        console.log("Isi vcpData:", cleanBars.length, cleanBars);
        setVcpData(cleanBars);
      } else {
        console.log("Isi vcpData: 0", data.ohlcv_history);
        setVcpData([]);
      }

      const tfLabel = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" }[timeframe.toLowerCase()] || timeframe;
      setFetchStatus({
        type: "success",
        msg: `Data ${code} [${tfLabel}] berhasil diisi${data.tradingDate ? " (" + data.tradingDate + ")" : ""}.`,
      });
    } catch (err) {
      setVcpData([]);
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
      const apiBase = resolveApiBase(); // lokal: backend uvicorn; production: relative (abaikan localhost nyasar)
      const fetchUrl = `${apiBase}/api/trading?symbol=${encodeURIComponent(code)}&timeframe=${tf}&history=true`;
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

      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (!res.ok || !data) {
        try {
          const tvRes = await fetch("/api/fallback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: code })
          });
          if (tvRes.ok) {
            const tvData = await tvRes.json();
            if (tvData && tvData.data && tvData.data.length > 0) {
              const d = tvData.data[0].d; 
              if (d && d.length >= 4 && d[3] > 0) {
                setFetchStatus(null);
                const o = String(d[0]);
                const h = String(d[1]);
                const l = String(d[2]);
                const c = String(d[3]);
                const curP = String(d[3]);
                const v = d[4] ? String(d[4]) : "";
                
                setOpen(o); setHigh(h); setLow(l); setClose(c);
                setVolume(v); setMa20Volume("-"); setMa20Price("-"); setCurrentPrice(curP);
                setVcpData([]);

                setFetchStatus({ type: "success", msg: `Data ${code} [${timeframe}] terdeteksi via Live Scrape!` });
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
                         R3: hNum + 2 * (p - lNum),
                         R2: p + (hNum - lNum),
                         R1: (2 * p) - lNum,
                         PP: p,
                         S1: (2 * p) - hNum,
                         S2: p - (hNum - lNum),
                         S3: lNum - 2 * (hNum - p)
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
                       console.error("Auto Calculate Fallback Error:", err);
                     } finally {
                       setLoading(false);
                       setFetchLoading(false);
                     }
                   }, 400);
                } else {
                   setFetchLoading(false);
                }
                return;
              }
            }
          }
        } catch (fallbackErr) {
          console.error("TV Fallback failed", fallbackErr);
        }

        setFetchStatus({ type: "error", msg: (data && (data.detail || data.error)) || `Emiten ${code} tidak ditemukan. Silakan Input Manual!` });
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
      
      let m20p = "-";
      let m20v = "-";

      if (data.ohlcv_history && data.ohlcv_history.length >= 20) {
          const last20 = data.ohlcv_history.slice(-20);
          
          const sumPrice = last20.reduce((acc, curr) => acc + (curr.close || 0), 0);
          m20p = Math.round(sumPrice / 20).toString();
          
          const sumVolume = last20.reduce((acc, curr) => acc + (curr.volume || 0), 0);
          m20v = Math.round(sumVolume / 20 / 100).toString(); // /100 → satuan LOT (raw lembar → lot)
      } else {
          m20p = data.ma20_price != null && data.ma20_price > 0 ? String(data.ma20_price) : "-";
          m20v = data.ma20_volume != null ? String(data.ma20_volume) : "-";
      }
      
      let curP = "";
      if (data.current_price != null && data.current_price > 0) {
        curP = String(data.current_price);
      } else if (data.close != null) {
        curP = String(data.close);
      }

      setOpen(o); setHigh(h); setLow(l); setClose(c);
      setVolume(v); setMa20Volume(m20v); setMa20Price(m20p); setCurrentPrice(curP);

      // -- VCP History: simpan data historis untuk VcpIndicator --
      if (Array.isArray(data.ohlcv_history) && data.ohlcv_history.length > 0) {
        const cleanBars = sanitizeOHLCV(data.ohlcv_history);
        console.log("Isi vcpData:", cleanBars.length, cleanBars);
        setVcpData(cleanBars);
      } else {
        console.log("Isi vcpData: 0", data.ohlcv_history);
        setVcpData([]);
      }

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
       setVcpData([]);
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

  const handleCopyText = async () => {
    if (!result) return;
    const cp = parseFloat(currentPrice) || parseFloat(close);
    if (!cp || isNaN(cp)) {
      setFetchStatus({ type: "error", msg: "Harga Saat Ini belum terisi untuk kalkulasi %."});
      return;
    }
    const potR2 = (((result.R2 - cp) / cp) * 100).toFixed(2);
    const potR1 = (((result.R1 - cp) / cp) * 100).toFixed(2);
    const riskS1 = (((cp - result.S1) / cp) * 100).toFixed(2);

    const txt = `Setup Premium $${stockCode || "TICKER"} Sinyal A1 Terdeteksi! 👑
Radar Akumulasi menyala, Silent Buyer tertangkap basah di bawah.

📊 TRADING STARS - PIVOT PRO
💰 Max Potensi: +${potR2}%
🛡️ Max Risk: -${riskS1}%
📈 Plan:
R1: ${fmt(result.R1)} (+${potR1}%)
R2: ${fmt(result.R2)} (+${potR2}%)
S1: ${fmt(result.S1)} (-${riskS1}%)

Tinggal eksekusi! Jangan telat masuk, ntar nyesel liat running trade.
🔗 https://t.me/TRADINGBATC`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(txt);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = txt;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          console.error("Fallback eksekusi gagal", error);
        } finally {
          textArea.remove();
        }
      }
      setFetchStatus({ type: "success", msg: "✅ Analisa berhasil disalin!" });
      setTimeout(() => setFetchStatus(null), 3000);
    } catch (e) {
      alert("Gagal copy teks: " + e.message);
    }
  };

  const handleDownloadImage = async () => {
    const node = document.getElementById("share-export-card");
    if (!node) return;
    try {
      setFetchStatus({ type: "success", msg: "⏳ Memproses Gambar..." });
      await new Promise(r => setTimeout(r, 100)); // small delay to ensure render
      const dataUrl = await toPng(node, { 
        quality: 1, 
        pixelRatio: 3,
        backgroundColor: '#09090b',
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `TradingStars_Setup_${stockCode || 'Analysis'}.png`;
      link.href = dataUrl;
      link.click();
      setFetchStatus({ type: "success", msg: "📸 Gambar berhasil disimpan!" });
      setTimeout(() => setFetchStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setFetchStatus({ type: "error", msg: "❌ Gagal menyimpan gambar." });
      setTimeout(() => setFetchStatus(null), 3000);
    }
  };

  // (Pivot Ladder kini display-only via <PivotCell>/<ZoneTag> — config lama dihapus.)

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
  const ohlcTiltRef = useTilt(5);

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
            { id: "main",      label: "Analysis", icon: Zap,        href: null },
            { id: "news",      label: "News",     icon: Newspaper,  href: "/news" },
            { id: "giants",    label: "SAHAM SAHAM KONGLO", icon: null, href: null },
            { id: "watchlist", label: "Watchlist", icon: Shield,    href: null },
            { id: "average",   label: "Average",   icon: Calculator, href: null },
            { id: "history",   label: "History",   icon: History,    href: null },
          ].map((t) => {
            const base = "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[9px] sm:text-[11px] font-bold transition-all duration-300";
            const inactive = "bg-slate-900/50 text-slate-400 border-transparent hover:text-purple-300";
            const content = (
              <>
                {t.icon && <t.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="tracking-tight hidden xs:inline-block sm:inline-block">{t.label}</span>
              </>
            );
            // Tombol "News" = navigasi route (Link), menyala ungu+glow saat di /news.
            if (t.href) {
              const active = pathname === t.href;
              return (
                <Link key={t.id} href={t.href}
                  className={`${base} ${active ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)]" : inactive}`}>
                  {content}
                </Link>
              );
            }
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`${base} ${
                  tab === t.id
                    ? t.id === 'giants'
                        ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                        : "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                    : inactive
                }`}>
                {content}
              </button>
            );
          })}
        </nav>

        {/* P7: Stock Universe filter pills — quick-pick ticker per kategori */}
        <div className="flex flex-col gap-2 -mt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(STOCK_UNIVERSE).map((cat) => {
              const active = universe === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setUniverse(active ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-300 ${
                    active
                      ? "bg-purple-500/20 text-purple-200 border-purple-400/60 shadow-[0_0_14px_rgba(168,85,247,0.5)]"
                      : "bg-slate-900/50 text-slate-400 border-white/10 hover:text-purple-300 hover:border-purple-500/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          {universe && (
            <div className="flex items-center gap-1.5 flex-wrap animate-in fade-in slide-in-from-top-1 duration-300">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 mr-1">{universe}:</span>
              {STOCK_UNIVERSE[universe].map((tk) => (
                <button
                  key={tk}
                  onClick={() => handleGiantClick(tk)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-800/60 text-slate-200 border border-white/5 hover:bg-purple-500/15 hover:text-purple-200 hover:border-purple-500/40 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all"
                >
                  {tk}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* â•â• MAIN ANALYSIS TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === "main" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">

            {/* -- DATA OHLC Input Panel ---------------------------------- */}
            <div ref={ohlcTiltRef} className="card-3d bg-slate-900/40 p-6 rounded-3xl border border-white/5">
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
                  <input type="text" value={ma20Volume} onChange={(e) => setMa20Volume(e.target.value)}
                    className="w-full bg-slate-950/50 border border-indigo-500/20 rounded-2xl px-4 py-3 text-sm font-black text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>

                {/* ★ MA20 Price - NEW FIELD ★ */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-amber-500/90 uppercase ml-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                    MA20 Price
                  </label>
                  <input
                    type="text"
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
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] btn-3d transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
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

                {/* â•â• AI ANALYSIS (Gemini) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                <div className="depth-3d bg-slate-900/40 rounded-3xl border border-purple-500/20 p-5">
                  {/* Header: judul + toggle Auto + tombol Analisa */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" /> Analisa AI
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAutoAi((v) => !v)}
                        title="Auto-analisa setiap kali Hitung Pivot"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${autoAi ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${autoAi ? 'bg-purple-400 shadow-[0_0_6px_#c084fc]' : 'bg-slate-600'}`} />
                        Auto
                      </button>
                      <button
                        onClick={handleAiAnalyze}
                        disabled={aiLoading}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                      >
                        {aiLoading
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menganalisa…</>
                          : <>{aiData ? 'Ulangi' : 'Analisa AI'} <ArrowRight className="w-3.5 h-3.5" /></>}
                      </button>
                    </div>
                  </div>

                  {/* Skeleton loading */}
                  {aiLoading && (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 w-1/3 bg-slate-700/50 rounded" />
                      <div className="h-2.5 w-full bg-slate-800/60 rounded" />
                      <div className="h-2.5 w-5/6 bg-slate-800/60 rounded" />
                      <div className="h-2.5 w-2/3 bg-slate-800/60 rounded" />
                    </div>
                  )}

                  {/* Error + Coba lagi */}
                  {!aiLoading && aiError && (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-[11px] text-red-400 font-medium">⚠️ {aiError}</p>
                      <button onClick={handleAiAnalyze} className="text-[10px] font-black text-purple-300 hover:text-purple-200 uppercase tracking-widest">🔄 Coba lagi</button>
                    </div>
                  )}

                  {/* Idle */}
                  {!aiLoading && !aiError && !aiData && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Klik <span className="text-purple-400 font-bold">Analisa AI</span> untuk ringkasan berbasis Gemini dari data pivot di atas{autoAi ? ' (mode Auto aktif)' : ''}.
                    </p>
                  )}

                  {/* Hasil */}
                  {!aiLoading && aiData && (
                    <div className="space-y-3">
                      {/* Sentiment + headline */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                          aiData.sentiment === 'BULLISH' ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                          : aiData.sentiment === 'BEARISH' ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-slate-500/15 text-slate-300 border border-white/10'
                        }`}>{aiData.sentiment || 'NETRAL'}</span>
                        <span className="text-[11px] font-black text-white flex-1 min-w-[140px]">{aiData.headline}</span>
                      </div>

                      {/* Confidence Meter — skor Confluence dari backend (0-100) + klasifikasi */}
                      {aiData.confluence_score != null && (() => {
                        const score = Math.max(0, Math.min(100, Number(aiData.confluence_score) || 0));
                        const label = aiData.confidence || '';
                        const markerLeft = Math.min(96, Math.max(4, score));
                        const badgeCls = score >= 81 ? 'text-green-300 border-green-400/50 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                          : score >= 61 ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10'
                          : score >= 41 ? 'text-yellow-300 border-yellow-400/40 bg-yellow-500/10'
                          : score >= 21 ? 'text-orange-300 border-orange-400/40 bg-orange-500/10'
                          : 'text-red-300 border-red-400/40 bg-red-500/10';
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Confluence Score</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white tabular-nums">{score}<span className="text-[10px] text-slate-500">/100</span></span>
                                <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${badgeCls}`}>{label}</span>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="h-2.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 shadow-inner" />
                              <div className="absolute -top-1 transition-all duration-700 ease-out" style={{ left: `${markerLeft}%`, transform: 'translateX(-50%)' }}>
                                <div className="w-5 h-5 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_10px_rgba(255,255,255,0.75)]" />
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Narasi: efek ketik dulu; setelah selesai, bungkus istilah glosarium (tooltip) */}
                      {(() => {
                        const full = String(aiData.analysis_text ?? aiData.analysis ?? "");
                        if (!full) return null;
                        const cls = "text-[11px] text-slate-300 leading-relaxed whitespace-pre-line";
                        return aiTyped.length < full.length ? (
                          <p className={cls}>{aiTyped}<span className="text-purple-400 animate-pulse">▋</span></p>
                        ) : (
                          <GlossaryText text={full} className={cls} />
                        );
                      })()}

                      {/* Chips Entry / TP / SL — schema nested; menyusut jadi "Wait & See" saat crisis */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* ENTRY — 2 baris (Agresif + Area Demand); full-width "Wait & See" saat crisis */}
                        <div className={`p-2.5 rounded-xl border ${
                          aiSetup.collapse
                            ? 'col-span-full bg-amber-500/10 border-amber-500/30 text-center'
                            : 'bg-purple-500/10 border-purple-500/20'
                        }`}>
                          <div className={`flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest mb-1 ${aiSetup.collapse ? 'text-amber-300' : 'text-purple-300'}`}>
                            <TrendingUp className="w-3 h-3" /> {aiSetup.collapse ? 'Wait & See' : 'Entry'}
                          </div>
                          {aiSetup.collapse ? (
                            <div className="space-y-2.5">
                              <p className="text-[10px] font-bold text-amber-300/90 leading-snug">
                                ⚠️ WAIT &amp; SEE: Momentum belum valid. Jangan paksakan entry beli — pantau reaksi harga di area support berikutnya.
                              </p>
                              {(() => {
                                const zp = aiData.zona_pantau;
                                const bottom = Number(zp?.bottom), top = Number(zp?.top);
                                if (!(Number.isFinite(bottom) && Number.isFinite(top))) return null;
                                return (
                                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 shadow-[0_0_16px_rgba(245,158,11,0.25)]">
                                    <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">🎯 Zona Pantau</span>
                                      <span className="text-sm font-black text-amber-200 tabular-nums">{fmtLevel(bottom)} – {fmtLevel(top)}</span>
                                    </div>
                                    {zp?.desc && <p className="text-[10px] text-amber-200/80 leading-snug text-center">{zp.desc}</p>}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-[10px] leading-snug">
                                <span className="text-yellow-300 font-black">⚡ Agresif:</span>{' '}
                                <span className="font-black text-white">{fmtLevel(aiSetup.agrLevel)}</span>
                                {aiData.entry?.agresif?.desc && <span className="text-slate-400"> ({aiData.entry.agresif.desc})</span>}
                              </div>
                              <div className="text-[10px] leading-snug">
                                <span className="text-emerald-300 font-black">🛡️ Area Demand:</span>{' '}
                                <span className="font-black text-white">{fmtLevel(aiSetup.demLevel)}</span>
                                {aiData.entry?.demand?.desc && <span className="text-slate-400"> ({aiData.entry.demand.desc})</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* TP & SL — level + reason (text-xs muted); disembunyikan saat crisis */}
                        {!aiSetup.collapse && (
                          <>
                            <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                              <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest text-green-300 mb-0.5"><Target className="w-3 h-3" /> TP</div>
                              <div className="text-[12px] font-black text-green-300 break-words">{fmtLevel(aiData.tp?.level)}</div>
                              {aiData.tp?.reason && <div className="text-[9px] text-slate-400/70 mt-0.5 leading-snug">{aiData.tp.reason}</div>}
                            </div>
                            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                              <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-300 mb-0.5"><AlertCircle className="w-3 h-3" /> SL</div>
                              <div className="text-[12px] font-black text-red-300 break-words">{fmtLevel(aiData.sl?.level)}</div>
                              {aiData.sl?.reason && <div className="text-[9px] text-slate-400/70 mt-0.5 leading-snug">{aiData.sl.reason}</div>}
                            </div>
                          </>
                        )}
                      </div>

                      {aiData.keyLevels && <p className="text-[11px] text-slate-400"><span className="text-purple-400 font-bold">Level: </span>{aiData.keyLevels}</p>}
                      {aiData.risk && <p className="text-[11px] text-amber-400/90"><span className="font-bold">Risiko: </span>{aiData.risk}</p>}

                      {/* Aksi: Salin / Bagikan + timestamp */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                        <div className="flex items-center gap-2">
                          <button onClick={copyAi} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/5 text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all">
                            {aiCopied ? <><CheckCircle2 className="w-3 h-3 text-green-400" /> Tersalin</> : <>📋 Salin</>}
                          </button>
                          <button onClick={shareAiTelegram} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-[10px] font-black text-[#5bc0ec] uppercase tracking-widest transition-all">
                            <Share2 className="w-3 h-3" /> Telegram
                          </button>
                        </div>
                        {aiAt && (
                          <span className="text-[9px] text-slate-600 font-mono">
                            🕒 {aiAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{aiCached ? ' • cache' : ''}
                          </span>
                        )}
                      </div>

                      {aiData.disclaimer && <p className="text-[9px] text-slate-600 pt-2 border-t border-white/5 leading-relaxed">{aiData.disclaimer}</p>}
                    </div>
                  )}
                </div>


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

                  {/* Trading Plan / RRR Card — sinkron dengan sentimen AI */}
                  {(() => {
                    const planInvalid = aiData && aiSetup.invalid; // bearish / wait & see / Entry-TP-SL N/A
                    return (
                  <div
                    className={`rounded-2xl border p-4 flex flex-col gap-2.5 ${
                      planInvalid ? "border-white/10 bg-slate-500/5" : "border-yellow-500/25 bg-yellow-500/5"
                    }`}
                    style={planInvalid ? undefined : { boxShadow: "0 0 20px rgba(234,179,8,0.08)" }}
                  >
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trading Plan</p>
                    {calcRRR ? (
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">RRR Setup</p>
                        <p
                          className={`text-xl font-black leading-tight ${planInvalid ? "text-slate-500 opacity-40" : "text-yellow-400"}`}
                          style={planInvalid ? undefined : { textShadow: "0 0 24px rgba(234,179,8,0.55)" }}
                        >
                          1 : {calcRRR}
                        </p>
                        {planInvalid ? (
                          <p className="text-[9px] font-bold text-amber-400/90 mt-1 leading-snug">
                            ⏳ Setup Tidak Valid (Menunggu Konfirmasi)
                          </p>
                        ) : (
                          <p className="text-[9px] text-slate-300 font-medium mt-1">
                            {parseFloat(calcRRR) >= 2
                              ? "✅ Setup Favorit"
                              : parseFloat(calcRRR) >= 1
                              ? "⚡ Setup Layak"
                              : "⚠️ Risk Tinggi"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-medium italic leading-snug">
                        Isi Harga Saat Ini untuk kalkulasi RRR
                      </p>
                    )}
                  </div>
                    );
                  })()}
                </div>

                {/* Kontrol lebar zona entry (berbasis rentang pivot, bisa diatur) */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lebar Zona Entry</span>
                  <input
                    type="number"
                    value={zonePct}
                    onChange={(e) => setZonePct(e.target.value)}
                    min="1" max="25" step="0.5"
                    className="w-16 bg-slate-950 border border-purple-500/30 rounded-lg px-2 py-1.5 text-sm font-black text-purple-300 text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-slate-500 font-bold">% rentang pivot (R1–S1)</span>
                  <div className="flex gap-1">
                    {[{ l: "Sempit", v: 3 }, { l: "Sedang", v: 6 }, { l: "Lebar", v: 12 }].map((p) => (
                      <button
                        key={p.v}
                        onClick={() => setZonePct(p.v)}
                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all ${Number(zonePct) === p.v ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-slate-900 border-white/10 text-slate-500 hover:text-purple-300"}`}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                  {entryZone && (
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">≈ Rp {entryZone.low.toLocaleString("id-ID")} – {entryZone.high.toLocaleString("id-ID")}</span>
                  )}
                </div>

                {/* Smart Calculator — reaktif (live), formula lot standar IDX */}
                <div className="depth-3d bg-slate-900/40 rounded-3xl border border-white/5 p-5 transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Calculator className="w-4 h-4 text-purple-500" /> Kalkulator Posisi
                    <span className="text-[8px] text-purple-400/70 normal-case tracking-normal font-bold">· live</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Modal (Rp)</label>
                      <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="cth: 10000000"
                        className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-black text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Risiko / Trade (%)</label>
                      <input type="number" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} min="0.1" max="100" step="0.5"
                        className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-black text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-purple-300/80 uppercase tracking-widest">Harga Entry <span className="text-slate-600 normal-case">(agresif)</span></label>
                      <input type="number" value={calcEntry} onChange={(e) => setCalcEntry(e.target.value)} placeholder="auto dari AI"
                        className="w-full mt-1 bg-slate-950 border border-purple-500/20 rounded-xl px-3 py-2 text-sm font-black text-purple-200 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-red-300/80 uppercase tracking-widest">Harga SL</label>
                      <input type="number" value={calcSL} onChange={(e) => setCalcSL(e.target.value)} placeholder="auto dari AI"
                        className="w-full mt-1 bg-slate-950 border border-red-500/20 rounded-xl px-3 py-2 text-sm font-black text-red-300 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500" />
                    </div>
                  </div>
                  {(() => {
                    const fmt = (n) => Math.round(n).toLocaleString("id-ID");
                    const modal = parseFloat(capital);
                    const rPct = Math.max(0.1, Math.min(100, parseFloat(riskPct) || 2));
                    const entry = parseFloat(calcEntry);
                    const sl = parseFloat(calcSL);
                    if (!(modal > 0))
                      return <p className="text-[11px] text-slate-500 leading-relaxed">Isi <b className="text-slate-300">Modal</b> untuk menghitung posisi. Entry &amp; SL terisi otomatis dari analisa AI.</p>;
                    if (!(Number.isFinite(entry) && Number.isFinite(sl)))
                      return <p className="text-[11px] text-amber-400/90 leading-relaxed">⚠️ Lengkapi Harga Entry &amp; SL (jalankan Analisa AI atau isi manual).</p>;
                    const jarakSL = Math.abs(entry - sl);
                    if (!(jarakSL > 0))
                      return <p className="text-[11px] text-amber-400/90 leading-relaxed">⚠️ Jarak Entry↔SL = 0. Beda-kan harga Entry dan SL.</p>;
                    const nominalRisiko = modal * (rPct / 100);
                    const lot = Math.floor(nominalRisiko / (jarakSL * 100));
                    const shares = lot * 100;
                    const posValue = shares * entry;
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-center">
                            <div className="text-[8px] font-black text-red-300 uppercase tracking-widest mb-0.5">Maksimal Risiko</div>
                            <div className="text-base font-black text-red-400" style={{ textShadow: "0 0 14px rgba(239,68,68,0.5)" }}>Rp {fmt(nominalRisiko)}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/25 text-center">
                            <div className="text-[8px] font-black text-green-300 uppercase tracking-widest mb-0.5">Rekomendasi Posisi</div>
                            <div className="text-lg font-black text-green-400 leading-none" style={{ textShadow: "0 0 16px rgba(34,197,94,0.55)" }}>
                              {lot < 1 ? "0" : fmt(lot)} <span className="text-[10px] text-green-300/70">Lot</span>
                            </div>
                          </div>
                        </div>
                        {lot < 1 ? (
                          <p className="text-[10px] text-amber-400/90 leading-relaxed">⚠️ Modal/risiko terlalu kecil untuk 1 lot pada jarak SL ini. Naikkan modal atau % risiko.</p>
                        ) : (
                          <p className="text-[9px] text-slate-500 leading-relaxed">≈ {fmt(shares)} lembar · Nilai posisi <span className="text-slate-300">Rp {fmt(posValue)}</span> · Risiko {fmt(jarakSL)}/lembar</p>
                        )}
                      </div>
                    );
                  })()}
                  <p className="text-[9px] text-slate-600 mt-3 pt-2 border-t border-white/5 leading-relaxed">1 lot = 100 lembar. Rumus: Lot = ⌊(Modal × Risiko%) ÷ (|Entry−SL| × 100)⌋. Entry &amp; SL auto dari AI, bisa diubah manual.</p>
                </div>

                {/* Level Kunci (Confluence Matrix) + News & Sentiment — mengisi ruang kartu lama */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEVEL KUNCI (CONFLUENCE MATRIX) */}
                  <div className="depth-3d bg-slate-900/40 rounded-3xl border border-white/5 p-5 transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Table className="w-4 h-4 text-purple-500" /> Level Kunci
                      <span className="text-[8px] text-slate-500 normal-case tracking-normal font-bold">Confluence Matrix</span>
                    </h3>
                    <div className="flex flex-col divide-y divide-white/5">
                      {[
                        { l: "Resistance 2 (R2)", v: result.R2, c: "text-orange-400" },
                        { l: "Resistance 1 (R1)", v: result.R1, c: "text-orange-400" },
                        { l: "Pivot Point", v: result.PP, c: "text-purple-300" },
                        { l: "Support 1 (S1)", v: result.S1, c: "text-green-400" },
                        { l: "Support 2 (S2)", v: result.S2, c: "text-green-400" },
                        { l: "Harga MA20", v: parseFloat(ma20Price), c: "text-amber-400" },
                      ].map((row) => (
                        <div key={row.l} className="flex items-center justify-between py-2.5 px-1 rounded group hover:bg-white/5 transition-all">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{row.l}</span>
                          <span className={`text-sm font-black tabular-nums transition-all group-hover:scale-105 ${row.c}`}>
                            {Number.isFinite(row.v) && row.v > 0 ? fmt(row.v) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-600 mt-3 pt-2 border-t border-white/5 leading-relaxed">Level acuan teknikal utama untuk konfirmasi entry/exit.</p>
                  </div>

                  {/* NEWS & SENTIMENT ANALYZER (mock — sambungkan Supabase via /api/market-sentiment) */}
                  <NewsSentimentAnalyzer ticker={stockCode} limit={3} />
                </div>

                {/* Banner "TradingStars AI Signal" & kartu "Daily Sentiment" dihapus —
                    sinyal kini terkonsolidasi di kartu Analisa AI + Trend Confluence. */}

                {/* Panel Analisis VCP & Multi-Timeframe Trend */}
                {vcpData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 w-full">
                    <VcpIndicator data={vcpData} />
                    <TrendConfluence data={vcpData} />
                  </div>
                ) : (
                  <div className="w-full h-24 animate-pulse bg-purple-900/20 rounded-xl border border-purple-500/20 flex items-center justify-center my-6">
                    <p className="text-purple-400/50 text-sm">Memuat data analitik lanjutan...</p>
                  </div>
                )}

                <ErrorBoundary>
                  <TradingChart
                    ohlc={{ open, high, low, close, volume }}
                    levels={result}
                    pattern={pattern}
                    stockCode={stockCode}
                    signalText={(() => {
                      const cp = parseFloat(currentPrice || close);
                      if (!result || isNaN(cp)) return null;
                      const volatility = (result.R3 - result.S3) / result.S3;
                      if (cp >= result.R2 * 0.99) return "WAIT & SEE: Take Profit";
                      if (volatility > 0.1) return "WAIT & SEE: High Volatility";
                      return cp > result.PP ? "Bullish Bias" : "Bearish Bias";
                    })()}
                  />
                </ErrorBoundary>

                {/* â•â• PIVOT LADDER with Demand / Supply Zones â•â•â•â•â•â•â•â•â•â•â•â• */}
                <div className="depth-3d bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
                  {/* Header */}
                  <div className="bg-slate-900/60 px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                      <Table className="w-4 h-4 text-purple-500" /> Pivot Ladder
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[9px] font-black text-slate-300 uppercase">Premium</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-[9px] font-black text-slate-300 uppercase">Discount</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid 2 zona + PP di tengah */}
                  <div className="relative grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 p-5 items-center overflow-hidden">
                    {/* Watermark zona (samar) */}
                    <span className="pointer-events-none select-none absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-2xl sm:text-4xl font-black uppercase tracking-widest text-red-500/[0.06] whitespace-nowrap">Premium Zone</span>
                    <span className="pointer-events-none select-none absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-2xl sm:text-4xl font-black uppercase tracking-widest text-green-500/[0.06] whitespace-nowrap">Discount Zone</span>

                    {/* PREMIUM (kiri): R3, R2, Zona Supply, R1 */}
                    <div className="relative z-10 flex flex-col gap-2">
                      <PivotCell label="R3" value={result.R3} tone="supply" />
                      <PivotCell label="R2" value={result.R2} tone="supply" />
                      <ZoneTag text="Zona Supply" tone="red" />
                      <PivotCell label="R1" value={result.R1} tone="supply" />
                    </div>

                    {/* PP (tengah) */}
                    <div className="relative z-10 flex flex-col items-center justify-center px-1">
                      <div className="px-3 sm:px-4 py-3 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-center shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                        <div className="text-[10px] font-black text-purple-300 uppercase tracking-widest">PP</div>
                        <div className="text-base sm:text-lg font-black text-purple-100 tabular-nums leading-none mt-1">{fmt(result.PP)}</div>
                      </div>
                      <div className="w-px h-3 bg-purple-500/30 my-1" />
                      <span className="text-[8px] font-black text-purple-300/60 uppercase tracking-widest">Pivot</span>
                    </div>

                    {/* DISCOUNT (kanan): S1, Zona Demand, S2, S3 */}
                    <div className="relative z-10 flex flex-col gap-2">
                      <PivotCell label="S1" value={result.S1} tone="demand" />
                      <ZoneTag text="Zona Demand" tone="green" />
                      <PivotCell label="S2" value={result.S2} tone="demand" />
                      <PivotCell label="S3" value={result.S3} tone="demand" />
                    </div>
                  </div>
                </div>

                {/* -- SMART MONEY FOOTPRINT (SMC / VPA) ----------------- */}
                <div className="depth-3d bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-3xl border border-purple-500/20">
                  <h3 className="text-sm font-black text-purple-400 uppercase mb-5 tracking-tighter flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Smart Money Footprint
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {(() => {
                      const cp = parseFloat(currentPrice || close);
                      const isBull = cp > result.PP;
                      const volStrong = volume && ma20Volume && parseFloat(volume) > parseFloat(ma20Volume);
                      const smcText = isBull ? "Bullish BOS Detected" : "Bearish BOS Detected";
                      const vpaText = volStrong ? (isBull ? "High Accumulation Zone" : "Distribution Pressure") : "Balanced Volume";
                      const vpaColor = volStrong ? (isBull ? "text-green-400" : "text-red-400") : "text-slate-300";
                      return (
                        <>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">SMC Structure</p>
                            <p className="text-base font-black text-amber-400 leading-tight">{smcText}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">VPA Volume Profile</p>
                            <p className={`text-base font-black leading-tight ${vpaColor}`}>{vpaText}</p>
                          </div>
                          <div className="space-y-1 col-span-2 sm:col-span-1">
                            <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">Key Zone Density</p>
                            <p className="text-base font-black text-purple-400 leading-tight">Order Block Cluster @ {fmt(result.PP)}</p>
                          </div>
                        </>
                      );
                    })()}
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
              <div className="grid grid-cols-2 gap-3 mt-4 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                <button
                  onClick={handleCopyText}
                  className="w-full bg-slate-900 hover:bg-purple-500/10 border border-purple-500/50 text-purple-400 rounded-2xl py-3.5 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-900/10 active:scale-95"
                >
                  <Share2 className="w-4 h-4" /> Copy Teks
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="w-full bg-purple-600 hover:bg-purple-500 border border-purple-400/50 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-500/30 active:scale-95"
                >
                  <ImageIcon className="w-4 h-4" /> Save Image
                </button>
              </div>
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

        {/* ══ AVERAGE TAB ═══════════════════════════════════════════════════════════════════════ */}
        {tab === "average" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-700 space-y-4">
            <div className="bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_40px_rgba(168,85,247,0.05)] text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 mb-8 max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
                  <Calculator className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 uppercase tracking-widest leading-tight">
                  KALKULATOR DOWN AVG
                </h2>
                <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-2 px-4 shadow-sm border border-purple-500/20 bg-purple-500/10 rounded-full inline-block py-1">
                  Hitung Average Baru Otomatis
                </p>
              </div>

              {/* DYNAMIC SLOTS */}
              <div className="relative z-10 text-left mb-6">
                <div className="max-h-[35vh] overflow-y-auto pr-2 space-y-4 mb-4 custom-scrollbar">
                  {avgSlots.map((slot, index) => (
                    <div key={slot.id} className="flex gap-3 items-end">
                      <div className="flex-[4] space-y-2">
                        <label className="text-[10px] font-black text-purple-400/80 uppercase ml-2 flex items-center gap-1">
                          {index === 0 ? "Avg Sekarang" : `Harga Beli ${index + 1}`}
                        </label>
                        <input type="number" 
                           value={slot.harga}
                           onChange={(e) => {
                              const newSlots = [...avgSlots];
                              newSlots[index].harga = e.target.value;
                              setAvgSlots(newSlots);
                           }}
                           placeholder="Contoh: 1500"
                           className="w-full bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div className="flex-[4] space-y-2">
                        <label className="text-[10px] font-black text-purple-400/80 uppercase ml-2 flex items-center gap-1">
                          {index === 0 ? "Lot Sekarang" : `Lot Beli ${index + 1}`}
                        </label>
                        <input type="number" 
                           value={slot.lot}
                           onChange={(e) => {
                              const newSlots = [...avgSlots];
                              newSlots[index].lot = e.target.value;
                              setAvgSlots(newSlots);
                           }}
                           placeholder="Contoh: 100"
                           className="w-full bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      {index === 0 ? (
                        <div className="flex-[1] h-[46px]"></div>
                      ) : (
                        <div className="flex-[1] h-[46px] flex items-center justify-center">
                          <button
                             onClick={() => {
                                setAvgSlots(avgSlots.filter(s => s.id !== slot.id));
                             }}
                             className="w-full h-full max-w-[46px] flex items-center justify-center text-red-400/70 hover:text-white bg-red-500/10 hover:bg-red-500/40 rounded-xl transition-all border border-red-500/20 hover:border-red-500"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <button 
                   onClick={() => {
                     setAvgSlots([...avgSlots, { id: Date.now(), harga: "", lot: "" }]);
                   }}
                   className="w-full py-3.5 rounded-xl border border-dashed border-purple-500/50 text-purple-400 font-bold text-[10px] uppercase tracking-widest hover:bg-purple-500/10 hover:border-purple-400 transition-all flex items-center justify-center gap-2"
                >
                    <span className="text-[14px] font-black leading-none pb-[2px]">+</span> Tambah Harga
                </button>
              </div>

              {/* LIVE RESULTS */}
              <div className="relative z-10 bg-slate-950/80 p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Lot Akhir</p>
                  <p className="text-sm font-black text-slate-100">{fmt(newTotalLot)} <span className="text-[10px] text-slate-500">Lot</span></p>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Modal (Rp)</p>
                  <p className="text-sm font-black text-green-400">{fmt(totalModalValue * 100)}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm font-black text-purple-400 uppercase tracking-widest">NEW AVERAGE</p>
                  <p className="text-2xl font-black text-purple-500" style={{ textShadow: "0 0 20px rgba(168,85,247,0.3)" }}>
                    {fmt(Math.round(newAverage))}
                  </p>
                </div>
              </div>
            </div>
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

      {/* HIDDEN EXPORT CARD */}
      {result && isClient && (() => {
        const cp = parseFloat(currentPrice) || parseFloat(close) || result.PP || 1;
        return (
          <div className="absolute -left-[9999px] top-0 pointer-events-none">
            <div id="share-export-card" className="w-[400px] bg-[#09090b] border-[3px] border-purple-500/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(168,85,247,0.2)] flex flex-col items-center">
               {/* TS Logo & Header */}
               <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-[2px] shadow-lg shadow-purple-500/30 mb-4">
                 <div className="w-full h-full bg-[#09090b] rounded-[14px] flex items-center justify-center">
                   <span className="text-3xl font-black text-purple-400">TS</span>
                 </div>
               </div>
               <h2 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase">{stockCode || "IHSG"}</h2>
               <div className="bg-purple-500/20 px-5 py-2 rounded-full border border-purple-500/30 mb-8">
                 <p className="text-purple-300 text-xs font-black uppercase tracking-widest">Pivot Strategy Plan</p>
               </div>

               {/* Data Area */}
               <div className="w-full space-y-3 mb-10">
                 <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                   <div>
                     <p className="text-[#a1a1aa] text-[10px] font-black uppercase tracking-widest mb-1.5">Target Price 2 (R2)</p>
                     <p className="text-white text-2xl font-black">{fmt(result.R2)}</p>
                   </div>
                   <div className="bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 shadow-inner">
                     <p className="text-green-400 text-sm font-black text-right">
                       +{(((result.R2 - cp) / cp) * 100).toFixed(2)}%
                     </p>
                   </div>
                 </div>

                 <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                   <div>
                     <p className="text-[#a1a1aa] text-[10px] font-black uppercase tracking-widest mb-1.5">Target Price 1 (R1)</p>
                     <p className="text-white text-2xl font-black">{fmt(result.R1)}</p>
                   </div>
                   <div className="bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 shadow-inner">
                     <p className="text-green-400 text-sm font-black text-right">
                       +{(((result.R1 - cp) / cp) * 100).toFixed(2)}%
                     </p>
                   </div>
                 </div>

                 <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                   <div>
                     <p className="text-[#a1a1aa] text-[10px] font-black uppercase tracking-widest mb-1.5">Stop Loss (S1)</p>
                     <p className="text-white text-2xl font-black">{fmt(result.S1)}</p>
                   </div>
                   <div className="bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 shadow-inner">
                     <p className="text-red-400 text-sm font-black text-right">
                       -{(((cp - result.S1) / cp) * 100).toFixed(2)}%
                     </p>
                   </div>
                 </div>
               </div>

               {/* Watermark */}
               <div className="w-full text-center border-t border-white/10 pt-5">
                 <p className="text-[#71717a] text-[10px] font-bold uppercase tracking-[0.2em]">Generated by Trading Stars</p>
               </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}


