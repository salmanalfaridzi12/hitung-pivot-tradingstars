import { useState, useRef, useEffect } from "react";

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
  }, [target]);
  return val;
}

function AnimNum({ value, fmt }) {
  const animated = useAnimatedNumber(value);
  return <>{fmt(animated)}</>;
}

function Particles({ dark }) {
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
}

function HeatmapBg({ levels, currentPrice, dark }) {
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
}

function getSession() {
  const h = new Date().getUTCHours();
  if (h>=0&&h<7)   return {name:"WIB",      color:"#f59e0b",bg:"rgba(245,158,11,0.1)", dot:"#f59e0b",open:true};
  if (h>=7&&h<8)   return {name:"TK-LN Overlap",color:"#8b5cf6",bg:"rgba(139,92,246,0.1)",dot:"#8b5cf6",open:true};
  if (h>=8&&h<16)  return {name:"London",     color:"#3b82f6",bg:"rgba(59,130,246,0.1)",  dot:"#3b82f6",open:true};
  if (h>=13&&h<16) return {name:"LN-NY Overlap",color:"#ec4899",bg:"rgba(236,72,153,0.1)",dot:"#ec4899",open:true};
  if (h>=16&&h<21) return {name:"New York",   color:"#22c55e",bg:"rgba(34,197,94,0.1)",   dot:"#22c55e",open:true};
  return {name:"Market Closed",color:"#64748b",bg:"rgba(100,116,139,0.07)",dot:"#64748b",open:false};
}

function FadeIn({ children, delay=0, style={} }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity="0"; el.style.transform="translateY(10px)";
    const t = setTimeout(() => {
      el.style.transition=`opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`;
      el.style.opacity="1"; el.style.transform="translateY(0)";
    }, 30);
    return () => clearTimeout(t);
  }, [delay]);
  return <div ref={ref} style={style}>{children}</div>;
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

function getBreakoutProb(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const range = result.r1 - result.s1 || 1;
  const clamp = Math.min(Math.max((cp - result.s1) / range, 0), 1);
  const bullPct = Math.round(clamp * 100);
  return { bullPct, bearPct: 100-bullPct, momentum: (result.r1-cp)<(cp-result.s1) ? "Dekat Resistance" : "Dekat Support" };
}

// ── NEW: Pivot Strength Indicator ────────────────────────
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

// ── NEW: Auto Bias Analyzer ───────────────────────────────
function getAutoBias(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const levels = [result.r3,result.r2,result.r1,result.pivot,result.s1,result.s2,result.s3];
  const above = levels.filter(l => l > cp).length;
  const below = levels.filter(l => l < cp).length;
  const bullScore = Math.round((below / 6) * 100);
  const distFromPP = ((cp - result.pivot) / result.pivot) * 100;
  let bias, biasColor, biasIcon;
  if (cp > result.r1)      { bias="STRONG BUY";  biasColor="#15803d"; biasIcon="🟢🟢🟢"; }
  else if (cp > result.pivot) { bias="BUY";       biasColor="#22c55e"; biasIcon="🟢🟢⚪"; }
  else if (cp > result.s1) { bias="NEUTRAL";      biasColor="#f59e0b"; biasIcon="🟡🟡⚪"; }
  else if (cp > result.s2) { bias="SELL";         biasColor="#f97316"; biasIcon="🔴🔴⚪"; }
  else                     { bias="STRONG SELL";  biasColor="#dc2626"; biasIcon="🔴🔴🔴"; }
  return { bias, biasColor, biasIcon, bullScore, above, below, distFromPP: distFromPP.toFixed(2) };
}

// ── NEW: Smart Entry Zone ─────────────────────────────────
function getSmartEntryZone(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const buffer = (result.r1 - result.s1) * 0.04;
  const zones = [];
  // Long zones
  if (cp >= result.pivot - buffer && cp <= result.pivot + buffer)
    zones.push({ type:"LONG", label:"Bounce PP", entryLow: result.pivot-buffer, entryHigh: result.pivot+buffer, sl: result.s1, tp: result.r1, quality: "A+", color:"#16a34a" });
  if (cp >= result.s1 - buffer && cp <= result.s1 + buffer)
    zones.push({ type:"LONG", label:"Bounce S1", entryLow: result.s1-buffer, entryHigh: result.s1+buffer, sl: result.s2, tp: result.pivot, quality: "A", color:"#22c55e" });
  if (cp >= result.s2 - buffer && cp <= result.s2 + buffer)
    zones.push({ type:"LONG", label:"Bounce S2", entryLow: result.s2-buffer, entryHigh: result.s2+buffer, sl: result.s3, tp: result.s1, quality: "B", color:"#84cc16" });
  // Short zones
  if (cp >= result.r1 - buffer && cp <= result.r1 + buffer)
    zones.push({ type:"SHORT", label:"Rejection R1", entryLow: result.r1-buffer, entryHigh: result.r1+buffer, sl: result.r2, tp: result.pivot, quality: "A", color:"#ef4444" });
  if (cp >= result.r2 - buffer && cp <= result.r2 + buffer)
    zones.push({ type:"SHORT", label:"Rejection R2", entryLow: result.r2-buffer, entryHigh: result.r2+buffer, sl: result.r3, tp: result.r1, quality: "A+", color:"#dc2626" });
  return zones.length > 0 ? zones : null;
}

// ── NEW: Auto Risk Calculator ─────────────────────────────
function AutoRiskCalc({ result, currentPrice, fmt, t, dark }) {
  const [capital, setCapital] = useState("10000000");
  const [riskPct, setRiskPct] = useState("2");
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const cap = parseFloat(capital.replace(/\D/g,"")), rPct = parseFloat(riskPct);
  if (isNaN(cap) || isNaN(rPct)) return null;
  const riskAmount = cap * (rPct / 100);
  const slLong = result.s1, slShort = result.r1;
  const riskPerShareLong = Math.abs(cp - slLong), riskPerShareShort = Math.abs(cp - slShort);
  const lotLong = riskPerShareLong > 0 ? Math.floor(riskAmount / riskPerShareLong) : 0;
  const lotShort = riskPerShareShort > 0 ? Math.floor(riskAmount / riskPerShareShort) : 0;
  const fmtRp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
  return (
    <div style={{ ...{background:t.card,borderRadius:"16px",border:`1px solid ${t.border}`,overflow:"hidden",marginBottom:"12px",boxShadow:dark?"0 4px 32px rgba(0,0,0,0.5)":"0 1px 4px rgba(0,0,0,0.06),0 6px 20px rgba(0,0,0,0.05)"} }}>
      <div style={{ padding:"12px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:"6px" }}>
        <span style={{ fontSize:"14px" }}>🧮</span>
        <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>AUTO RISK CALCULATOR</span>
      </div>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px" }}>
          <div>
            <label style={{ fontSize:"10px",fontWeight:700,color:"#f59e0b",display:"block",marginBottom:"4px" }}>MODAL (Rp)</label>
            <input type="number" value={capital} onChange={e=>setCapital(e.target.value)} placeholder="10000000"
              style={{ width:"100%",padding:"9px 10px",background:t.input,border:`1.5px solid ${t.border}`,borderRadius:"8px",color:t.text,fontSize:"13px",fontWeight:600,outline:"none",boxSizing:"border-box" }}
              onFocus={e=>{e.target.style.borderColor="#f59e0b";e.target.style.boxShadow="0 0 0 3px rgba(245,158,11,0.1)";}}
              onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
          </div>
          <div>
            <label style={{ fontSize:"10px",fontWeight:700,color:"#8b5cf6",display:"block",marginBottom:"4px" }}>RISK (%)</label>
            <div style={{ display:"flex",gap:"4px" }}>
              {["1","2","3"].map(v => (
                <button key={v} onClick={()=>setRiskPct(v)}
                  style={{ flex:1,padding:"9px 4px",background:riskPct===v?(dark?"#4c1d95":"#8b5cf6"):t.input,color:riskPct===v?"#fff":t.sub,border:`1.5px solid ${riskPct===v?"#8b5cf6":t.border}`,borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer" }}>
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom:"8px",padding:"10px 12px",background:dark?"rgba(22,163,74,0.08)":"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"10px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
            <span style={{ fontSize:"11px",fontWeight:700,color:"#16a34a" }}>📈 LONG (SL: {fmt(slLong)})</span>
            <span style={{ fontSize:"10px",color:t.sub }}>risk/share: {fmt(Math.round(riskPerShareLong))}</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px" }}>
            {[["Max Lot",lotLong+" lot","#16a34a"],["Risk Amount",fmtRp(riskAmount),"#f59e0b"],["Nilai Posisi",fmtRp(lotLong*cp),"#2563eb"]].map(([l,v,c])=>(
              <div key={l} style={{ background:dark?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.8)",borderRadius:"6px",padding:"6px 8px" }}>
                <div style={{ fontSize:"8px",color:t.sub,marginBottom:"2px" }}>{l}</div>
                <div style={{ fontSize:"11px",fontWeight:800,color:c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"10px 12px",background:dark?"rgba(220,38,38,0.08)":"#fef2f2",border:"1px solid #fecaca",borderRadius:"10px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
            <span style={{ fontSize:"11px",fontWeight:700,color:"#dc2626" }}>📉 SHORT (SL: {fmt(slShort)})</span>
            <span style={{ fontSize:"10px",color:t.sub }}>risk/share: {fmt(Math.round(riskPerShareShort))}</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px" }}>
            {[["Max Lot",lotShort+" lot","#dc2626"],["Risk Amount",fmtRp(riskAmount),"#f59e0b"],["Nilai Posisi",fmtRp(lotShort*cp),"#8b5cf6"]].map(([l,v,c])=>(
              <div key={l} style={{ background:dark?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.8)",borderRadius:"6px",padding:"6px 8px" }}>
                <div style={{ fontSize:"8px",color:t.sub,marginBottom:"2px" }}>{l}</div>
                <div style={{ fontSize:"11px",fontWeight:800,color:c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NEW: Trend Direction Arrow ────────────────────────────
function TrendArrow({ result, currentPrice, t, dark }) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const levels = [result.r3,result.r2,result.r1,result.pivot,result.s1,result.s2,result.s3];
  const above = levels.filter(l=>l>cp).length;
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
          <div style={{ fontSize:"18px",fontWeight:900,color:trendColor }}>{pctFromPP > 0 ? "+" : ""}{pctFromPP}%</div>
          <div style={{ fontSize:"9px",color:t.sub }}>dari PP</div>
        </div>
      </div>
      {/* Trend bar S3 to R3 */}
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

function PriceDistanceMeter({ result, currentPrice, fmt, t }) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const levels = [
    {label:"R3",value:result.r3,color:"#9f1239"},{label:"R2",value:result.r2,color:"#dc2626"},
    {label:"R1",value:result.r1,color:"#ea580c"},{label:"PP",value:result.pivot,color:"#2563eb"},
    {label:"S1",value:result.s1,color:"#16a34a"},{label:"S2",value:result.s2,color:"#0891b2"},{label:"S3",value:result.s3,color:"#7c3aed"},
  ];
  const dists = levels.map(l=>({...l,dist:l.value-cp,absDist:Math.abs(l.value-cp),pct:(((l.value-cp)/cp)*100).toFixed(2)}));
  const maxAbs = Math.max(...dists.map(d=>d.absDist)) || 1;
  return (
    <div style={{ padding:"14px 16px",borderTop:`1px solid ${t.border}` }}>
      <div style={{ fontSize:"10px",fontWeight:700,color:t.sub,letterSpacing:"1px",marginBottom:"10px" }}>📏 PRICE DISTANCE METER</div>
      {dists.map(({label,color,dist,absDist,pct}) => {
        const barW=(absDist/maxAbs)*100, isUp=dist>0;
        return (
          <div key={label} style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"5px" }}>
            <div style={{ width:"22px",fontSize:"9px",fontWeight:700,color,textAlign:"right" }}>{label}</div>
            <div style={{ flex:1,position:"relative",height:"20px",display:"flex",alignItems:"center" }}>
              <div style={{ position:"absolute",left:"50%",top:"50%",width:"1px",height:"14px",background:t.border,transform:"translateY(-50%)" }} />
              {isUp
                ? <div style={{ position:"absolute",left:"50%",height:"6px",width:`${barW/2}%`,background:`linear-gradient(90deg,${color}40,${color})`,borderRadius:"0 3px 3px 0",top:"50%",transform:"translateY(-50%)" }} />
                : <div style={{ position:"absolute",right:"50%",height:"6px",width:`${barW/2}%`,background:`linear-gradient(270deg,${color}40,${color})`,borderRadius:"3px 0 0 3px",top:"50%",transform:"translateY(-50%)" }} />
              }
            </div>
            <div style={{ width:"60px",textAlign:"right" }}><span style={{ fontSize:"10px",fontWeight:700,color:isUp?"#16a34a":"#dc2626" }}>{isUp?"+":""}{pct}%</span></div>
            <div style={{ width:"46px",textAlign:"right" }}><span style={{ fontSize:"9px",color:t.sub }}>{isUp?"+":""}{fmt(Math.round(dist))}</span></div>
          </div>
        );
      })}
      <div style={{ textAlign:"center",marginTop:"5px",fontSize:"9px",color:t.sub }}>◀ bearish | bullish ▶ · garis tengah = harga saat ini</div>
    </div>
  );
}

function TradeSetup({ result, currentPrice, fmt, t, dark }) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const setups = [];
  if (Math.abs(cp-result.pivot)/result.pivot < 0.015) setups.push({name:"Bounce dari Pivot",type:cp>result.pivot?"LONG":"SHORT",entry:cp,sl:cp>result.pivot?result.s1:result.r1,tp:cp>result.pivot?result.r1:result.s1,confidence:72,reason:"Harga mendekati Pivot Point, area konsolidasi kuat",color:cp>result.pivot?"#16a34a":"#dc2626"});
  if (cp>result.r1*0.995&&cp<result.r1*1.005) setups.push({name:"Breakout R1",type:"LONG",entry:result.r1,sl:result.pivot,tp:result.r2,tp2:result.r3,confidence:65,reason:"Harga menguji R1, potensi breakout menuju R2",color:"#ea580c"});
  if (cp>result.s1*0.995&&cp<result.s1*1.008) setups.push({name:"Bounce dari S1",type:"LONG",entry:result.s1,sl:result.s2,tp:result.pivot,tp2:result.r1,confidence:68,reason:"S1 adalah support kuat, ideal untuk buy on dip",color:"#16a34a"});
  if (cp>result.r2*0.997&&cp<result.r2*1.01) setups.push({name:"Rejection R2",type:"SHORT",entry:result.r2,sl:result.r3,tp:result.r1,tp2:result.pivot,confidence:62,reason:"R2 area resistance kuat, potensi reversal bearish",color:"#dc2626"});
  if (setups.length===0) { const up=cp>result.pivot; setups.push({name:up?"Trend Following Long":"Trend Following Short",type:up?"LONG":"SHORT",entry:cp,sl:up?result.s1:result.r1,tp:up?result.r1:result.s1,tp2:up?result.r2:result.s2,confidence:55,reason:up?"Harga di atas PP, bias bullish":"Harga di bawah PP, bias bearish",color:up?"#16a34a":"#dc2626"}); }
  return (
    <div style={{ marginBottom:"12px" }}>
      <div style={{ fontSize:"10px",fontWeight:700,color:t.sub,letterSpacing:"1px",marginBottom:"8px" }}>⚡ TRADE SETUP GENERATOR</div>
      {setups.map((s,i) => {
        const rr=s.tp&&s.sl?Math.abs(s.tp-s.entry)/Math.abs(s.sl-s.entry):0;
        const bgC=s.type==="LONG"?(dark?"rgba(22,163,74,0.07)":"#f0fdf4"):(dark?"rgba(220,38,38,0.07)":"#fef2f2");
        return (
          <div key={i} style={{ background:bgC,border:`1px solid ${s.type==="LONG"?"#bbf7d0":"#fecaca"}`,borderRadius:"12px",padding:"14px",marginBottom:"8px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px" }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px" }}>
                  <span style={{ fontSize:"11px",fontWeight:900,color:s.color,background:`${s.color}18`,padding:"2px 8px",borderRadius:"4px" }}>{s.type}</span>
                  <span style={{ fontSize:"12px",fontWeight:700,color:t.text }}>{s.name}</span>
                </div>
                <div style={{ fontSize:"10px",color:t.sub,lineHeight:1.4 }}>{s.reason}</div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0,marginLeft:"8px" }}>
                <div style={{ fontSize:"9px",color:t.sub }}>CONFIDENCE</div>
                <div style={{ fontSize:"16px",fontWeight:900,color:s.confidence>=70?"#16a34a":s.confidence>=60?"#f59e0b":"#f97316" }}>{s.confidence}%</div>
              </div>
            </div>
            <div style={{ height:"4px",background:dark?"#1e293b":"#e2e8f0",borderRadius:"99px",overflow:"hidden",marginBottom:"10px" }}>
              <div style={{ height:"100%",width:`${s.confidence}%`,background:s.confidence>=70?"#16a34a":s.confidence>=60?"#f59e0b":"#f97316",borderRadius:"99px",transition:"width 0.6s ease" }} />
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px" }}>
              {[["Entry",fmt(Math.round(s.entry)),t.text],["Stop Loss",fmt(Math.round(s.sl)),"#ef4444"],["Target 1",fmt(Math.round(s.tp)),"#16a34a"],...(s.tp2?[["Target 2",fmt(Math.round(s.tp2)),"#0891b2"]]:[]),["Risk",fmt(Math.abs(Math.round(s.entry-s.sl))),"#f59e0b"],["R/R",`1:${rr.toFixed(1)}`,"#8b5cf6"]].map(([label,val,color])=>(
                <div key={label} style={{ background:dark?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.7)",borderRadius:"6px",padding:"6px 8px" }}>
                  <div style={{ fontSize:"8px",color:t.sub,marginBottom:"2px" }}>{label}</div>
                  <div style={{ fontSize:"11px",fontWeight:800,color }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export default function PivotAnalyzer() {
  const [high,setHigh]=useState(""); const [low,setLow]=useState(""); const [close,setClose]=useState("");
  const [currentPrice,setCurrentPrice]=useState(""); const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false); const [progress,setProgress]=useState(0);
  const [dark,setDark]=useState(false); const [copied,setCopied]=useState(false);
  const [history,setHistory]=useState(()=>{ try{return JSON.parse(localStorage.getItem("pivot_history")||"[]");}catch{return[];} });
  const [tab,setTab]=useState("main");
  const [avgEntries,setAvgEntries]=useState([{price:"",lot:""},{price:"",lot:""}]);
  const [avgResult,setAvgResult]=useState(null);
  const [session]=useState(getSession());
  const [glowLevel,setGlowLevel]=useState(null);
  const [time,setTime]=useState(new Date());

  useEffect(()=>{ const iv=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(iv); },[]);

  const fmt=(n)=>n!=null?n.toLocaleString("id-ID"):"—";
  const fmtDec=(n)=>n!=null?parseFloat(n.toFixed(2)).toLocaleString("id-ID",{minimumFractionDigits:0,maximumFractionDigits:2}):"—";

  const t={
    bg:dark?"#080e1a":"#f0f4f8", card:dark?"#111827":"#ffffff", cardInner:dark?"#0d1520":"#f8fafc",
    border:dark?"#1e2d42":"#e2e8f0", text:dark?"#f0f6ff":"#0f172a", sub:dark?"#7a92b0":"#64748b", input:dark?"#080e1a":"#f8fafc",
  };
  const cardStyle={background:t.card,borderRadius:"16px",border:`1px solid ${t.border}`,overflow:"hidden",marginBottom:"12px",position:"relative",boxShadow:dark?"0 4px 32px rgba(0,0,0,0.5)":"0 1px 4px rgba(0,0,0,0.06),0 6px 20px rgba(0,0,0,0.05)",transition:"background 0.3s, border-color 0.3s"};
  const inputStyle={width:"100%",padding:"10px",background:t.input,border:`1.5px solid ${t.border}`,borderRadius:"8px",color:t.text,fontSize:"14px",fontWeight:600,outline:"none",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s",fontFamily:"inherit"};

  const clear=()=>{setHigh("");setLow("");setClose("");setCurrentPrice("");setResult(null);setProgress(0);setGlowLevel(null);};

  const hitung=()=>{
    const h=parseFloat(high),l=parseFloat(low),c=parseFloat(close);
    if(isNaN(h)||isNaN(l)||isNaN(c)) return;
    setLoading(true);setProgress(0);setResult(null);
    let p=0; const iv=setInterval(()=>{p+=Math.random()*22+6;if(p>=100){p=100;clearInterval(iv);}setProgress(Math.min(Math.round(p),100));},45);
    setTimeout(()=>{
      const pivot=(h+l+c)/3;
      const res={pivot:Math.round(pivot),r1:Math.round(2*pivot-l),r2:Math.round(pivot+(h-l)),r3:Math.round(h+2*(pivot-l)),s1:Math.round(2*pivot-h),s2:Math.round(pivot-(h-l)),s3:Math.round(l-2*(h-pivot)),high:h,low:l,close:c};
      setResult(res);setLoading(false);
      const entry={...res,date:new Date().toLocaleDateString("id-ID"),time:new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})};
      const updated=[entry,...history].slice(0,10); setHistory(updated);
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
    const s=getSentiment();
    const text=`📊 PIVOT POINT ANALISA\n━━━━━━━━━━━━━━━━\nR3: ${fmt(result.r3)}\nR2: ${fmt(result.r2)}\nR1: ${fmt(result.r1)}\nPP: ${fmt(result.pivot)}\nS1: ${fmt(result.s1)}\nS2: ${fmt(result.s2)}\nS3: ${fmt(result.s3)}\n━━━━━━━━━━━━━━━━\n${s?`Sentiment: ${s.label}\n`:""}📈 NAIK: ${fmt(result.pivot)} → ${fmt(result.r1)} → ${fmt(result.r2)} → ${fmt(result.r3)}\n📉 TURUN: ${fmt(result.pivot)} → ${fmt(result.s1)} → ${fmt(result.s2)} → ${fmt(result.s3)}\n\n#PivotPoint #Trading #IDX`;
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

  const sentiment=getSentiment(), nearest=getNearest(), breakout=getBreakoutProb(result,currentPrice);
  const pivotStrength=getPivotStrength(result);
  const autoBias=getAutoBias(result,currentPrice);
  const smartZones=getSmartEntryZone(result,currentPrice);
  const cp=parseFloat(currentPrice);

  const levelDefs=result?[
    {label:"R3",sub:"Resistance 3",value:result.r3,color:"#9f1239",light:dark?"#4c0519":"#fff1f2",border:"#fda4af"},
    {label:"R2",sub:"Resistance 2",value:result.r2,color:"#dc2626",light:dark?"#3b0f0f":"#fef2f2",border:"#fecaca"},
    {label:"R1",sub:"Resistance 1",value:result.r1,color:"#ea580c",light:dark?"#431407":"#fff7ed",border:"#fed7aa"},
    {label:"PP",sub:"Pivot Point", value:result.pivot,color:"#2563eb",light:dark?"#1a2f50":"#eff6ff",border:"#bfdbfe",bold:true},
    {label:"S1",sub:"Support 1",   value:result.s1,color:"#16a34a",light:dark?"#14532d":"#f0fdf4",border:"#bbf7d0"},
    {label:"S2",sub:"Support 2",   value:result.s2,color:"#0891b2",light:dark?"#164e63":"#ecfeff",border:"#a5f3fc"},
    {label:"S3",sub:"Support 3",   value:result.s3,color:"#7c3aed",light:dark?"#2e1065":"#f5f3ff",border:"#c4b5fd"},
  ]:[];

  const floatPct=(()=>{ if(!result||!currentPrice||!levelDefs.length) return null; if(isNaN(cp)) return null; const max=levelDefs[0].value,min=levelDefs[6].value,range=max-min; return range>0?Math.min(Math.max(((cp-min)/range)*100,0),100):null; })();
  const tabStyle=(active)=>({flex:1,padding:"9px 4px",background:active?(dark?"#1e3a5f":"#0f172a"):"transparent",color:active?"#fff":t.sub,border:"none",borderRadius:"8px",fontSize:"11px",fontWeight:700,cursor:"pointer",transition:"all 0.2s"});

  return (
    <div style={{ minHeight:"100vh",background:t.bg,display:"flex",justifyContent:"center",padding:"24px 16px",fontFamily:"'Segoe UI',system-ui,sans-serif",transition:"background 0.4s",position:"relative" }}>
      <Particles dark={dark} />
      <div style={{ width:"100%",maxWidth:"430px",position:"relative",zIndex:1 }}>

        <FadeIn delay={0}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
              <div style={{ width:"38px",height:"38px",background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:"11px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"19px",boxShadow:"0 4px 14px rgba(124,58,237,0.35)" }}>📐</div>
              <div>
                <div style={{ fontSize:"17px",fontWeight:800,color:t.text }}>Pivot Analyzer</div>
                <div style={{ fontSize:"10px",color:t.sub }}>Classical Floor Method · R3/S3</div>
              </div>
            </div>
            <button onClick={()=>setDark(d=>!d)} style={{ padding:"7px 14px",background:t.card,border:`1px solid ${t.border}`,borderRadius:"20px",cursor:"pointer",fontSize:"13px",color:t.text }}>{dark?"☀️":"🌙"}</button>
          </div>
        </FadeIn>

        <FadeIn delay={60}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:session.bg,border:`1px solid ${session.color}30`,borderRadius:"10px",padding:"9px 14px",marginBottom:"12px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
              <div style={{ width:"7px",height:"7px",borderRadius:"50%",background:session.dot,boxShadow:`0 0 8px ${session.dot}`,animation:session.open?"pulse 1.8s infinite":"none" }} />
              <span style={{ fontSize:"12px",fontWeight:700,color:session.color }}>{session.name}</span>
              <span style={{ fontSize:"10px",color:t.sub }}>{session.open?"• OPEN":"• CLOSED"}</span>
            </div>
            <span style={{ fontSize:"11px",fontWeight:700,color:t.sub }}>{time.toLocaleTimeString("id-ID")}</span>
          </div>
        </FadeIn>

        <FadeIn delay={90}>
          <div style={{ display:"flex",gap:"4px",background:t.card,padding:"4px",borderRadius:"12px",marginBottom:"14px",border:`1px solid ${t.border}` }}>
            {[["main","📊 Analisa"],["avg","🧮 Avg Down"],["history","🕐 History"]].map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={tabStyle(tab===key)}>{label}</button>
            ))}
          </div>
        </FadeIn>

        {tab==="main" && <>
          <FadeIn delay={120}>
            <div style={cardStyle}>
              <div style={{ padding:"13px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>DATA OHLC</span>
                <button onClick={clear} style={{ fontSize:"11px",color:"#ef4444",background:dark?"#3b0f0f":"#fef2f2",border:"1px solid #fecaca",borderRadius:"6px",padding:"3px 10px",cursor:"pointer",fontWeight:700 }}>✕ Clear</button>
              </div>
              <div style={{ padding:"16px" }}>
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
                <div style={{ marginBottom:"12px" }}>
                  <label style={{ fontSize:"11px",fontWeight:700,color:"#8b5cf6",display:"block",marginBottom:"5px" }}>🎯 Harga Sekarang (opsional)</label>
                  <input type="number" value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)} placeholder="Aktifkan semua fitur analisa" style={inputStyle}
                    onFocus={e=>{e.target.style.borderColor="#8b5cf6";e.target.style.boxShadow="0 0 0 3px rgba(139,92,246,0.12)";}}
                    onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
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
                <button onClick={hitung} disabled={loading}
                  style={{ width:"100%",padding:"13px",background:loading?t.border:"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:loading?t.sub:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:800,cursor:loading?"wait":"pointer",boxShadow:loading?"none":"0 4px 16px rgba(124,58,237,0.35)",transition:"all 0.2s" }}>
                  {loading?`Menghitung... ${progress}%`:"⟳  Hitung Pivot Point"}
                </button>
              </div>
            </div>
          </FadeIn>

          {/* Pivot Strength Indicator */}
          {pivotStrength && (
            <FadeIn delay={0}>
              <div style={{ ...cardStyle,padding:"14px 16px" }}>
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

          {/* Trend Direction Arrow */}
          {result && currentPrice && (
            <FadeIn delay={0}>
              <TrendArrow result={result} currentPrice={currentPrice} t={t} dark={dark} />
            </FadeIn>
          )}

          {/* Auto Bias Analyzer */}
          {autoBias && (
            <FadeIn delay={0}>
              <div style={{ ...cardStyle,padding:"14px 16px" }}>
                <div style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px",marginBottom:"10px" }}>🧠 AUTO BIAS ANALYZER</div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
                  <div>
                    <div style={{ fontSize:"10px",color:t.sub,marginBottom:"3px" }}>REKOMENDASI BIAS</div>
                    <div style={{ fontSize:"18px",fontWeight:900,color:autoBias.biasColor }}>{autoBias.bias}</div>
                    <div style={{ fontSize:"13px",marginTop:"2px" }}>{autoBias.biasIcon}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"10px",color:t.sub,marginBottom:"3px" }}>BULL SCORE</div>
                    <div style={{ fontSize:"24px",fontWeight:900,color:autoBias.bullScore>50?"#16a34a":"#dc2626" }}>{autoBias.bullScore}%</div>
                  </div>
                </div>
                <div style={{ height:"8px",background:t.border,borderRadius:"99px",overflow:"hidden",marginBottom:"8px",display:"flex" }}>
                  <div style={{ height:"100%",width:`${autoBias.bullScore}%`,background:"linear-gradient(90deg,#16a34a,#22c55e)",borderRadius:"99px 0 0 99px",transition:"width 0.8s ease" }} />
                  <div style={{ height:"100%",flex:1,background:"linear-gradient(90deg,#ef4444,#dc2626)",borderRadius:"0 99px 99px 0" }} />
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px" }}>
                  {[["Level di Atas",autoBias.above+" level","#dc2626"],["Level di Bawah",autoBias.below+" level","#16a34a"],["Jarak dari PP",autoBias.distFromPP+"%",autoBias.biasColor]].map(([l,v,c])=>(
                    <div key={l} style={{ textAlign:"center",padding:"7px 5px",background:t.cardInner,borderRadius:"8px",border:`1px solid ${t.border}` }}>
                      <div style={{ fontSize:"8px",color:t.sub,marginBottom:"2px" }}>{l}</div>
                      <div style={{ fontSize:"12px",fontWeight:800,color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}

          {/* Smart Entry Zone */}
          {smartZones && (
            <FadeIn delay={0}>
              <div style={{ marginBottom:"12px" }}>
                <div style={{ fontSize:"10px",fontWeight:700,color:t.sub,letterSpacing:"1px",marginBottom:"8px" }}>🎯 SMART ENTRY ZONE</div>
                {smartZones.map((zone,i)=>(
                  <div key={i} style={{ background:zone.type==="LONG"?(dark?"rgba(22,163,74,0.08)":"#f0fdf4"):(dark?"rgba(220,38,38,0.08)":"#fef2f2"),border:`1px solid ${zone.type==="LONG"?"#bbf7d0":"#fecaca"}`,borderRadius:"12px",padding:"12px 14px",marginBottom:"8px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                        <span style={{ fontSize:"10px",fontWeight:900,color:zone.color,background:`${zone.color}15`,padding:"2px 7px",borderRadius:"4px" }}>{zone.type}</span>
                        <span style={{ fontSize:"12px",fontWeight:700,color:t.text }}>{zone.label}</span>
                      </div>
                      <span style={{ fontSize:"12px",fontWeight:900,background:zone.quality==="A+"?(dark?"rgba(22,163,74,0.2)":"#dcfce7"):zone.quality==="A"?(dark?"rgba(245,158,11,0.2)":"#fffbeb"):(dark?"rgba(99,102,241,0.2)":"#e0e7ff"),color:zone.quality==="A+"?"#16a34a":zone.quality==="A"?"#f59e0b":"#6366f1",padding:"2px 8px",borderRadius:"6px" }}>{zone.quality}</span>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px" }}>
                      {[["Entry Low",fmt(Math.round(zone.entryLow)),zone.color],["Entry High",fmt(Math.round(zone.entryHigh)),zone.color],["Stop Loss",fmt(Math.round(zone.sl)),"#ef4444"],["Target",fmt(Math.round(zone.tp)),"#16a34a"],["Risk",fmt(Math.round(Math.abs(zone.entryLow-zone.sl))),"#f59e0b"],["R/R",`1:${(Math.abs(zone.tp-zone.entryLow)/Math.abs(zone.entryLow-zone.sl)).toFixed(1)}`,"#8b5cf6"]].map(([l,v,c])=>(
                        <div key={l} style={{ background:dark?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.8)",borderRadius:"6px",padding:"6px 8px" }}>
                          <div style={{ fontSize:"8px",color:t.sub,marginBottom:"2px" }}>{l}</div>
                          <div style={{ fontSize:"11px",fontWeight:800,color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          )}

          {/* Sentiment */}
          {sentiment && (
            <FadeIn delay={0}>
              <div style={{ background:sentiment.bg,border:`1px solid ${sentiment.border}`,borderRadius:"12px",padding:"12px 16px",marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"10px",color:t.sub,marginBottom:"2px",fontWeight:600,letterSpacing:"1px" }}>MARKET SENTIMENT</div>
                  <div style={{ fontSize:"16px",fontWeight:800,color:sentiment.color }}>{sentiment.label}</div>
                </div>
                {nearest && (
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"10px",color:t.sub,marginBottom:"2px" }}>TARGET TERDEKAT</div>
                    <div style={{ fontSize:"13px",fontWeight:800,color:t.text }}>↑ {nearest.above?.label??"—"} | {nearest.below?.label??"—"} ↓</div>
                  </div>
                )}
              </div>
            </FadeIn>
          )}

          {/* Breakout Probability */}
          {breakout && (
            <FadeIn delay={0}>
              <div style={{ ...cardStyle,padding:"14px 16px" }}>
                <div style={{ fontSize:"10px",fontWeight:700,color:t.sub,letterSpacing:"1px",marginBottom:"10px" }}>📊 BREAKOUT PROBABILITY</div>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"6px" }}>
                  <span style={{ fontSize:"12px",fontWeight:800,color:"#16a34a" }}>▲ Bullish {breakout.bullPct}%</span>
                  <span style={{ fontSize:"11px",color:t.sub }}>{breakout.momentum}</span>
                  <span style={{ fontSize:"12px",fontWeight:800,color:"#dc2626" }}>{breakout.bearPct}% Bearish ▼</span>
                </div>
                <div style={{ height:"10px",background:t.border,borderRadius:"99px",overflow:"hidden",marginBottom:"6px",display:"flex" }}>
                  <div style={{ height:"100%",width:`${breakout.bullPct}%`,background:"linear-gradient(90deg,#16a34a,#22c55e)",borderRadius:"99px 0 0 99px",transition:"width 0.8s ease" }} />
                  <div style={{ height:"100%",flex:1,background:"linear-gradient(90deg,#ef4444,#dc2626)",borderRadius:"0 99px 99px 0" }} />
                </div>
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontSize:"9px",color:"#16a34a" }}>Target: {fmt(result.r1)}</span>
                  <span style={{ fontSize:"9px",color:t.sub }}>PP: {fmt(result.pivot)}</span>
                  <span style={{ fontSize:"9px",color:"#dc2626" }}>Target: {fmt(result.s1)}</span>
                </div>
              </div>
            </FadeIn>
          )}

          {/* Pivot Ladder */}
          {levelDefs.length>0 && (
            <FadeIn delay={0}>
              <div style={cardStyle}>
                <HeatmapBg levels={levelDefs} currentPrice={currentPrice} dark={dark} />
                <div style={{ position:"relative",zIndex:1 }}>
                  <div style={{ padding:"12px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>PIVOT LADDER</span>
                    <span style={{ fontSize:"11px",color:t.sub }}>7 LEVEL · HEATMAP</span>
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
                  <PriceDistanceMeter result={result} currentPrice={currentPrice} fmt={fmt} t={t} />
                </div>
              </div>
            </FadeIn>
          )}

          {/* Auto Risk Calculator */}
          {result && currentPrice && (
            <FadeIn delay={0}>
              <AutoRiskCalc result={result} currentPrice={currentPrice} fmt={fmt} t={t} dark={dark} />
            </FadeIn>
          )}

          {/* Trade Setup */}
          {result && currentPrice && (
            <FadeIn delay={0}><TradeSetup result={result} currentPrice={currentPrice} fmt={fmt} t={t} dark={dark} /></FadeIn>
          )}

          {/* Scenario + Copy */}
        {/* Scenario + Copy */}
{result && (
  <FadeIn delay={0}>
    <div style={{ marginBottom:"12px" }}>

      <div style={{
        fontSize:"10px",
        color:t.sub,
        marginBottom:"10px",
        padding:"8px 10px",
        background:dark?"rgba(37,99,235,0.08)":"#eff6ff",
        border:"1px solid #bfdbfe",
        borderRadius:"8px"
      }}>
        Analisa menggunakan metode <b>Pivot Point (Floor Method)</b> untuk menentukan area support dan resistance intraday.
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:"8px",marginBottom:"10px" }}>

        {/* Bullish */}
        <div style={{
          background:dark?"#14532d":"#f0fdf4",
          border:"1px solid #bbf7d0",
          borderRadius:"12px",
          padding:"14px 16px"
        }}>
          <div style={{ display:"flex",gap:"6px",alignItems:"center",marginBottom:"8px" }}>
            <span>📈</span>
            <span style={{ fontSize:"11px",fontWeight:800,color:"#16a34a" }}>
              SKENARIO NAIK (BULLISH)
            </span>
          </div>

          <p style={{ margin:0,fontSize:"12px",lineHeight:1.7,color:dark?"#bbf7d0":"#166534" }}>
            Jika harga mampu bertahan di atas <b>{fmt(result.pivot)}</b>, maka bias market cenderung bullish.
            <br/><br/>

            Konfirmasi kenaikan terjadi jika harga menembus <b>{fmt(result.r1)}</b>.
            <br/><br/>

            Target kenaikan:
            <br/>• Target 1 → <b>{fmt(result.r1)}</b>
            <br/>• Target 2 → <b>{fmt(result.r2)}</b>
            <br/>• Target 3 → <b>{fmt(result.r3)}</b>

            <br/><br/>

            Invalidasi bullish jika harga kembali turun di bawah <b>{fmt(result.pivot)}</b>.
          </p>
        </div>

        {/* Bearish */}
        <div style={{
          background:dark?"#7f1d1d":"#fef2f2",
          border:"1px solid #fecaca",
          borderRadius:"12px",
          padding:"14px 16px"
        }}>
          <div style={{ display:"flex",gap:"6px",alignItems:"center",marginBottom:"8px" }}>
            <span>📉</span>
            <span style={{ fontSize:"11px",fontWeight:800,color:"#dc2626" }}>
              SKENARIO TURUN (BEARISH)
            </span>
          </div>

          <p style={{ margin:0,fontSize:"12px",lineHeight:1.7,color:dark?"#fecaca":"#991b1b" }}>
            Jika harga gagal bertahan di atas <b>{fmt(result.pivot)}</b>, maka tekanan jual berpotensi muncul.
            <br/><br/>

            Konfirmasi penurunan terjadi jika harga menembus <b>{fmt(result.s1)}</b>.
            <br/><br/>

            Target penurunan:
            <br/>• Target 1 → <b>{fmt(result.s1)}</b>
            <br/>• Target 2 → <b>{fmt(result.s2)}</b>
            <br/>• Target 3 → <b>{fmt(result.s3)}</b>

            <br/><br/>

            Invalidasi bearish jika harga kembali naik di atas <b>{fmt(result.pivot)}</b>.
          </p>
        </div>

      </div>

      {/* Copy Button */}
      <button
        onClick={copyAnalisa}
        style={{
          width:"100%",
          padding:"13px",
          background:copied?"#16a34a":"#2563eb",
          color:"#fff",
          border:"none",
          borderRadius:"10px",
          fontSize:"13px",
          fontWeight:800,
          cursor:"pointer",
          transition:"background 0.3s",
          boxShadow:copied
            ?"0 4px 14px rgba(22,163,74,0.4)"
            :"0 4px 14px rgba(37,99,235,0.35)"
        }}
      >
        {copied ? "✅ Berhasil Disalin!" : "📋 Copy Analisa"}
      </button>

    </div>
  </FadeIn>
)}
        </>}

        {tab==="avg" && (
          <FadeIn delay={0}>
            <div>
              <div style={cardStyle}>
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
                  <button onClick={hitungAvg} style={{ width:"100%",padding:"13px",background:"linear-gradient(135deg,#16a34a,#0891b2)",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:800,cursor:"pointer",boxShadow:"0 4px 14px rgba(8,145,178,0.35)" }}>🧮 Hitung Average</button>
                </div>
              </div>
              {avgResult&&(
                <FadeIn delay={0}>
                  <div style={cardStyle}>
                    <div style={{ padding:"13px 16px",borderBottom:`1px solid ${t.border}` }}><span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>HASIL KALKULASI</span></div>
                    <div style={{ padding:"16px" }}>
                      <div style={{ textAlign:"center",padding:"16px",background:t.cardInner,borderRadius:"10px",marginBottom:"14px",border:`1px solid ${t.border}`,boxShadow:"0 0 20px rgba(37,99,235,0.1)" }}>
                        <div style={{ fontSize:"11px",color:t.sub,marginBottom:"4px",fontWeight:600,letterSpacing:"1px" }}>HARGA RATA-RATA</div>
                        <div style={{ fontSize:"32px",fontWeight:900,color:"#2563eb",letterSpacing:"-1px",textShadow:"0 0 20px rgba(37,99,235,0.3)" }}><AnimNum value={avgResult.avgPrice} fmt={fmtDec} /></div>
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
                    </div>
                  </div>
                </FadeIn>
              )}
            </div>
          </FadeIn>
        )}

        {tab==="history" && (
          <FadeIn delay={0}>
            <div style={cardStyle}>
              <div style={{ padding:"13px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>🕐 RIWAYAT KALKULASI</span>
                {history.length>0&&<button onClick={()=>{setHistory([]);try{localStorage.removeItem("pivot_history");}catch{}}} style={{ fontSize:"10px",color:"#ef4444",background:dark?"#3b0f0f":"#fef2f2",border:"1px solid #fecaca",borderRadius:"6px",padding:"2px 8px",cursor:"pointer",fontWeight:700 }}>Hapus Semua</button>}
              </div>
              {history.length===0
                ? <div style={{ textAlign:"center",padding:"40px 20px",color:t.sub,fontSize:"13px" }}>Belum ada riwayat 📭</div>
                : history.map((h,i)=>(
                  <div key={i} style={{ padding:"13px 16px",borderBottom:i<history.length-1?`1px solid ${t.border}`:"none" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"8px" }}>
                      <span style={{ fontSize:"11px",fontWeight:700,color:t.text }}>H:{fmt(Math.round(h.high))} L:{fmt(Math.round(h.low))} C:{fmt(Math.round(h.close))}</span>
                      <span style={{ fontSize:"10px",color:t.sub }}>{h.date} {h.time}</span>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px" }}>
                      {[["R3",h.r3,"#9f1239"],["R2",h.r2,"#dc2626"],["R1",h.r1,"#ea580c"],["PP",h.pivot,"#2563eb"],["S1",h.s1,"#16a34a"],["S2",h.s2,"#0891b2"],["S3",h.s3,"#7c3aed"]].map(([label,val,color])=>(
                        <div key={label} style={{ textAlign:"center",padding:"5px 3px",background:t.cardInner,borderRadius:"6px",border:`1px solid ${t.border}` }}>
                          <div style={{ fontSize:"8px",fontWeight:700,color }}>{label}</div>
                          <div style={{ fontSize:"9px",fontWeight:700,color:t.text }}>{fmt(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          </FadeIn>
        )}

        <p style={{ textAlign:"center",marginTop:"16px",fontSize:"10px",color:t.sub }}>For educational use only · Pivot Analyzer Pro</p>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}`}</style>
    </div>
  );
}