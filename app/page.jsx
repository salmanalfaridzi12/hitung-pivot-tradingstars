"use client";
import React, { useState, useRef, useEffect, memo } from "react";
import StoryExportCard from "../components/StoryExportCard";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function useAnimatedNumber(target, duration = 900) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target == null) { setVal(0); return; }
    const start = Date.now(), from = 0;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.round(from + (target - from) * easeOutCubic(p)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]); // ✅ FIX 1: tambah 'duration' ke dependency array
  return val;
}

function AnimNum({ value, fmt }) {
  const animated = useAnimatedNumber(value);
  return <>{fmt(animated)}</>;
}

const Particles = memo(({ dark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const obs = new ResizeObserver(resize); obs.observe(canvas);
    const pts = Array.from({ length: 35 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3, dx: (Math.random() - 0.5) * 0.22, dy: (Math.random() - 0.5) * 0.22,
      o: Math.random() * 0.3 + 0.06,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark ? `rgba(139,92,246,${p.o})` : `rgba(37,99,235,${p.o * 0.5})`; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 75) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = dark ? `rgba(139,92,246,${0.05*(1-d/75)})` : `rgba(37,99,235,${0.03*(1-d/75)})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [dark]);
  return <canvas ref={canvasRef} style={{ position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0 }} />;
});

const HeatmapBg = memo(({ levels, currentPrice, dark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !levels.length) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const cp = parseFloat(currentPrice);
    const max = levels[0].value, min = levels[levels.length-1].value, range = max - min || 1;
    levels.forEach(({ value, color }) => {
      const yPct = 1 - (value - min) / range, y = yPct * canvas.height;
      const grad = ctx.createLinearGradient(0, y-18, 0, y+18);
      grad.addColorStop(0, "transparent"); grad.addColorStop(0.5, `${color}18`); grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad; ctx.fillRect(0, y-18, canvas.width, 36);
    });
    if (!isNaN(cp)) {
      const yPct = 1 - (cp - min) / range, y = Math.max(1, Math.min(canvas.height-1, yPct*canvas.height));
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
      ctx.strokeStyle = "rgba(245,158,11,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
    }
  }, [levels, currentPrice, dark]);
  return <canvas ref={canvasRef} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",borderRadius:"16px" }} />;
});

function getSession() {
  const d = new Date();
  const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false };
  const hText = d.toLocaleString('en-US', options);
  const h = parseInt(hText, 10);
  const open = h >= 9 && h < 16;
  return {name:"Jakarta (WIB)",color:"#8b5cf6",bg:"rgba(139,92,246,0.15)",dot:"#8b5cf6",open:open};
}


function GlowCard({ children, dark, style={}, className="" }) {
  const ref = useRef(null);
  const handleMove = (e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    el.style.setProperty("--gx", `${x}px`);
    el.style.setProperty("--gy", `${y}px`);
    el.style.setProperty("--go", "1");
  };
  const handleLeave = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty("--go", "0");
  };
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchEnd={handleLeave}
      style={{
        ...style,
        position: "relative",
        "--gx": "50%",
        "--gy": "50%",
        "--go": "0",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(160px circle at var(--gx) var(--gy), ${dark ? "rgba(139,92,246,0.18)" : "rgba(37,99,235,0.12)"} 0%, transparent 70%)`,
        opacity: "var(--go)", transition: "opacity 0.3s ease",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}


const Speedometer = memo(({ value, setValue, dark, t }) => {
  const getCol = (v) => v < 20 ? "#dc2626" : v < 40 ? "#ea580c" : v < 60 ? "#f59e0b" : v < 80 ? "#84cc16" : "#22c55e";
  const getLabel = (v) => v < 20 ? "EXTREME FEAR" : v < 40 ? "FEAR" : v < 60 ? "NEUTRAL" : v < 80 ? "GREED" : "EXTREME GREED";
  const col = getCol(value);
  const label = getLabel(value);
  const rot = (value / 100) * 180 - 90;
  
  return (
    <div style={{ background: t.cardInner, borderRadius: "12px", padding: "14px", border: `1px solid ${col}40`, marginBottom: "14px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: `0 4px 20px ${col}15`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "-50%", background: `radial-gradient(circle at top, ${col}20 0%, transparent 70%)` }} />
      <span style={{ fontSize: "10px", fontWeight: "800", color: t.sub, letterSpacing: "1px", marginBottom: "12px", zIndex: 1 }}>MARKET SENTIMENT</span>
      
      <div style={{ position: "relative", width: "160px", height: "80px", overflow: "hidden", zIndex: 1 }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "160px", height: "160px", borderRadius: "50%", border: `14px solid ${dark ? "#1e293b" : "#e2e8f0"}`, borderBottomColor: "transparent", borderRightColor: "transparent", transform: "rotate(45deg)", boxSizing: "border-box" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: "160px", height: "160px", borderRadius: "50%", border: `14px solid ${col}`, borderBottomColor: "transparent", borderRightColor: "transparent", transform: `rotate(${rot + 45}deg)`, transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s", boxSizing: "border-box", filter: `drop-shadow(0 0 8px ${col})` }} />
        
        <div style={{ position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)", width: "16px", height: "16px", background: dark ? "#333" : "#fff", borderRadius: "50%", border: `4px solid ${col}`, zIndex: 2, boxShadow: `0 0 10px ${col}` }} />
        <div style={{ position: "absolute", bottom: "8px", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${rot}deg)`, width: "4px", height: "60px", background: `linear-gradient(to top, transparent, ${col})`, borderRadius: "4px", transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)", zIndex: 1 }} />
      </div>
      
      <div style={{ fontSize: "14px", fontWeight: "900", color: col, marginTop: "8px", textShadow: `0 0 12px ${col}80`, zIndex: 1 }}>{label}</div>
      
      <input type="range" min="0" max="100" value={value} onChange={e => setValue(parseInt(e.target.value))} style={{ width: "100%", marginTop: "12px", zIndex: 1, accentColor: col }} />
      <span style={{ fontSize: "8px", color: t.sub, marginTop: "4px", zIndex: 1 }}>Gunakan slider untuk set manual</span>
    </div>
  );
});

function LiveToast({ pulse, dark }) {
  if (!pulse) return null;
  return (
    <div style={{ position: "fixed", bottom: "20px", left: "20px", zIndex: 9999, background: dark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", border: `1px solid ${dark ? "rgba(139,92,246,0.3)" : "rgba(59,130,246,0.3)"}`, borderRadius: "12px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: dark ? "0 8px 32px rgba(139,92,246,0.2)" : "0 8px 32px rgba(59,130,246,0.2)", animation: "toastSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", animation: "pulseBadge 1.5s infinite" }} />
      <span style={{ fontSize: "11px", fontWeight: "700", color: dark ? "#f8fafc" : "#0f172a" }}>{pulse}</span>
    </div>
  );
}

function CardTransitionMode({ active, dark }) {
  if (!active) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", animation: "fadeInC 0.2s" }}>
      <div style={{ width: "240px", height: "340px", background: `linear-gradient(135deg, ${dark?"#1e1b4b":"#818cf8"}, ${dark?"#0f172a":"#3b82f6"})`, borderRadius: "16px", border: "2px solid #8b5cf6", boxShadow: "0 0 50px rgba(139,92,246,0.6)", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", animation: "holoCard 1.2s forwards cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🌟</div>
        <div style={{ fontSize: "16px", fontWeight: "900", color: "#fff", textAlign: "center", letterSpacing: "2px" }}>TRADING STARS</div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginTop: "8px", textAlign: "center", fontWeight: "600" }}>Mengemas Analisa...</div>
        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "2px", marginTop: "24px", overflow: "hidden" }}>
          <div style={{ width: "100%", height: "100%", background: "#fff", animation: "progressLine 0.8s ease-in-out forwards" }} />
        </div>
      </div>
    </div>
  );
}

function FadeIn({ children, delay=0, style={} }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity="0"; el.style.transform="translateY(30px)";
    const t = setTimeout(() => {
      el.style.transition=`opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`;
      el.style.opacity="1"; el.style.transform="translateY(0)";
    }, 30);
    return () => clearTimeout(t);
  }, [delay]);
  return <div ref={ref} style={style}>{children}</div>;
}




function ConfettiBurst({ particles }) {
  if (!particles.length) return null;
  return (
    <div style={{ position:"fixed", top:"50%", left:"50%", pointerEvents:"none", zIndex:9999 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute", width:p.size+"px", height:p.size+"px",
          background:p.color, borderRadius: p.id%3===0?"50%":"2px",
          transform:"translate(-50%,-50%)",
          animation:`confetti-fly ${p.dur}s cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
          "--cx":`${p.x}px`, "--cy":`${p.y}px`, "--cr":`${p.rot}deg`,
        }} />
      ))}
    </div>
  );
}

function SpringBtn({ onClick, style, children }) {
  const ref = useRef(null);
  const handleClick = (e) => {
    const el = ref.current; if (!el) return;
    el.style.transform = "scale(0.94)";
    setTimeout(() => {
      el.style.transform = "scale(1.05)";
      setTimeout(() => { el.style.transform = "scale(1)"; }, 160);
    }, 90);
    onClick && onClick(e);
  };
  return (
    <button ref={ref} onClick={handleClick} style={{ ...style, transform: "scale(1)", transition: (style?.transition || "") + ", transform 0.15s" }}>
      {children}
    </button>
  );
}

function useSpringButton() {
  const ref = useRef(null);
  const press = () => {
    const el = ref.current; if (!el) return;
    el.style.transform = "scale(0.93)";
    el.style.transition = "transform 0.1s ease";
    setTimeout(() => {
      el.style.transform = "scale(1.04)";
      el.style.transition = "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)";
      setTimeout(() => {
        el.style.transform = "scale(1)";
        el.style.transition = "transform 0.2s ease";
      }, 180);
    }, 100);
  };
  return { ref, press };
}

const Clock = memo(({ dark }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return <span style={{ fontSize:"11px",fontWeight:700,color: dark ? "#94a3b8" : "#475569" }}>{time.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</span>;
});

function getMarketStatus() {
  const d = new Date();
  const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
  const str = d.toLocaleString('en-US', options);
  const parts = str.split(':');
  if (parts.length < 2) return "🟢 MARKET OPEN (Sesi 1) - Happy Cuan Stars! 🚀";
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const time = h * 60 + m;

  if (time >= 540 && time <= 720) return "🟢 MARKET OPEN (Sesi 1) - Happy Cuan Stars! 🚀";
  if (time >= 810 && time <= 960) return "🟢 MARKET OPEN (Sesi 2) - Pantau Bandar Power! 🐋";
  return "🔴 MARKET CLOSED - Siapkan Analisa Besok! 📈";
}

function SlideIn({ children, delay=0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity="0"; el.style.transform="translateX(-10px)";
    const t = setTimeout(() => {
      el.style.transition=`opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`;
      el.style.opacity="1"; el.style.transform="translateX(0)";
    }, 30);
    return () => clearTimeout(t);
  }, [delay, children]);
  return <div ref={ref}>{children}</div>;
}


const QUOTES = [
  "\"Disiplin adalah jembatan antara tujuan dan pencapaian.\" — Jim Rohn",
  "\"Pasar tidak peduli kamu butuh keuntungan. Ikuti sistem.\" — Ed Seykota",
  "\"Trader terbaik bukan yang paling sering menang, tapi yang ruginya paling kecil saat salah.\" — Paul Tudor Jones",
  "\"Sabar adalah senjata paling rahasia di pasar modal.\" — Jesse Livermore",
  "\"Setiap analisa yang baik adalah modal masa depan.\" — TradingStars",
  "\"Risk management adalah fondasi profit yang berkelanjutan.\" — Warren Buffett",
  "\"Kenali sahammu seperti kamu mengenal dirimu sendiri.\" — Peter Lynch",
  "\"Jangan trading karena bosan. Trading karena ada setup yang valid.\" — TradingStars",
];

const StoryJournal = memo(({ history, dark, t, onRecall }) => {
  const today = new Date().toLocaleDateString("id-ID");
  const todayEntries = history.filter(h => h.date === today);
  const uniqueStocks = [...new Set(todayEntries.map(h => h.stockCode).filter(Boolean).filter(s => s !== "—"))];
  const mostAnalyzed = uniqueStocks.length > 0
    ? uniqueStocks.reduce((a, b) =>
        todayEntries.filter(h=>h.stockCode===a).length >= todayEntries.filter(h=>h.stockCode===b).length ? a : b
      )
    : null;
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const totalDays = [...new Set(history.map(h=>h.date))].length;

  const cardBg = dark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.7)";
  const border = dark ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.5)";

  return (
    <div>
      <div style={{ background:cardBg, backdropFilter:"blur(12px)", border:`1px solid ${border}`, borderRadius:"16px", padding:"20px", marginBottom:"12px" }}>
        <div style={{ fontSize:"10px", fontWeight:800, letterSpacing:"1.5px", color:dark?"#a5b4fc":"#6d28d9", marginBottom:"14px" }}>📖 TRADING JOURNAL HARI INI</div>

        {todayEntries.length === 0 ? (
          <div style={{ textAlign:"center", padding:"20px 0", color:t.sub, fontSize:"13px" }}>
            Belum ada analisa hari ini.<br/>Yuk mulai analisa sahammu! 🚀
          </div>
        ) : (
          <>
            <div style={{ background:dark?"rgba(139,92,246,0.1)":"rgba(109,40,217,0.06)", border:`1px solid ${dark?"rgba(139,92,246,0.2)":"rgba(109,40,217,0.1)"}`, borderRadius:"12px", padding:"14px 16px", marginBottom:"14px" }}>
              <div style={{ fontSize:"13px", color:t.text, lineHeight:1.7 }}>
                Hari ini kamu sudah menganalisa <span style={{ fontWeight:800, color:dark?"#a5b4fc":"#6d28d9" }}>{todayEntries.length} saham</span>.
                {uniqueStocks.length > 0 && (
                  <> Kode yang dianalisa: <span style={{ fontWeight:800, color:dark?"#34d399":"#059669" }}>{uniqueStocks.map(s=>`$${s}`).join(", ")}</span>.</>
                )}
                {mostAnalyzed && todayEntries.filter(h=>h.stockCode===mostAnalyzed).length > 1 && (
                  <> Saham yang paling sering kamu pantau adalah <span style={{ fontWeight:800, color:dark?"#fbbf24":"#d97706" }}>${mostAnalyzed}</span>.</>
                )}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"14px" }}>
              {[
                ["📊 Analisa Hari Ini", `${todayEntries.length}x`, "#6d28d9"],
                ["📅 Total Hari", `${totalDays} hari`, "#0891b2"],
                ["🏷️ Saham Unik", `${uniqueStocks.length} emiten`, "#16a34a"],
                ["💾 Total Tersimpan", `${history.length}/20`, "#f59e0b"],
              ].map(([label, val, color])=>(
                <div key={label} style={{ background:t.cardInner??dark?"rgba(15,23,42,0.6)":"rgba(241,245,249,0.7)", border:`1px solid ${border}`, borderRadius:"10px", padding:"10px 12px" }}>
                  <div style={{ fontSize:"9px", color:t.sub, marginBottom:"3px" }}>{label}</div>
                  <div style={{ fontSize:"16px", fontWeight:900, color }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ background:dark?"rgba(245,158,11,0.08)":"rgba(245,158,11,0.06)", border:`1px solid ${dark?"rgba(245,158,11,0.25)":"rgba(245,158,11,0.2)"}`, borderRadius:"10px", padding:"12px 14px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, color:"#f59e0b", marginBottom:"5px", letterSpacing:"1px" }}>💡 QUOTE OF THE DAY</div>
          <div style={{ fontSize:"11px", color:t.text, lineHeight:1.6, fontStyle:"italic" }}>{quote}</div>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ background:cardBg, backdropFilter:"blur(12px)", border:`1px solid ${border}`, borderRadius:"16px", padding:"16px" }}>
          <div style={{ marginBottom:"12px" }}>
            <div style={{ fontSize:"10px", fontWeight:800, letterSpacing:"1.5px", color:dark?"#a5b4fc":"#6d28d9" }}>📈 REKAM JEJAK TERAKHIR</div>
            <div style={{ fontSize:"9px", color:t.sub, marginTop:"2px" }}>Klik untuk lihat analisa lagi ↩</div>
          </div>
          {history.slice(0,5).map((h,i)=>(
            <div key={i}
              onClick={()=>onRecall && onRecall(h)}
              onMouseEnter={e=>{ e.currentTarget.style.background=dark?"rgba(99,102,241,0.1)":"rgba(37,99,235,0.05)"; e.currentTarget.style.transform="translateX(4px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="translateX(0)"; }}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 10px", borderRadius:"10px", borderBottom: i<4&&i<history.length-1?`1px solid ${border}`:"none", cursor:"pointer", transition:"background 0.2s, transform 0.2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"34px", height:"34px", borderRadius:"10px", background:dark?"rgba(99,102,241,0.25)":"rgba(99,102,241,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:800, color:dark?"#a5b4fc":"#6d28d9", letterSpacing:"-0.5px", flexShrink:0 }}>{h.stockCode?h.stockCode.slice(0,4):"IDX"}</div>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:700, color:t.text }}>{h.stockCode||"—"}</div>
                  <div style={{ fontSize:"9px", color:t.sub }}>{h.date} · {h.time}</div>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:"9px", color:t.sub }}>Pivot</div>
                <div style={{ fontSize:"13px", fontWeight:700, color:dark?"#60a5fa":"#2563eb" }}>{h.pivot?.toLocaleString("id-ID")}</div>
                <div style={{ fontSize:"8px", color:dark?"#6366f1":"#7c3aed", fontWeight:600, marginTop:"1px" }}>↩ buka</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

function getPivotStrength(result) {
  if (!result) return null;
  const rangeTotal = result.r3 - result.s3 || 1;
  const r1r2Gap = result.r2 - result.r1;
  const s1s2Gap = result.s1 - result.s2;
  const pivotZone = result.r1 - result.s1;
  const strength = Math.min(100, Math.round((pivotZone / rangeTotal) * 300));
  const label = strength >= 70 ? "Kuat 💪" : strength >= 40 ? "Sedang ⚡" : "Lemah 📉";
  const color = strength >= 70 ? "#16a34a" : strength >= 40 ? "#f59e0b" : "#dc2626";
  return { strength, label, color, r1r2Gap, s1s2Gap, pivotZone };
}




function TrendArrow({ result, currentPrice, t, dark }) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const pctFromPP = ((cp - result.pivot) / result.pivot) * 100;

  let arrows, trendLabel, trendColor, trendBg, trendBorder, desc;
  if (cp > result.r2)      { arrows="↑↑↑"; trendLabel="UPTREND KUAT";    trendColor="#15803d"; trendBg=dark?"#14532d":"#dcfce7"; trendBorder="#86efac"; desc="Harga jauh di atas pivot, momentum bullish sangat kuat"; }
  else if (cp > result.r1) { arrows="↑↑";  trendLabel="UPTREND";          trendColor="#22c55e"; trendBg=dark?"#166534":"#f0fdf4"; trendBorder="#bbf7d0"; desc="Harga di atas R1, trend naik masih berlanjut"; }
  else if (cp > result.pivot) { arrows="↗"; trendLabel="CENDERUNG NAIK";  trendColor="#84cc16"; trendBg=dark?"#365314":"#f7fee7"; trendBorder="#bef264"; desc="Harga di atas pivot, bias bullish lemah"; }
  else if (cp > result.s1) { arrows="↘";   trendLabel="CENDERUNG TURUN";  trendColor="#f59e0b"; trendBg=dark?"#78350f":"#fffbeb"; trendBorder="#fde68a"; desc="Harga di bawah pivot, tekanan jual mulai muncul"; }
  else if (cp > result.s2) { arrows="↓↓";  trendLabel="DOWNTREND";        trendColor="#f97316"; trendBg=dark?"#7c2d12":"#fff7ed"; trendBorder="#fed7aa"; desc="Harga di bawah S1, trend turun sedang berlanjut"; }
  else                     { arrows="↓↓↓"; trendLabel="DOWNTREND KUAT";   trendColor="#dc2626"; trendBg=dark?"#7f1d1d":"#fef2f2"; trendBorder="#fecaca"; desc="Harga jauh di bawah pivot, tekanan jual sangat kuat"; }

  const barPct = Math.min(100, Math.max(0, Math.round(((cp - result.s3) / (result.r3 - result.s3)) * 100)));

  return (
    <div style={{ background:trendBg,border:`1px solid ${trendBorder}`,borderRadius:"12px",padding:"14px 16px",marginBottom:"12px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px" }}>
        <div>
          <div style={{ fontSize:"10px",color:trendColor,fontWeight:700,letterSpacing:"1px",marginBottom:"3px" }}>TREND DIRECTION</div>
          <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
            <span style={{ fontSize:"22px",fontWeight:900,color:trendColor,lineHeight:1 }}>{arrows}</span>
            <span style={{ fontSize:"15px",fontWeight:900,color:trendColor }}>{trendLabel}</span>
          </div>
          <div style={{ fontSize:"10px",color:t.sub,marginTop:"3px",lineHeight:1.4 }}>{desc}</div>
        </div>
        <div style={{ textAlign:"right",flexShrink:0,marginLeft:"8px" }}>
          <div style={{ fontSize:"9px",color:t.sub,marginBottom:"2px" }}>POSISI</div>
          <div style={{ fontSize:"18px",fontWeight:900,color:trendColor }}>{pctFromPP > 0 ? "+" : ""}{pctFromPP.toFixed(2)}%</div>
          <div style={{ fontSize:"9px",color:t.sub }}>dari PP</div>
        </div>
      </div>
      <div style={{ marginTop:"4px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
          <span style={{ fontSize:"9px",color:"#7c3aed" }}>S3</span>
          <span style={{ fontSize:"9px",color:t.sub }}>Posisi harga dalam range</span>
          <span style={{ fontSize:"9px",color:"#9f1239" }}>R3</span>
        </div>
        <div style={{ height:"8px",background:dark?"#1e293b":"#e2e8f0",borderRadius:"99px",overflow:"hidden",position:"relative" }}>
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,#7c3aed,#3b82f6,#22c55e,#f59e0b,#dc2626)",opacity:0.3,borderRadius:"99px" }} />
          <div style={{ position:"absolute",top:"50%",left:`${barPct}%`,transform:"translate(-50%,-50%)",width:"14px",height:"14px",background:trendColor,borderRadius:"50%",border:"2px solid #fff",boxShadow:`0 0 8px ${trendColor}`,transition:"left 0.5s ease",zIndex:2 }} />
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",marginTop:"3px" }}>
          <span style={{ fontSize:"8px",color:t.sub }}>Bear Zone</span>
          <span style={{ fontSize:"8px",color:t.sub }}>Neutral</span>
          <span style={{ fontSize:"8px",color:t.sub }}>Bull Zone</span>
        </div>
      </div>
    </div>
  );
}





function getBandarPower(cp, open, close, volume, ma20) {
  if (!cp || !volume || !ma20) return null;
  const c = parseFloat(cp), o = parseFloat(open), cl = parseFloat(close);
  const targetOpen = (!isNaN(o) && o > 0) ? o : (!isNaN(cl) && cl > 0) ? cl : null;
  if (!targetOpen) return null;

  const v = parseFloat(volume);
  const m = parseFloat(ma20);
  if (isNaN(v) || isNaN(m)) return null;

  const isUp = c > targetOpen;
  const isDown = c < targetOpen;
  const volRatio = v / m;

  let status = "NORMAL / NEUTRAL";
  let color = "#8b5cf6"; // ungu
  let bg = "rgba(139,92,246,0.1)";
  let border = "#c4b5fd";
  let emoji = "⚖️";

  if (volRatio > 1.3) {
    if (isUp) {
      status = "HIGH ACCUMULATION";
      color = "#16a34a"; bg = "rgba(22,163,74,0.1)"; border = "#bbf7d0";
      emoji = "🐋";
    } else if (isDown) {
      status = "HIGH DISTRIBUTION";
      color = "#dc2626"; bg = "rgba(220,38,38,0.1)"; border = "#fecaca";
      emoji = "🩸";
    }
  } else if (volRatio < 0.8) {
    status = "LOW PARTICIPATION";
    color = "#f59e0b"; bg = "rgba(245,158,11,0.1)"; border = "#fde68a";
    emoji = "💤";
  }

  return { status, color, bg, border, emoji, volRatio: volRatio.toFixed(2), isUp, isDown };
}

export default function PivotAnalyzer() {
  const [high,setHigh]=useState(""); const [low,setLow]=useState(""); const [close,setClose]=useState("");
  const [open,setOpen]=useState("");
  const [equity,setEquity]=useState(""); const [riskPct,setRiskPct]=useState("2");
  const [stockCode,setStockCode]=useState("");
  const [volume,setVolume]=useState("");
  const [ma20Volume,setMa20Volume]=useState("");
  const [currentPrice,setCurrentPrice]=useState(""); const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false); const [progress,setProgress]=useState(0);
  const [dark,setDark]=useState(true); const [copied,setCopied]=useState(false);
  const [pivotMethod,setPivotMethod]=useState("classic");
  const [confetti,setConfetti]=useState([]);
  const [shaking,setShaking]=useState(false);
  const [sentimentVal,setSentimentVal]=useState(50);
  const [livePulse,setLivePulse]=useState(null);
  const [cardTransition,setCardTransition]=useState(false);
  const [history,setHistory]=useState(()=>{ try{return JSON.parse(localStorage.getItem("pivot_history")||"[]");}catch{return[];} });

  const [tab,setTab]=useState("main");
  const [avgEntries,setAvgEntries]=useState([{price:"",lot:""},{price:"",lot:""}]);
  const [avgResult,setAvgResult]=useState(null);
  const [session]=useState(getSession());
  const [glowLevel,setGlowLevel]=useState(null);
  const [mounted,setMounted]=useState(false);
  const [fetchStatus,setFetchStatus]=useState("");

  useEffect(()=>{ 
    setMounted(true);
  },[]);

  const fmt=(n)=>n!=null?n.toLocaleString("id-ID"):"—";
  const fmtDec=(n)=>n!=null?parseFloat(n.toFixed(2)).toLocaleString("id-ID",{minimumFractionDigits:0,maximumFractionDigits:2}):"—";

  const t={
    bg:dark?"#09090b":"#ffffff", card:dark?"rgba(17,24,39,0.5)":"rgba(255,255,255,0.7)", cardInner:dark?"rgba(15,23,42,0.6)":"rgba(241,245,249,0.7)",
    border:dark?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.5)", text:dark?"#f8fafc":"#000000", sub:dark?"#94a3b8":"#475569", input:dark?"rgba(15,23,42,0.6)":"rgba(255,255,255,0.8)",
  };
  const cardClass = `backdrop-blur-md border rounded-2xl overflow-hidden mb-3 relative transition-all duration-300 ${dark ? "bg-black/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-white/20 border-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.07)]"}`;
  const cardStyle = {};
  const inputStyle={width:"100%",padding:"10px",background:t.input,border:`1px solid ${dark ? "rgba(139,92,246,0.4)" : "rgba(34,211,238,0.5)"}`,borderRadius:"8px",color:t.text,fontSize:"14px",fontWeight:600,outline:"none",boxSizing:"border-box",transition:"all 0.3s",fontFamily:"inherit",boxShadow:dark?"0 0 10px rgba(139,92,246,0.2)":"0 0 12px rgba(34,211,238,0.3)"};

  useEffect(() => {
    if (tab === "avg" && avgEntries[0].price === "" && currentPrice) {
      setAvgEntries(e => { const n = [...e]; n[0].price = currentPrice; return n; });
    }
  }, [tab, avgEntries, currentPrice]);

  const copyAvg = () => {
    if(!avgResult) return;
    const sym = stockCode ? stockCode.toUpperCase() : "Saham";
    let diffText = "";
    if (currentPrice && !isNaN(parseFloat(currentPrice))) {
      const cp = parseFloat(currentPrice);
      const diff = (((avgResult.avgPrice - cp) / cp) * 100).toFixed(2);
      diffText = `\nJarak ke Current Price: ${diff > 0 ? '+'+diff : diff}%`;
    }
    const text=`📉 *KALKULATOR AVERAGE DOWN*\nEmiten: *${sym}*\n━━━━━━━━━━━━━━━━\n📦 Total Lot: ${fmtDec(avgResult.totalLot)} Lot\n💰 Total Modal: Rp ${fmt(Math.round(avgResult.totalValue*100))}\n🎯 *HARGA AVG BARU: ${fmtDec(avgResult.avgPrice)}*${diffText}\n━━━━━━━━━━━━━━━━\n*Generated by TradingStars Analyzer*`;
    navigator.clipboard.writeText(text); alert("✅ Hasil Kalkulasi Average Berhasil Disalin!");
  };

  const clear=()=>{setHigh("");setLow("");setClose("");setOpen("");setVolume("");setMa20Volume("");setStockCode("");setCurrentPrice("");setResult(null);setProgress(0);setGlowLevel(null);};

  const handleStockCode = (e) => {
    const val = e.target.value.toUpperCase();
    setStockCode(val);
    if (!val) {
      setHigh(""); setLow(""); setClose(""); setOpen(""); setVolume(""); setMa20Volume(""); setCurrentPrice(""); setResult(null); setFetchStatus("");
    }
  };

  const fetchStockData = async (overrideCode) => {
    const val = typeof overrideCode === "string" ? overrideCode.toUpperCase() : stockCode.toUpperCase();
    if (!val || val.length < 2) return;
    
    setLoading(true);
    setFetchStatus("Mencari data saham...");
    
    try {
      console.log(`🌐 [Backend] Fetching data for: ${val}`);
      // Hubungi API Python Serverless (Relative Path Vercel)
      const res = await fetch(`/api/stock/${val}`);
      
      if (!res.ok) {
        throw new Error("Data tidak ditemukan dari API backend");
      }
      
      const data = await res.json();
      console.log(`📥 [Backend] Response for ${val}:`, data);
      
      setHigh(data.high ? String(data.high) : "");
      setLow(data.low ? String(data.low) : "");
      setClose(data.close ? String(data.close) : "");
      setCurrentPrice(data.close ? String(data.close) : "");
      setVolume(data.volume ? String(data.volume) : "");
      setMa20Volume(data.ma20_volume ? String(data.ma20_volume) : ""); 
      setOpen(data.open ? String(data.open) : ""); // Open mungkin tidak ada
      
      setResult(null);
      setFetchStatus("✅ Auto-Fill Berhasil!");
      setTimeout(() => setFetchStatus(""), 3000);
      
      console.log(`✅ [Backend] Data successfully applied for ${val}`);
    } catch (err) {
      console.error(`💥 [Backend] Error fetching ${val}:`, err);
      setFetchStatus("📡 Mode: Manual (Saham Tidak Ditemukan)");
      
      // Keep UI honest: Clear fields when data is unavailable
      setHigh("");
      setLow("");
      setClose("");
      setCurrentPrice("");
      setVolume("");
      setMa20Volume("");
      setOpen("");
      setResult(null);
    }
    setLoading(false);
  };


  useEffect(() => {
    if(!mounted) return;
    const messages = [
      "🔥 Seseorang sedang analisa ANTM",
      "🚀 Member VIP pasang strategi Avg Down BBCA",
      "💎 Signal Strong terdeteksi hari ini!",
      "👀 Whales sedang memantau Pivot Lvl",
      "🤑 3 member baru saja TP di R2 BRPT",
      "⚡ Volatilitas tinggi di IHSG sesi ini"
    ];
    let timeoutId;
    const showPulse = () => {
      setLivePulse(messages[Math.floor(Math.random() * messages.length)]);
      setTimeout(()=>setLivePulse(null), 4000);
      timeoutId = setTimeout(showPulse, Math.random() * 15000 + 15000);
    };
    timeoutId = setTimeout(showPulse, 8000);
    return () => clearTimeout(timeoutId);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const val = stockCode.toUpperCase();
    if (val.length === 4 && !val.includes(":")) {
      const timeoutId = setTimeout(() => {
        fetchStockData(val);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCode, mounted]);

  const hitung=()=>{
    let h=parseFloat(high),l=parseFloat(low),c=parseFloat(close);
    if(isNaN(h)||isNaN(l)||isNaN(c)) return;
    if(h < l) { const temp=h; h=l; l=temp; } // Safeguard for inverted inputs
    setLoading(true);setProgress(0);setResult(null);
    let p=0; const iv=setInterval(()=>{p+=Math.random()*22+6;if(p>=100){p=100;clearInterval(iv);}setProgress(Math.min(Math.round(p),100));},45);
    setTimeout(()=>{
      let pivot, r1, r2, r3, s1, s2, s3;
      if (pivotMethod === "woodie") {
        pivot = (h + l + 2*c) / 4;
        r1 = 2*pivot - l; r2 = pivot + (h - l); r3 = r2 + (h - l);
        s1 = 2*pivot - h; s2 = pivot - (h - l); s3 = s2 - (h - l);
      } else {
        pivot = (h + l + c) / 3;
        r1 = (2 * pivot) - l;
        s1 = (2 * pivot) - h;
        r2 = pivot + (h - l);
        s2 = pivot - (h - l);
        r3 = h + 2 * (pivot - l);
        s3 = l - 2 * (h - pivot);
      }
      const res={pivot:Math.round(pivot),r1:Math.round(r1),r2:Math.round(r2),r3:Math.round(r3),s1:Math.round(s1),s2:Math.round(s2),s3:Math.round(s3),high:h,low:l,close:c,method:pivotMethod};
      setResult(res);setLoading(false);
      // Confetti explosion
      const particles = Array.from({length:36},(_,i)=>({
        id:i, x:Math.random()*100-50, y:Math.random()*-80-20,
        rot:Math.random()*720-360, color:["#f59e0b","#8b5cf6","#ec4899","#22d3ee","#f97316","#a3e635"][i%6],
        size:Math.random()*6+4, dur:Math.random()*0.5+0.7,
      }));
      setConfetti(particles);
      setTimeout(()=>setConfetti([]),1200);
      // Screen shake
      setShaking(true); setTimeout(()=>setShaking(false),280);
      const entry={...res,stockCode:stockCode||"—",date:new Date().toLocaleDateString("id-ID"),time:new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})};
      const updated=[entry,...history].slice(0,20); setHistory(updated);
      try{localStorage.setItem("pivot_history",JSON.stringify(updated));}catch{}
    },700);
  };

  const getSentiment=()=>{
    if(!result||!currentPrice) return null;
    const cp=parseFloat(currentPrice); if(isNaN(cp)) return null;
    if(cp>result.r2) return {label:"Strong Bullish 🚀",color:"#15803d",bg:dark?"#14532d":"#dcfce7",border:"#86efac"};
    if(cp>result.r1) return {label:"Bullish 📈",color:"#22c55e",bg:dark?"#166534":"#f0fdf4",border:"#bbf7d0"};
    if(cp>result.pivot) return {label:"Mild Bullish 🟢",color:"#84cc16",bg:dark?"#365314":"#f7fee7",border:"#bef264"};
    if(cp>result.s1) return {label:"Mild Bearish 🟡",color:"#f59e0b",bg:dark?"#78350f":"#fffbeb",border:"#fde68a"};
    if(cp>result.s2) return {label:"Bearish 📉",color:"#f97316",bg:dark?"#7c2d12":"#fff7ed",border:"#fed7aa"};
    return {label:"Strong Bearish 💥",color:"#dc2626",bg:dark?"#7f1d1d":"#fef2f2",border:"#fecaca"};
  };

  const getNearest=()=>{
    if(!result||!currentPrice) return null;
    const cp=parseFloat(currentPrice); if(isNaN(cp)) return null;
    const all=[{label:"R3",value:result.r3},{label:"R2",value:result.r2},{label:"R1",value:result.r1},{label:"PP",value:result.pivot},{label:"S1",value:result.s1},{label:"S2",value:result.s2},{label:"S3",value:result.s3}];
    return {above:all.filter(x=>x.value>cp).sort((a,b)=>a.value-b.value)[0],below:all.filter(x=>x.value<cp).sort((a,b)=>b.value-a.value)[0],nearest:all.reduce((a,b)=>Math.abs(a.value-cp)<Math.abs(b.value-cp)?a:b)};
  };

  const copyAnalisa=()=>{
    if(!result) return;
    setCardTransition(true);
    setTimeout(() => {
      setCardTransition(false);
      executeCopyAnalisa();
    }, 1200);
  };
  const executeCopyAnalisa=()=>{
    const sym = stockCode ? stockCode.toUpperCase() : "IHSG/Saham";
    let statusText = "Normal (Volume/MA20 kosong)";
    if (bandarPower) statusText = bandarPower.status;

    let rrText = "Belum diset (Isi Equity/Risk)";
    const eq = parseFloat(equity);
    const risk = parseFloat(riskPct);
    const cp = parseFloat(currentPrice) || result.pivot;
    
    if (!isNaN(eq) && !isNaN(risk) && eq > 0 && risk > 0 && cp > result.s1) {
      const maxLossRp = eq * (risk / 100);
      const lossPerShare = cp - result.s1;
      const maxShares = maxLossRp / lossPerShare;
      const lotSize = Math.floor(maxShares / 100);
      if (lotSize > 0) {
        const actualRisk = (lotSize * 100) * lossPerShare;
        const potentialProfit = (lotSize * 100) * (result.r1 - cp);
        if (potentialProfit > 0) rrText = `1 : ${(potentialProfit / actualRisk).toFixed(2)}`;
      }
    }

    const text=`📊 *TRADING STARS - PIVOT REPORT*\nEmiten: *${sym}*\n--------------------------\n📈 *Pivot Point:* ${fmt(result.pivot)}\n🚀 *Resist:* ${fmt(result.r1)} | ${fmt(result.r2)}\n🛡️ *Support:* ${fmt(result.s1)} | ${fmt(result.s2)}\n⚡ *Bandar Power:* ${statusText}\n⚖️ *R/R Ratio:* ${rrText}\n--------------------------\n*Generated by TradingStars Analyzer*`;
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2500);
  };

  const addEntry=()=>setAvgEntries(e=>[...e,{price:"",lot:""}]);
  const removeEntry=(i)=>setAvgEntries(e=>e.filter((_,idx)=>idx!==i));
  const updateEntry=(i,field,val)=>setAvgEntries(e=>e.map((item,idx)=>idx===i?{...item,[field]:val}:item));
  const hitungAvg=()=>{
    const valid=avgEntries.filter(e=>e.price!==""&&e.lot!==""&&!isNaN(parseFloat(e.price))&&!isNaN(parseFloat(e.lot))&&parseFloat(e.lot)>0);
    if(!valid.length) return;
    const totalLot=valid.reduce((s,e)=>s+parseFloat(e.lot),0), totalValue=valid.reduce((s,e)=>s+parseFloat(e.price)*parseFloat(e.lot),0);
    setAvgResult({avgPrice:totalValue/totalLot,totalLot,totalValue,count:valid.length});
  };
  const clearAvg=()=>{setAvgEntries([{price:"",lot:""},{price:"",lot:""}]);setAvgResult(null);};

  const nearest=getNearest();
  const pivotStrength=getPivotStrength(result);
  const bandarPower=result?getBandarPower(currentPrice, open, close, volume, ma20Volume):null;
  const cp=parseFloat(currentPrice);

  const levelDefs=result?[
    {label:"R3",sub:"Resistance 3",value:result.r3,color:"#9f1239",light:dark?"#4c0519":"#fff1f2",border:"#fda4af"},
    {label:"R2",sub:"Resistance 2",value:result.r2,color:"#dc2626",light:dark?"#3b0f0f":"#fef2f2",border:"#fecaca"},
    {label:"R1",sub:"Resistance 1",value:result.r1,color:"#ef4444",light:dark?"#450a0a":"#fef2f2",border:"#fca5a5"},
    {label:"PP",sub:"Pivot Point", value:result.pivot,color:"#2563eb",light:dark?"#1a2f50":"#eff6ff",border:"#bfdbfe",bold:true},
    {label:"S1",sub:"Support 1",   value:result.s1,color:"#16a34a",light:dark?"#14532d":"#f0fdf4",border:"#bbf7d0"},
    {label:"S2",sub:"Support 2",   value:result.s2,color:"#22c55e",light:dark?"#064e3b":"#dcfce7",border:"#86efac"},
    {label:"S3",sub:"Support 3",   value:result.s3,color:"#4ade80",light:dark?"#064e3b":"#d1fae5",border:"#4ade80"},
  ]:[];

  const floatPct=(()=>{ if(!result||!currentPrice||!levelDefs.length) return null; if(isNaN(cp)) return null; const max=levelDefs[0].value,min=levelDefs[6].value,range=max-min; return range>0?Math.min(Math.max(((cp-min)/range)*100,0),100):null; })();
  const tabStyle=(active)=>({flex:1,padding:"9px 4px",background:active?(dark?"#1e3a5f":"#0f172a"):"transparent",color:active?"#fff":t.sub,border:"none",borderRadius:"8px",fontSize:"11px",fontWeight:700,cursor:"pointer",transition:"all 0.2s"});

  if (!mounted) return null;

  return (
    <div className={dark ? "dark" : ""}>
      <div className={`min-h-screen flex justify-center p-6 relative transition-colors duration-500 ${dark ? "bg-gradient-to-br from-slate-900 to-black text-white" : "bg-white text-black"}${shaking?" animate-shake":""}`} style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", paddingTop: "50px" }}>
      <ConfettiBurst particles={confetti} />
      <LiveToast pulse={livePulse} dark={dark} />
      <CardTransitionMode active={cardTransition} dark={dark} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", padding: "8px 0", background: dark ? "rgba(0,0,0,0.6)" : "rgba(226,232,240,0.8)", backdropFilter: "blur(4px)", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`, zIndex: 10, overflow: "hidden", perspective: "1000px", backfaceVisibility: "hidden" }}>
        <div style={{ display: "inline-block", willChange: "transform", animation: "marqueeAnim 25s linear infinite", whiteSpace: "nowrap", backfaceVisibility: "hidden" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1px", color: dark ? "#f8fafc" : "#1e293b" }}>{getMarketStatus()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {getMarketStatus()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {getMarketStatus()}</span>
        </div>
      </div>
      <Particles dark={dark} />
      <div style={{ width:"100%",maxWidth:"430px",position:"relative",zIndex:1 }}>

        <FadeIn delay={0}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
              <img src="/logo-tradingstars.jpg" alt="TradingStars Logo" fetchPriority="high" decoding="async" style={{ width:"42px",height:"42px",borderRadius:"10px",objectFit:"cover",boxShadow:"0 4px 14px rgba(124,58,237,0.45)" }} />
              <div>
                <div style={{ fontSize:"17px",fontWeight:800,color:t.text }}>Pivot Analyzer</div>
                <div style={{ fontSize:"10px",color:t.sub }}>Classical Floor Method · R3/S3</div>
              </div>
            </div>
            {/* Dark mode button removed as requested */}
          </div>
        </FadeIn>

        <FadeIn delay={60}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:session.bg,border:`1px solid ${session.color}30`,borderRadius:"10px",padding:"9px 14px",marginBottom:"12px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
              <div style={{ width:"7px",height:"7px",borderRadius:"50%",background:session.dot,boxShadow:`0 0 8px ${session.dot}`,animation:session.open?"pulse 1.8s infinite":"none" }} />
              <span style={{ fontSize:"12px",fontWeight:700,color:session.color }}>{session.name}</span>
              <span style={{ fontSize:"10px",color:t.sub }}>{session.open?"• OPEN":"• CLOSED"}</span>
            </div>
            <Clock dark={dark} />
          </div>
        </FadeIn>

        <FadeIn delay={90}>
          <div style={{ position:"relative",display:"flex",gap:"2px",background:t.card,padding:"4px",borderRadius:"12px",marginBottom:"14px",border:`1px solid ${t.border}` }}>
            {[["main","📊 Analisa"],["avg","🧮 Avg Down"],["history","🕐 History"],["story","📸 Story"]].map(([key,label],idx)=>((
              <button key={key} onClick={()=>setTab(key)} style={{ flex:1,padding:"9px 4px",background:"transparent",color:tab===key?"#fff":t.sub,border:"none",borderRadius:"8px",fontSize:"11px",fontWeight:700,cursor:"pointer",transition:"color 0.25s",position:"relative",zIndex:1 }}>
                {tab===key && (
                  <span style={{ position:"absolute",inset:0,background:dark?"#1e3a5f":"#0f172a",borderRadius:"8px",zIndex:-1,boxShadow:dark?"0 2px 10px rgba(99,102,241,0.35)":"0 2px 8px rgba(15,23,42,0.25)", animation:"tabSlide 0.25s cubic-bezier(0.22,1,0.36,1)" }} />
                )}
                {label}
              </button>
            )))}
          </div>
        </FadeIn>

        {tab==="main" && <>
          <FadeIn delay={100}>
            <Speedometer value={sentimentVal} setValue={setSentimentVal} dark={dark} t={t} />
          </FadeIn>
          <FadeIn delay={120}>
            <div className={cardClass} style={{ ...cardStyle, minHeight: "380px" }}>
              <div style={{ padding:"13px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>DATA OHLC</span>
                <button onClick={clear} style={{ fontSize:"11px",color:"#ef4444",background:dark?"#3b0f0f":"#fef2f2",border:"1px solid #fecaca",borderRadius:"6px",padding:"3px 10px",cursor:"pointer",fontWeight:700 }}>✕ Clear</button>
              </div>
              <div style={{ padding:"16px" }}>
                <div style={{ fontSize:"10px",color:t.sub,marginBottom:"12px",display:"flex",alignItems:"center",gap:"6px" }}>
                  <span>💡</span> Input data dari RTI/Stockbit untuk hasil presisi.
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"12px" }}>
                  {[{label:"High",val:high,set:setHigh,color:"#dc2626",emoji:"↑"},{label:"Low",val:low,set:setLow,color:"#16a34a",emoji:"↓"},{label:"Close",val:close,set:setClose,color:"#2563eb",emoji:"●"}].map(({label,val,set,color,emoji})=>(
                    <div key={label}>
                      <label style={{ display:"flex",gap:"4px",fontSize:"11px",fontWeight:700,color,marginBottom:"5px" }}>{emoji} {label}</label>
                      <input type="number" value={val} onChange={e=>set(e.target.value)} placeholder="0" style={inputStyle}
                        onFocus={e=>{e.target.style.borderColor=color;e.target.style.boxShadow=`0 0 0 3px ${color}18`;}}
                        onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px" }}>
                  <div>
                    <label style={{ fontSize:"11px",fontWeight:700,color:"#8b5cf6",display:"block",marginBottom:"5px" }}>🔠 Kode Saham (opsional)</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input type="text" value={stockCode} onChange={handleStockCode} onKeyDown={(e) => { if (e.key === "Enter") fetchStockData(stockCode) }} placeholder="Cth: ANTM" maxLength={6} style={{...inputStyle, flex: 1}}
                        onFocus={e=>{e.target.style.borderColor="#8b5cf6";e.target.style.boxShadow="0 0 0 3px rgba(139,92,246,0.12)";}}
                        onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                      <button onClick={(e) => { e.preventDefault(); fetchStockData(stockCode); }} disabled={loading} title="Cari Data Saham" style={{ padding: "0 14px", background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading ? "wait" : "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(139,92,246,0.3)", transition: "all 0.2s" }}>
                        {loading ? "..." : "🔍"}
                      </button>
                    </div>
                    {fetchStatus && (
                      <div style={{ fontSize:"10px", fontWeight: 600, color: "#f59e0b", marginTop: "6px", display: "flex", alignItems: "center" }}>
                        {fetchStatus}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "block", visibility: "visible" }}>
                    <label style={{ fontSize:"11px",fontWeight:700,color:"#8b5cf6",display:"block",marginBottom:"5px" }}>🎯 Harga Sekarang (opsional)</label>
                    <input type="number" value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)} placeholder="Aktivator Fitur" style={{...inputStyle, display: "block", opacity: 1, visibility: "visible"}}
                      onFocus={e=>{e.target.style.borderColor="#8b5cf6";e.target.style.boxShadow="0 0 0 3px rgba(139,92,246,0.12)";}}
                      onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px" }}>
                  <div>
                    <label style={{ fontSize:"11px",fontWeight:700,color:"#10b981",display:"block",marginBottom:"5px" }}>📊 Volume (Lot)</label>
                    <input type="number" value={volume} onChange={e=>setVolume(e.target.value)} placeholder={loading ? "..." : "Auto/Manual"} style={inputStyle}
                      onFocus={e=>{e.target.style.borderColor="#10b981";e.target.style.boxShadow="0 0 0 3px rgba(16,185,129,0.12)";}}
                      onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                  </div>
                  <div>
                    <label style={{ fontSize:"11px",fontWeight:700,color:"#f59e0b",display:"block",marginBottom:"5px" }}>📉 MA20 Volume</label>
                    <input type="number" value={ma20Volume} onChange={e=>setMa20Volume(e.target.value)} placeholder={loading ? "..." : "Auto/Manual"} style={inputStyle}
                      onFocus={e=>{e.target.style.borderColor="#f59e0b";e.target.style.boxShadow="0 0 0 3px rgba(245,158,11,0.12)";}}
                      onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                  </div>
                </div>
                {loading && (
                  <div style={{ marginBottom:"12px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
                      <span style={{ fontSize:"11px",color:t.sub }}>Menghitung pivot...</span>
                      <span style={{ fontSize:"11px",fontWeight:700,color:"#2563eb" }}>{progress}%</span>
                    </div>
                    <div style={{ height:"7px",background:t.border,borderRadius:"99px",overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#2563eb,#7c3aed,#ec4899)",borderRadius:"99px",transition:"width 0.08s",boxShadow:"0 0 8px rgba(124,58,237,0.5)" }} />
                    </div>
                  </div>
                )}
                <SpringBtn onClick={()=>{ if(!loading) hitung(); }} style={{ width:"100%",padding:"13px",background:loading?t.border:"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:loading?t.sub:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:800,cursor:loading?"wait":"pointer",boxShadow:loading?"none":"0 4px 16px rgba(124,58,237,0.35)" }}>
                  {loading?`Menghitung... ${progress}%`:"⟳  Hitung Pivot Point"}
                </SpringBtn>
              </div>
            </div>
          </FadeIn>

          {pivotStrength && (
            <FadeIn delay={0}>
              <div className={cardClass} style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
                  <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>💪 PIVOT STRENGTH</span>
                  <span style={{ fontSize:"13px",fontWeight:900,color:pivotStrength.color }}>{pivotStrength.label}</span>
                </div>
                <div style={{ height:"10px",background:t.border,borderRadius:"99px",overflow:"hidden",marginBottom:"8px" }}>
                  <div style={{ height:"100%",width:`${pivotStrength.strength}%`,background:`linear-gradient(90deg,#dc2626,#f59e0b,#16a34a)`,borderRadius:"99px",transition:"width 0.9s ease",boxShadow:`0 0 8px ${pivotStrength.color}60` }} />
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px" }}>
                  {[["Strength Score",pivotStrength.strength+"/100",pivotStrength.color],["Pivot Zone",fmt(Math.round(pivotStrength.pivotZone))+" pt","#2563eb"],["R1-R2 Gap",fmt(Math.round(pivotStrength.r1r2Gap))+" pt","#ea580c"]].map(([l,v,c])=>(
                    <div key={l} style={{ textAlign:"center",padding:"8px 6px",background:t.cardInner,borderRadius:"8px",border:`1px solid ${t.border}` }}>
                      <div style={{ fontSize:"8px",color:t.sub,marginBottom:"3px" }}>{l}</div>
                      <div style={{ fontSize:"13px",fontWeight:800,color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}

          {result && currentPrice && (
            <FadeIn delay={0}>
              <TrendArrow result={result} currentPrice={currentPrice} t={t} dark={dark} />
            </FadeIn>
          )}

          {bandarPower && (
            <FadeIn delay={0}>
              <div className={cardClass} style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
                  <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>⚡ BANDAR POWER DETECTOR</span>
                </div>
                <div style={{ background:bandarPower.bg,border:`1px solid ${bandarPower.border}`,borderRadius:"12px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px" }}>
                  <div style={{ fontSize:"28px",lineHeight:1 }}>{bandarPower.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"14px",fontWeight:900,color:bandarPower.color }}>{bandarPower.status}</div>
                    <div style={{ fontSize:"10px",color:t.sub,marginTop:"2px" }}>
                      Vol Ratio: <span style={{ fontWeight:700,color:t.text }}>{bandarPower.volRatio}x MA20</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize:"10px",color:t.sub,marginTop:"10px",lineHeight:1.6 }}>
                  {bandarPower.status === "HIGH ACCUMULATION" && "Volume meledak melebihi rata-rata ( > 1.3x ) disertai indikasi harga naik. Sinyal kuat akumulasi!"}
                  {bandarPower.status === "HIGH DISTRIBUTION" && "Volume meledak melebihi rata-rata ( > 1.3x ) disertai indikasi harga turun. Waspada tekanan jual berat!"}
                  {bandarPower.status === "NORMAL / NEUTRAL" && "Volume berada di tingkat rata-rata, tidak ada aktivitas akumulasi atau distribusi agresif."}
                  {bandarPower.status === "LOW PARTICIPATION" && "Volume sangat sepi ( < 0.8x MA20 ). Market cenderung sideways atau rawan gocekan."}
                </div>
              </div>
            </FadeIn>
          )}


          {levelDefs.length>0 && (() => {
            const strength = pivotStrength?.strength || 0;
            const isStrong = strength >= 70;
            const isMedium = strength >= 40;
            const badgeLabel = isStrong ? "🔥 SIGNAL STRONG" : isMedium ? "🚀 READY TO TRADE" : "📊 ANALYZING";
            const badgeColor = isStrong ? "#f59e0b" : isMedium ? "#8b5cf6" : "#64748b";
            const neonColor = isStrong ? "#f59e0b" : "#8b5cf6";
            return (
            <FadeIn delay={0}>
              <div className={cardClass} style={{ position:"relative", overflow:"visible" }}>
                <div style={{ position:"absolute", inset:"-2px", borderRadius:"18px", background:`linear-gradient(90deg,${neonColor},#ec4899,#22d3ee,${neonColor})`, backgroundSize:"300% 100%", animation: isStrong ? "rgbBorder 2s linear infinite" : isMedium ? "rgbBorder 3s linear infinite" : "none", zIndex:0, opacity: 0.85 }}>
                  <div style={{ position:"absolute", inset:"2px", borderRadius:"16px", background: dark?"#09090b":"#ffffff" }} />
                </div>
                <HeatmapBg levels={levelDefs} currentPrice={currentPrice} dark={dark} />
                <div style={{ position:"relative",zIndex:1 }}>
                  <div style={{ padding:"12px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>PIVOT LADDER</span>
                    <span style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                      <span style={{ fontSize:"10px",color:t.sub }}>7 LEVEL</span>
                      <span style={{ fontSize:"10px",fontWeight:800,color:badgeColor,padding:"2px 8px",background:`${badgeColor}18`,borderRadius:"99px",border:`1px solid ${badgeColor}40`,animation:"pulseBadge 1.5s ease-in-out infinite" }}>{badgeLabel}</span>
                    </span>
                  </div>
                  {levelDefs.map(({label,sub,value,color,light,border,bold},i)=>{
                    const isNearest=nearest?.nearest?.label===label, isAbove=nearest?.above?.label===label, isBelow=nearest?.below?.label===label;
                    const pct=!isNaN(cp)?(((value-cp)/cp)*100).toFixed(2):null, isPivot=label==="PP";
                    return (
                      <SlideIn key={label} delay={i*55}>
                        <div onMouseEnter={()=>setGlowLevel(label)} onMouseLeave={()=>setGlowLevel(null)}
                          style={{ display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:i<6?`1px solid ${t.border}`:"none",background:isNearest?light:"transparent",transition:"all 0.25s",boxShadow:glowLevel===label?`inset 0 0 0 1px ${color}30`:isPivot?`inset 0 0 0 1px ${color}20`:"none" }}>
                          <div style={{ width:"3px",height:"36px",background:color,borderRadius:"2px",marginRight:"12px",opacity:isNearest||isAbove||isBelow?1:0.28,boxShadow:(glowLevel===label||isPivot)?`0 0 10px ${color}`:"none",transition:"box-shadow 0.3s" }} />
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:"5px" }}>
                              <span style={{ fontSize:"12px",fontWeight:800,color,textShadow:isPivot?`0 0 12px ${color}80`:"none" }}>{label}</span>
                              {isNearest&&<span style={{ fontSize:"8px",background:color,color:"#fff",borderRadius:"4px",padding:"1px 5px",fontWeight:700,boxShadow:`0 0 8px ${color}60` }}>TERDEKAT</span>}
                              {isAbove&&!isNearest&&<span style={{ fontSize:"8px",background:dark?"#1e3a5f":"#dbeafe",color:"#2563eb",borderRadius:"4px",padding:"1px 5px",fontWeight:700 }}>TARGET ↑</span>}
                              {isBelow&&!isNearest&&<span style={{ fontSize:"8px",background:dark?"#14532d":"#dcfce7",color:"#16a34a",borderRadius:"4px",padding:"1px 5px",fontWeight:700 }}>SUPPORT ↓</span>}
                            </div>
                            <div style={{ fontSize:"9px",color:t.sub }}>{sub}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:bold?"19px":"15px",fontWeight:800,color:isNearest?color:bold?color:t.text,textShadow:isPivot?`0 0 16px ${color}60`:"none" }}><AnimNum value={value} fmt={fmt} /></div>
                            {pct!==null&&<div style={{ fontSize:"9px",color:value>cp?"#16a34a":"#dc2626",fontWeight:700 }}>{value>cp?"+":""}{pct}%</div>}
                          </div>
                        </div>
                      </SlideIn>
                    );
                  })}
                  <div style={{ padding:"14px 16px",borderTop:`1px solid ${t.border}` }}>
                    <div style={{ fontSize:"10px",color:t.sub,marginBottom:"10px",fontWeight:600,letterSpacing:"1px" }}>VISUALISASI LADDER</div>
                    {levelDefs.map(({label,value,color})=>{
                      const max=levelDefs[0].value,min=levelDefs[6].value,range=max-min, barPct=range>0?((value-min)/range)*100:50;
                      return (
                        <div key={label} style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"5px" }}>
                          <div style={{ width:"22px",fontSize:"9px",fontWeight:700,color,textAlign:"right" }}>{label}</div>
                          <div style={{ flex:1,height:"7px",background:dark?"#1e293b":"#f1f5f9",borderRadius:"99px",position:"relative" }}>
                            <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${barPct}%`,background:`linear-gradient(90deg,${color}40,${color})`,borderRadius:"99px",transition:"width 0.7s ease",boxShadow:`0 0 6px ${color}40` }} />
                            {floatPct!==null&&<div style={{ position:"absolute",top:"-4px",left:`${floatPct}%`,width:"14px",height:"14px",background:"#f59e0b",borderRadius:"50%",border:"2px solid #fff",transform:"translateX(-50%)",zIndex:3,boxShadow:"0 0 10px rgba(245,158,11,0.7)",transition:"left 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} />}
                          </div>
                          <div style={{ width:"50px",fontSize:"9px",color:t.sub,textAlign:"right" }}>{fmt(value)}</div>
                        </div>
                      );
                    })}
                    {floatPct!==null&&(
                      <div style={{ marginTop:"10px",display:"flex",alignItems:"center",gap:"6px",padding:"6px 10px",background:dark?"rgba(245,158,11,0.1)":"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"8px" }}>
                        <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:"#f59e0b",boxShadow:"0 0 8px rgba(245,158,11,0.7)" }} />
                        <span style={{ fontSize:"11px",fontWeight:700,color:"#f59e0b" }}>Harga: {fmt(Math.round(cp))}</span>
                        {nearest?.nearest&&<span style={{ fontSize:"10px",color:t.sub,marginLeft:"auto" }}>≈ {nearest.nearest.label}</span>}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </FadeIn>
            );
          })()}

          {result && (
            <FadeIn delay={0}>
              <div className={cardClass} style={{ padding:"14px 16px", background: dark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.4)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                  <span style={{ fontSize:"11px",fontWeight:700,color:dark ? "#bbb" : "#444",letterSpacing:"1px" }}>⚖️ TRADING PLAN OPTIMIZER</span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 80px",gap:"10px",marginBottom:"12px" }}>
                  <div>
                    <label style={{ fontSize:"10px",fontWeight:700,color:"#10b981",display:"block",marginBottom:"5px" }}>💵 Modal / Equity</label>
                    <input type="number" value={equity} onChange={e=>setEquity(e.target.value)} placeholder="Contoh: 10000000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize:"10px",fontWeight:700,color:"#ef4444",display:"block",marginBottom:"5px" }}>Risk (%)</label>
                    <input type="number" value={riskPct} onChange={e=>setRiskPct(e.target.value)} placeholder="1-2" style={inputStyle} />
                  </div>
                </div>
                
                {(() => {
                  const eq = parseFloat(equity);
                  const risk = parseFloat(riskPct);
                  if (isNaN(eq) || isNaN(risk) || eq <= 0 || risk <= 0) {
                    return <div style={{ fontSize:"10px",color:t.sub }}>Masukkan Modal dan Risk (%) untuk melihat Trading Plan.</div>;
                  }
                  
                  const maxLossRp = eq * (risk / 100);
                  const entryPrice = parseFloat(currentPrice) || result.pivot;
                  const slPrice = result.s1;
                  const tpPrice = result.r1;
                  
                  if (entryPrice <= slPrice) return <div style={{ fontSize:"10px",color:t.sub }}>Harga Entry saat ini berada di bawah Support (SL). Trading plan tidak valid.</div>;
                  
                  const lossPerShare = entryPrice - slPrice;
                  const maxShares = maxLossRp / lossPerShare;
                  const lotSize = Math.floor(maxShares / 100);
                  
                  if (lotSize <= 0) return <div style={{ fontSize:"10px",color:t.sub }}>Risk terlalu kecil atau jarak SL terlalu lebar untuk beli 1 lot.</div>;
                  
                  const actualRisk = (lotSize * 100) * lossPerShare;
                  const potentialProfit = (lotSize * 100) * (tpPrice - entryPrice);
                  const rrRatio = potentialProfit > 0 ? (potentialProfit / actualRisk).toFixed(2) : 0;
                  
                  return (
                    <div style={{ background:t.cardInner,border:`1px solid ${t.border}`,borderRadius:"10px",padding:"12px" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"8px",borderBottom:`1px solid ${t.border}`,paddingBottom:"8px" }}>
                        <div>
                          <div style={{ fontSize:"9px",color:t.sub }}>MAX LOT</div>
                          <div style={{ fontSize:"16px",fontWeight:900,color:"#8b5cf6" }}>{lotSize} Lot</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:"9px",color:t.sub }}>R/R RATIO</div>
                          <div style={{ fontSize:"16px",fontWeight:900,color:rrRatio >= 2 ? "#16a34a" : "#f59e0b" }}>1 : {rrRatio}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"10px" }}>
                        <div>
                          <div style={{ fontSize:"9px",color:t.sub }}>STOP LOSS (S1)</div>
                          <div style={{ fontSize:"12px",fontWeight:800,color:"#ef4444" }}>Rp {fmt(slPrice)} <span style={{fontSize:"10px",fontWeight:400}}>(-Rp {fmt(actualRisk)})</span></div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:"9px",color:t.sub }}>TAKE PROFIT (R1)</div>
                          <div style={{ fontSize:"12px",fontWeight:800,color:"#10b981" }}>Rp {fmt(tpPrice)} <span style={{fontSize:"10px",fontWeight:400}}>(+Rp {fmt(potentialProfit)})</span></div>
                        </div>
                      </div>
                      
                      <div style={{ height:"6px",background:"#ef4444",borderRadius:"99px",display:"flex",overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${(1 / (1 + parseFloat(rrRatio))) * 100}%`,background:"#ef4444" }} />
                        <div style={{ height:"100%",flex:1,background:"#10b981" }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </FadeIn>
          )}

          {result && (
            <FadeIn delay={0}>
              <div style={{ marginBottom:"12px" }}>
                <div style={{ fontSize:"10px",color:t.sub,marginBottom:"10px",padding:"8px 10px",background:dark?"rgba(37,99,235,0.08)":"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"8px" }}>
                  Analisa menggunakan metode <b>Pivot Point (Floor Method)</b> untuk menentukan area support dan resistance intraday.
                </div>

                <SpringBtn onClick={copyAnalisa} style={{ width:"100%",padding:"13px",background:copied?"#16a34a":"#2563eb",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:800,cursor:"pointer",transition:"background 0.3s",boxShadow:copied?"0 4px 14px rgba(22,163,74,0.4)":"0 4px 14px rgba(37,99,235,0.35)",display:"block" }}>
                  {copied ? "✅ Laporan Disalin!" : "📤 Salin & Share Analisa"}
                </SpringBtn>
              </div>
            </FadeIn>
          )}
        </>}

        {tab==="avg" && (
          <FadeIn delay={0}>
            <div>
              <div className={cardClass}>
                <div style={{ padding:"13px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>🧮 KALKULATOR AVERAGE</span>
                  <button onClick={clearAvg} style={{ fontSize:"11px",color:"#ef4444",background:dark?"#3b0f0f":"#fef2f2",border:"1px solid #fecaca",borderRadius:"6px",padding:"3px 10px",cursor:"pointer",fontWeight:700 }}>✕ Reset</button>
                </div>
                <div style={{ padding:"16px" }}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 36px",gap:"8px",marginBottom:"6px" }}>
                    <div style={{ fontSize:"10px",fontWeight:700,color:t.sub }}>HARGA BELI</div>
                    <div style={{ fontSize:"10px",fontWeight:700,color:t.sub }}>JUMLAH LOT</div>
                    <div/>
                  </div>
                  {avgEntries.map((entry,i)=>(
                    <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr 1fr 36px",gap:"8px",marginBottom:"8px",alignItems:"center" }}>
                      <input type="number" value={entry.price} placeholder="1550" onChange={e=>updateEntry(i,"price",e.target.value)} style={inputStyle}
                        onFocus={e=>{e.target.style.borderColor="#2563eb";e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,0.1)";}}
                        onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                      <input type="number" value={entry.lot} placeholder="Lot" onChange={e=>updateEntry(i,"lot",e.target.value)} style={inputStyle}
                        onFocus={e=>{e.target.style.borderColor="#16a34a";e.target.style.boxShadow="0 0 0 3px rgba(22,163,74,0.1)";}}
                        onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                      <button onClick={()=>avgEntries.length>1?removeEntry(i):null}
                        style={{ width:"36px",height:"36px",background:avgEntries.length>1?(dark?"#3b0f0f":"#fef2f2"):t.input,border:`1px solid ${avgEntries.length>1?"#fecaca":t.border}`,borderRadius:"8px",color:avgEntries.length>1?"#ef4444":t.sub,cursor:avgEntries.length>1?"pointer":"default",fontSize:"16px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                    </div>
                  ))}
                  <button onClick={addEntry} style={{ width:"100%",padding:"9px",background:"transparent",border:`1.5px dashed ${t.border}`,borderRadius:"8px",color:t.sub,fontSize:"12px",fontWeight:600,cursor:"pointer",marginBottom:"12px" }}>+ Tambah Baris</button>
                  <button onClick={hitungAvg} style={{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:800,cursor:"pointer",boxShadow:"0 8px 24px rgba(124,58,237,0.35)",transition:"all 0.3s" }}>🧮 Hitung Average</button>
                </div>
              </div>
              {avgResult&&(
                <FadeIn delay={0}>
                  <div className={cardClass}>
                    <div style={{ padding:"13px 16px",borderBottom:`1px solid ${t.border}` }}><span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>HASIL KALKULASI</span></div>
                    <div style={{ padding:"16px" }}>
                      <div style={{ textAlign:"center",padding:"16px",background:t.cardInner,borderRadius:"10px",marginBottom:"14px",border:`1px solid ${t.border}`,boxShadow:"0 0 20px rgba(37,99,235,0.1)" }}>
                        <div style={{ fontSize:"11px",color:t.sub,marginBottom:"4px",fontWeight:600,letterSpacing:"1px" }}>HARGA RATA-RATA</div>
                        <div style={{ fontSize:"32px",fontWeight:900,color:"#2563eb",letterSpacing:"-1px",textShadow:"0 0 20px rgba(37,99,235,0.3)" }}><AnimNum value={avgResult.avgPrice} fmt={fmtDec} /></div>
                        {currentPrice && !isNaN(parseFloat(currentPrice)) && (
                          <div style={{ fontSize:"11px",fontWeight:700,color:((avgResult.avgPrice - parseFloat(currentPrice))/parseFloat(currentPrice)) > 0 ? "#dc2626" : "#16a34a", marginTop:"6px", background:((avgResult.avgPrice - parseFloat(currentPrice))/parseFloat(currentPrice)) > 0 ? "rgba(220,38,38,0.1)" : "rgba(22,163,74,0.1)", padding:"4px 8px", borderRadius:"6px", display:"inline-block" }}>
                            {(((avgResult.avgPrice - parseFloat(currentPrice)) / parseFloat(currentPrice)) * 100).toFixed(2) > 0 ? "▲" : "▼"} Abs {Math.abs((((avgResult.avgPrice - parseFloat(currentPrice)) / parseFloat(currentPrice)) * 100).toFixed(2))}% dari Harga Saat Ini
                          </div>
                        )}
                      </div>
                      {[["Total Lot",fmtDec(avgResult.totalLot)+" lot","#16a34a"],["Total Nilai","Rp "+fmt(Math.round(avgResult.totalValue*100)),"#f59e0b"],["Jumlah Transaksi",avgResult.count+" transaksi","#8b5cf6"]].map(([label,val,color])=>(
                        <div key={label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${t.border}` }}>
                          <span style={{ fontSize:"13px",color:t.sub }}>{label}</span>
                          <span style={{ fontSize:"13px",fontWeight:700,color }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ marginTop:"14px" }}>
                        <div style={{ fontSize:"10px",fontWeight:700,color:t.sub,letterSpacing:"1px",marginBottom:"8px" }}>RINCIAN PER TRANSAKSI</div>
                        {avgEntries.filter(e=>e.price!==""&&e.lot!==""&&!isNaN(parseFloat(e.price))&&!isNaN(parseFloat(e.lot))&&parseFloat(e.lot)>0).map((e,i)=>{
                          const diff=parseFloat(e.price)-avgResult.avgPrice, pct=((diff/avgResult.avgPrice)*100).toFixed(2);
                          return (
                            <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:t.cardInner,borderRadius:"8px",marginBottom:"5px",border:`1px solid ${t.border}` }}>
                              <div><span style={{ fontSize:"12px",fontWeight:700,color:t.text }}>{fmtDec(parseFloat(e.price))}</span><span style={{ fontSize:"10px",color:t.sub,marginLeft:"6px" }}>{e.lot} lot</span></div>
                              <div style={{ textAlign:"right" }}>
                                <span style={{ fontSize:"11px",fontWeight:700,color:diff>0?"#dc2626":"#16a34a" }}>{diff>0?"▲":"▼"} {Math.abs(parseFloat(pct))}%</span>
                                <div style={{ fontSize:"9px",color:t.sub }}>{diff>0?"di atas avg":"di bawah avg"}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <SpringBtn onClick={copyAvg} style={{ width:"100%",padding:"12px",marginTop:"16px",background:"#2563eb",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:800,cursor:"pointer",boxShadow:"0 4px 14px rgba(37,99,235,0.35)" }}>📤 Salin & Share Kalkulasi</SpringBtn>
                    </div>
                  </div>
                </FadeIn>
              )}
            </div>
          </FadeIn>
        )}

        {tab==="history" && (
          <FadeIn delay={0}>
            <div className={cardClass}>
              <div style={{ padding:"13px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>🕐 RIWAYAT ANALISA ({history.length}/20)</span>
                {history.length>0&&<button onClick={()=>{setHistory([]);try{localStorage.removeItem("pivot_history");}catch{}}} style={{ fontSize:"10px",color:"#ef4444",background:dark?"#3b0f0f":"#fef2f2",border:"1px solid #fecaca",borderRadius:"6px",padding:"2px 8px",cursor:"pointer",fontWeight:700 }}>🗑️ Hapus Semua</button>}
              </div>
              {history.length===0
                ? <div style={{ textAlign:"center",padding:"40px 20px",color:t.sub,fontSize:"13px" }}>Belum ada riwayat. Analisa dulu sahamnya! 📭</div>
                : history.map((h,i)=>(
                  <div key={i}
                    onClick={()=>{
                      setHigh(String(h.high)); setLow(String(h.low)); setClose(String(h.close));
                      setStockCode(h.stockCode||"")
                      setTab("main");
                    }}
                    style={{ padding:"12px 16px",borderBottom:i<history.length-1?`1px solid ${t.border}`:"none",cursor:"pointer",transition:"background 0.2s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.04)":"rgba(37,99,235,0.04)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
                      <span style={{ fontSize:"13px",fontWeight:800,color:dark?"#a5b4fc":"#2563eb" }}>{h.stockCode||"—"}</span>
                      <span style={{ fontSize:"9px",color:t.sub }}>{h.date} · {h.time}</span>
                    </div>
                    <div style={{ display:"flex",gap:"8px",alignItems:"center",justifyContent:"space-between" }}>
                      <div style={{ display:"flex",gap:"5px" }}>
                        {[["PP",h.pivot,"#2563eb"],["R1",h.r1,"#ea580c"],["S1",h.s1,"#16a34a"]].map(([label,val,color])=>(
                          <div key={label} style={{ textAlign:"center",padding:"4px 8px",background:t.cardInner,borderRadius:"6px",border:`1px solid ${t.border}` }}>
                            <div style={{ fontSize:"8px",fontWeight:700,color }}>{label}</div>
                            <div style={{ fontSize:"10px",fontWeight:700,color:t.text }}>{val?.toLocaleString("id-ID")}</div>
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize:"9px",color:t.sub,fontStyle:"italic" }}>tap to recall ↩</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </FadeIn>
        )}

        {tab==="story" && (
          <FadeIn delay={0}>
            <StoryJournal
              history={history}
              dark={dark}
              t={t}
              stockCode={stockCode}
              onRecall={(h) => {
                setHigh(String(h.high));
                setLow(String(h.low));
                setClose(String(h.close));
                setStockCode(h.stockCode || "");
                setTab("main");
              }}
            />
          </FadeIn>
        )}

        <p style={{ textAlign:"center",marginTop:"16px",fontSize:"10px",color:t.sub }}>For educational use only · Pivot Analyzer Pro</p>
      </div>
      <style>{`
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
  @keyframes tabSlide{from{opacity:0;transform:scaleX(0.7)}to{opacity:1;transform:scaleX(1)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes rgbBorder{0%{background-position:0% 0%}100%{background-position:300% 0%}}
  @keyframes pulseBadge{0%,100%{opacity:1;box-shadow:0 0 0 0 transparent}50%{opacity:0.85;box-shadow:0 0 10px currentColor}}
  @keyframes screenShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
  @keyframes confetti-fly{0%{transform:translate(-50%,-50%) rotate(0deg);opacity:1}100%{transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy))) rotate(var(--cr));opacity:0}}
  .animate-shake{animation:screenShake 0.28s cubic-bezier(0.36,0.07,0.19,0.97) both}
  @keyframes toastSlideUp{0%{opacity:0;transform:translateY(20px) scale(0.9)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes fadeInC{from{opacity:0}to{opacity:1}}
  @keyframes holoCard{0%{transform:rotateY(-90deg) scale(0.8);opacity:0}40%{transform:rotateY(10deg) scale(1.05);opacity:1}60%{transform:rotateY(-5deg) scale(1)}100%{transform:rotateY(0deg) scale(1)}}
  @keyframes progressLine{0%{width:0%}100%{width:100%}}
  @keyframes marqueeAnim {
    0% { transform: translate3d(100vw, 0, 0); }
    100% { transform: translate3d(-100%, 0, 0); }
  }
`}</style>
      </div>
    </div>
  );
}