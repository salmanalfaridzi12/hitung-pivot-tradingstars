import React, { useState, useRef, useEffect } from "react";

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
  }, [target, duration]);
  return val;
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
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [dark]);
  return <canvas ref={canvasRef} style={{ position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0 }} />;
}

function getSession() {
  const h = new Date().getUTCHours();
  if (h>=0&&h<7)   return {name:"WIB", color:"#f59e0b", bg:"rgba(245,158,11,0.1)", dot:"#f59e0b", open:true};
  if (h>=8&&h<16)  return {name:"London", color:"#3b82f6", bg:"rgba(59,130,246,0.1)", dot:"#3b82f6", open:true};
  if (h>=16&&h<21) return {name:"New York", color:"#22c55e", bg:"rgba(34,197,94,0.1)", dot:"#22c55e", open:true};
  return {name:"Market Closed", color:"#64748b", bg:"rgba(100,116,139,0.07)", dot:"#64748b", open:false};
}

function FadeIn({ children, delay=0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity="0"; el.style.transform="translateY(10px)";
    setTimeout(() => {
      if(el) {
        el.style.transition=`opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`;
        el.style.opacity="1"; el.style.transform="translateY(0)";
      }
    }, 30);
  }, [delay]);
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

function getAutoBias(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const levels = [result.r3,result.r2,result.r1,result.pivot,result.s1,result.s2,result.s3];
  // ✅ FIX 2: hapus variabel 'above' yang tidak dipakai
  const below = levels.filter(l => l < cp).length;
  const bullScore = Math.round((below / 6) * 100);
  const distFromPP = ((cp - result.pivot) / result.pivot) * 100;
  let bias, biasColor, biasIcon;
  if (cp > result.r1)      { bias="STRONG BUY";  biasColor="#15803d"; biasIcon="🟢🟢🟢"; }
  else if (cp > result.pivot) { bias="BUY";       biasColor="#22c55e"; biasIcon="🟢🟢⚪"; }
  else if (cp > result.s1) { bias="NEUTRAL";      biasColor="#f59e0b"; biasIcon="🟡🟡⚪"; }
  else if (cp > result.s2) { bias="SELL";         biasColor="#f97316"; biasIcon="🔴🔴⚪"; }
  else                     { bias="STRONG SELL";  biasColor="#dc2626"; biasIcon="🔴🔴🔴"; }
  // Hitung ulang above dari levels untuk UI card
  const aboveCount = levels.filter(l => l > cp).length;
  return { bias, biasColor, biasIcon, bullScore, above: aboveCount, below, distFromPP: distFromPP.toFixed(2) };
}

function getSmartEntryZone(result, currentPrice) {
  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const buffer = (result.r1 - result.s1) * 0.04;
  const zones = [];
  if (cp >= result.pivot - buffer && cp <= result.pivot + buffer)
    zones.push({ type:"LONG", label:"Bounce PP", entryLow: result.pivot-buffer, entryHigh: result.pivot+buffer, sl: result.s1, tp: result.r1, quality: "A+", color:"#16a34a" });
  if (cp >= result.s1 - buffer && cp <= result.s1 + buffer)
    zones.push({ type:"LONG", label:"Bounce S1", entryLow: result.s1-buffer, entryHigh: result.s1+buffer, sl: result.s2, tp: result.pivot, quality: "A", color:"#22c55e" });
  if (cp >= result.s2 - buffer && cp <= result.s2 + buffer)
    zones.push({ type:"LONG", label:"Bounce S2", entryLow: result.s2-buffer, entryHigh: result.s2+buffer, sl: result.s3, tp: result.s1, quality: "B", color:"#84cc16" });
  if (cp >= result.r1 - buffer && cp <= result.r1 + buffer)
    zones.push({ type:"SHORT", label:"Rejection R1", entryLow: result.r1-buffer, entryHigh: result.r1+buffer, sl: result.r2, tp: result.pivot, quality: "A", color:"#ef4444" });
  if (cp >= result.r2 - buffer && cp <= result.r2 + buffer)
    zones.push({ type:"SHORT", label:"Rejection R2", entryLow: result.r2-buffer, entryHigh: result.r2+buffer, sl: result.r3, tp: result.r1, quality: "A+", color:"#dc2626" });
  return zones.length > 0 ? zones : null;
}

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

function FibonacciCard({ result, currentPrice, fmt, t, dark, cardStyle }) {
  if (!result) return null;
  const { high, low } = result;
  const range = high - low || 1;
  const cp = parseFloat(currentPrice);
  const levels = [
    { label:"161.8%", value:Math.round(high + range*0.618), color:"#7f1d1d", ext:true },
    { label:"127.2%", value:Math.round(high + range*0.272), color:"#9f1239", ext:true },
    { label:"100%",   value:Math.round(high),               color:"#dc2626", ext:false },
    { label:"78.6%",  value:Math.round(low + range*0.786),  color:"#f97316", ext:false },
    { label:"61.8%",  value:Math.round(low + range*0.618),  color:"#f59e0b", ext:false },
    { label:"50%",    value:Math.round(low + range*0.5),    color:"#0891b2", ext:false },
    { label:"38.2%",  value:Math.round(low + range*0.382),  color:"#2563eb", ext:false },
    { label:"23.6%",  value:Math.round(low + range*0.236),  color:"#7c3aed", ext:false },
    { label:"0%",     value:Math.round(low),                color:"#64748b", ext:false },
  ];
  const minV = levels[levels.length-1].value, maxV = levels[0].value, fibRange = maxV - minV || 1;
  const nearestFib = !isNaN(cp) ? levels.reduce((a,b) => Math.abs(a.value-cp)<Math.abs(b.value-cp)?a:b) : null;
  const floatPct = !isNaN(cp) ? Math.min(Math.max(((cp-minV)/fibRange)*100,0),100) : null;
  return (
    <div style={cardStyle}>
      <div style={{ padding:"12px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>📐 FIBONACCI RETRACEMENT</span>
        <span style={{ fontSize:"10px",color:t.sub }}>Range: {fmt(Math.round(range))} pt</span>
      </div>
      <div style={{ padding:"14px 16px" }}>
        {levels.map(({ label, value, color, ext }) => {
          const barPct = ((value-minV)/fibRange)*100;
          const isNearest = nearestFib?.label===label;
          const pct = !isNaN(cp) ? (((value-cp)/cp)*100).toFixed(2) : null;
          return (
            <div key={label} style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px" }}>
              <div style={{ width:"42px",fontSize:"9px",fontWeight:700,color,textAlign:"right",opacity:ext?0.65:1 }}>{label}</div>
              <div style={{ flex:1,height:"7px",background:dark?"#1e293b":"#f1f5f9",borderRadius:"99px",position:"relative",overflow:"visible" }}>
                <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${barPct}%`,background:`linear-gradient(90deg,${color}30,${color})`,borderRadius:"99px",boxShadow:`0 0 5px ${color}40` }} />
                {floatPct!==null && <div style={{ position:"absolute",top:"-3px",left:`${floatPct}%`,width:"13px",height:"13px",background:"#f59e0b",borderRadius:"50%",border:"2px solid #fff",transform:"translateX(-50%)",zIndex:3,boxShadow:"0 0 8px rgba(245,158,11,0.7)",transition:"left 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} />}
              </div>
              <div style={{ width:"52px",fontSize:"10px",fontWeight:isNearest?800:600,color:isNearest?color:t.text,textAlign:"right" }}>{fmt(value)}</div>
              {pct!==null && <div style={{ width:"44px",fontSize:"9px",color:value>cp?"#16a34a":"#dc2626",textAlign:"right",fontWeight:600 }}>{value>cp?"+":""}{pct}%</div>}
            </div>
          );
        })}
        {nearestFib && !isNaN(cp) && (
          <div style={{ marginTop:"10px",padding:"7px 10px",background:dark?"rgba(245,158,11,0.1)":"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"8px",display:"flex",alignItems:"center",gap:"6px" }}>
            <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:"#f59e0b",boxShadow:"0 0 8px rgba(245,158,11,0.7)",flexShrink:0 }} />
            <span style={{ fontSize:"11px",fontWeight:700,color:"#f59e0b" }}>Terdekat: Fib {nearestFib.label} — {fmt(nearestFib.value)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function detectCandlePattern(h, l, o, c) {
  if (isNaN(h)||isNaN(l)||isNaN(o)||isNaN(c)) return null;
  const range = h - l || 1;
  const body = Math.abs(c - o);
  const bodyPct = body / range;
  const upperShadow = h - Math.max(o, c);
  const lowerShadow = Math.min(o, c) - l;
  const isBull = c >= o;
  if (bodyPct < 0.05) {
    if (upperShadow > range*0.4 && lowerShadow > range*0.4) return { name:"Long-Legged Doji", emoji:"🕯️", signal:"NETRAL", color:"#f59e0b", desc:"Pasar sangat ragu, buyer dan seller seimbang" };
    if (lowerShadow > range*0.6 && upperShadow < range*0.15) return { name:"Dragonfly Doji", emoji:"🐉", signal:"BULLISH", color:"#16a34a", desc:"Potensi reversal naik, seller gagal tekan harga" };
    if (upperShadow > range*0.6 && lowerShadow < range*0.15) return { name:"Gravestone Doji", emoji:"🪦", signal:"BEARISH", color:"#dc2626", desc:"Potensi reversal turun, buyer gagal angkat harga" };
    return { name:"Doji", emoji:"〰️", signal:"NETRAL", color:"#f59e0b", desc:"Keseimbangan antara buyer dan seller, tunggu konfirmasi" };
  }
  if (bodyPct > 0.85) {
    return isBull
      ? { name:"Bullish Marubozu", emoji:"🟩", signal:"BULLISH KUAT", color:"#15803d", desc:"Buyer dominan penuh sepanjang sesi, momentum kelanjutan naik sangat kuat" }
      : { name:"Bearish Marubozu", emoji:"🟥", signal:"BEARISH KUAT", color:"#991b1b", desc:"Seller dominan penuh sepanjang sesi, momentum kelanjutan turun sangat kuat" };
  }
  if (lowerShadow > body*2 && upperShadow < body*0.5) {
    return isBull
      ? { name:"Hammer", emoji:"🔨", signal:"BULLISH", color:"#16a34a", desc:"Sinyal reversal naik, buyer berhasil angkat harga dari titik rendah" }
      : { name:"Hanging Man", emoji:"🪢", signal:"BEARISH", color:"#dc2626", desc:"Peringatan reversal turun, waspadai setelah uptrend panjang" };
  }
  if (upperShadow > body*2 && lowerShadow < body*0.5) {
    return isBull
      ? { name:"Inverted Hammer", emoji:"🔁", signal:"BULLISH", color:"#22c55e", desc:"Potensi reversal naik, buyer mulai masuk, konfirmasi diperlukan" }
      : { name:"Shooting Star", emoji:"💫", signal:"BEARISH", color:"#dc2626", desc:"Sinyal reversal turun kuat, seller reject harga tinggi secara agresif" };
  }
  if (bodyPct < 0.35 && upperShadow > range*0.2 && lowerShadow > range*0.2) {
    return { name:"Spinning Top", emoji:"🌀", signal:"NETRAL", color:"#8b5cf6", desc:"Pasar belum menentukan arah, tunggu candle konfirmasi berikutnya" };
  }
  return isBull
    ? { name:"Bullish Candle", emoji:"📈", signal:"BULLISH", color:"#22c55e", desc:"Candle bullish normal, buyer lebih dominan dari seller dalam sesi ini" }
    : { name:"Bearish Candle", emoji:"📉", signal:"BEARISH", color:"#ef4444", desc:"Candle bearish normal, seller lebih dominan dari buyer dalam sesi ini" };
}

function CandlePatternCard({ high, low, openPrice, close, t, dark, cardStyle }) {
  const h=parseFloat(high),l=parseFloat(low),o=parseFloat(openPrice),c=parseFloat(close);
  if (isNaN(h)||isNaN(l)||isNaN(c)) return null;
  const hasOpen = !isNaN(o);
  if (!hasOpen) return (
    <div style={{ ...cardStyle,padding:"12px 16px",display:"flex",alignItems:"center",gap:"10px" }}>
      <span style={{ fontSize:"18px" }}>🕯️</span>
      <span style={{ fontSize:"11px",color:t.sub }}>Masukkan <b style={{ color:t.text }}>Open Price</b> di form untuk deteksi pola candlestick otomatis</span>
    </div>
  );
  const pattern = detectCandlePattern(h, l, o, c);
  if (!pattern) return null;
  const range = h - l || 1;
  const bodyTop = Math.max(o, c), bodyBot = Math.min(o, c);
  const candleH = 80;
  const toY = v => candleH - ((v - l) / range) * candleH;
  const bodyTopY = toY(bodyTop), bodyBotY = toY(bodyBot);
  const isBull = c >= o;
  const candleColor = isBull ? "#16a34a" : "#dc2626";
  return (
    <div style={cardStyle}>
      <div style={{ padding:"12px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>🕯️ CANDLESTICK PATTERN</span>
        <span style={{ fontSize:"10px",fontWeight:700,color:isBull?"#16a34a":"#dc2626" }}>{isBull ? "▲ Bullish" : "▼ Bearish"} Candle</span>
      </div>
      <div style={{ padding:"14px 16px",display:"flex",gap:"16px",alignItems:"center" }}>
        <div style={{ flexShrink:0,display:"flex",justifyContent:"center" }}>
          <svg width="36" height={candleH+8} style={{ display:"block" }}>
            <line x1="18" y1="2" x2="18" y2={bodyTopY+2} stroke={candleColor} strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="7" y={bodyTopY+2} width="22" height={Math.max(bodyBotY-bodyTopY,3)} fill={candleColor} rx="3" opacity="0.92"/>
            <line x1="18" y1={bodyBotY+2} x2="18" y2={candleH+2} stroke={candleColor} strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px" }}>
            <span style={{ fontSize:"20px",lineHeight:1 }}>{pattern.emoji}</span>
            <div>
              <div style={{ fontSize:"14px",fontWeight:800,color:pattern.color }}>{pattern.name}</div>
              <div style={{ fontSize:"10px",fontWeight:700,color:pattern.color,background:`${pattern.color}18`,display:"inline-block",padding:"1px 7px",borderRadius:"4px",marginTop:"2px" }}>SINYAL: {pattern.signal}</div>
            </div>
          </div>
          <div style={{ fontSize:"11px",color:t.sub,lineHeight:1.6 }}>{pattern.desc}</div>
        </div>
      </div>
      <div style={{ padding:"10px 16px",borderTop:`1px solid ${t.border}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"6px" }}>
        {[["Open",o,"#8b5cf6"],["High",h,"#dc2626"],["Low",l,"#16a34a"],["Close",c,"#2563eb"]].map(([lbl,val,clr])=>(
          <div key={lbl} style={{ textAlign:"center",padding:"5px",background:t.cardInner,borderRadius:"6px",border:`1px solid ${t.border}` }}>
            <div style={{ fontSize:"8px",fontWeight:700,color:clr,marginBottom:"2px" }}>{lbl}</div>
            <div style={{ fontSize:"11px",fontWeight:700,color:t.text }}>{Math.round(val).toLocaleString("id-ID")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeSetup({ result, currentPrice, fmt, t, dark }) {

  if (!result || !currentPrice) return null;
  const cp = parseFloat(currentPrice); if (isNaN(cp)) return null;
  const setups = [];
  if (Math.abs(cp-result.pivot)/result.pivot < 0.015) {
    const isLong = cp >= result.pivot;
    setups.push({
      name: isLong ? "Bounce dari Pivot" : "Rejection di Pivot",
      type: isLong ? "LONG" : "SHORT",
      entry: cp,
      sl: isLong ? result.s1 : result.r1,
      tp: isLong ? result.r1 : result.s1,
      confidence: 72,
      reason: isLong
        ? "Harga bertahan di atas Pivot Point, potensi bounce naik menuju R1"
        : "Harga gagal menembus Pivot Point, tekanan jual menuju S1",
      color: isLong ? "#16a34a" : "#dc2626"
    });
  }
  if (cp>result.r1*0.995&&cp<result.r1*1.005) setups.push({name:"Breakout R1",type:"LONG",entry:result.r1,sl:result.pivot,tp:result.r2,tp2:result.r3,confidence:65,reason:"Harga menguji R1, potensi breakout bullish menuju R2-R3",color:"#ea580c"});
  if (cp>result.s1*0.995&&cp<result.s1*1.008) setups.push({name:"Bounce dari S1",type:"LONG",entry:result.s1,sl:result.s2,tp:result.pivot,tp2:result.r1,confidence:68,reason:"S1 adalah support kuat, ideal untuk buy on dip",color:"#16a34a"});
  if (cp>result.r2*0.997&&cp<result.r2*1.01) setups.push({name:"Rejection R2",type:"SHORT",entry:result.r2,sl:result.r3,tp:result.r1,tp2:result.pivot,confidence:62,reason:"R2 area resistance kuat, waspadai potensi reversal bearish",color:"#dc2626"});
  if (cp>result.s2*0.997&&cp<result.s2*1.008) setups.push({name:"Bounce dari S2",type:"LONG",entry:result.s2,sl:result.s3,tp:result.s1,tp2:result.pivot,confidence:58,reason:"S2 support sekunder, peluang reversal jika volume mendukung",color:"#0891b2"});
  if (setups.length===0) {
    const up = cp >= result.pivot;
    setups.push({
      name: up ? "Trend Following Long" : "Trend Following Short",
      type: up ? "LONG" : "SHORT",
      entry: cp,
      sl: up ? result.s1 : result.r1,
      tp: up ? result.r1 : result.s1,
      tp2: up ? result.r2 : result.s2,
      confidence: 55,
      reason: up ? "Harga di atas PP, ikuti bias bullish dengan manajemen risiko ketat" : "Harga di bawah PP, ikuti bias bearish dengan manajemen risiko ketat",
      color: up ? "#16a34a" : "#dc2626"
    });
  }
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

export default function PivotAnalyzer() {
  const [high,setHigh]=useState(""); const [low,setLow]=useState(""); const [close,setClose]=useState("");
  const [open,setOpen]=useState("");
  const [currentPrice,setCurrentPrice]=useState(""); const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false); const [progress,setProgress]=useState(0);
  const [dark,setDark]=useState(false); const [copied,setCopied]=useState(false);
  const [pivotMethod,setPivotMethod]=useState("classic");
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

  const clear=()=>{setHigh("");setLow("");setClose("");setOpen("");setCurrentPrice("");setResult(null);setProgress(0);setGlowLevel(null);};

  const hitung=()=>{
    const h=parseFloat(high),l=parseFloat(low),c=parseFloat(close);
    if(isNaN(h)||isNaN(l)||isNaN(c)) return;
    setLoading(true);setProgress(0);setResult(null);
    let p=0; const iv=setInterval(()=>{p+=Math.random()*22+6;if(p>=100){p=100;clearInterval(iv);}setProgress(Math.min(Math.round(p),100));},45);
    setTimeout(()=>{
      let pivot, r1, r2, r3, s1, s2, s3;
      if (pivotMethod === "woodie") {
        pivot = (h + l + 2*c) / 4;
        r1 = 2*pivot - l; r2 = pivot + (h - l); r3 = r2 + (h - l);
        s1 = 2*pivot - h; s2 = pivot - (h - l); s3 = s2 - (h - l);
      } else {
        pivot = (h+l+c)/3;
        r1 = 2*pivot-l; r2 = pivot+(h-l); r3 = h+2*(pivot-l);
        s1 = 2*pivot-h; s2 = pivot-(h-l); s3 = l-2*(h-pivot);
      }
      const res={pivot:Math.round(pivot),r1:Math.round(r1),r2:Math.round(r2),r3:Math.round(r3),s1:Math.round(s1),s2:Math.round(s2),s3:Math.round(s3),high:h,low:l,close:c,method:pivotMethod};
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

  useEffect(() => {
    if (!isAuthorized) {
      const script = document.createElement('script');
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute('data-telegram-login', process.env.REACT_APP_TELEGRAM_BOT_NAME || "tradingstars_id_bot");
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      if (authInstance.current) {
        authInstance.current.innerHTML = "";
        authInstance.current.appendChild(script);
      }
      window.onTelegramAuth = (user) => handleCheckMember(user.id, user.first_name);
    }
  }, [isAuthorized]);

  const handleCheckMember = async (userId, firstName) => {
    setChecking(true);
    try {
      const response = await fetch("/api/check-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (data.isMember) {
        setIsAuthorized(true);
      } else {
        alert(`Maaf ${firstName}, kamu belum terdaftar sebagai member Trading Stars.`);
      }
    } catch (e) {
      alert("Verifikasi Gagal. Pastikan Bot sudah Admin di grup.");
    } finally {
      setChecking(false);
    }
  };

  const hitung = () => {
    const h = parseFloat(high), l = parseFloat(low), c = parseFloat(close);
    if (isNaN(h) || isNaN(l) || isNaN(c)) return;
    setLoading(true);
    setTimeout(() => {
      const pivot = (h + l + c) / 3;
      setResult({
        pivot: Math.round(pivot),
        r1: Math.round(2 * pivot - l),
        r2: Math.round(pivot + (h - l)),
        r3: Math.round(h + 2 * (pivot - l)),
        s1: Math.round(2 * pivot - h),
        s2: Math.round(pivot - (h - l)),
        s3: Math.round(l - 2 * (h - pivot))
      });
      setLoading(false);
    }, 600);
  };

  const fmt = (n) => n ? n.toLocaleString("id-ID") : "—";

  if (!isAuthorized) {
    return (
      <div style={{ minHeight:"100vh", background:t.bg, display:"flex", justifyContent:"center", alignItems:"center", padding:"20px" }}>
        <Particles dark={dark} />
        <div style={{ background:t.card, padding:"40px", borderRadius:"20px", textAlign:"center", border:`1px solid ${t.border}`, maxWidth:"360px", zIndex:1 }}>
          <div style={{ fontSize:"50px", marginBottom:"15px" }}>🛡️</div>
          <h2 style={{ color:t.text, margin:0 }}>Trading Stars</h2>
          <p style={{ color:t.sub, fontSize:"14px", marginBottom:"30px" }}>Khusus member resmi. Silakan login untuk memverifikasi keanggotaan grup Anda.</p>
          <div ref={authInstance}></div>
          {checking && <p style={{ color:t.text, marginTop:"15px" }}>Memverifikasi...</p>}
          <button onClick={() => setDark(!dark)} style={{ marginTop:"30px", border:"none", background:"none", color:t.sub, cursor:"pointer" }}>{dark?"☀️ Light":"🌙 Dark"}</button>
        </div>
      </div>
    );
  }

  const session = getSession();
  return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex", justifyContent:"center", padding:"24px 16px", fontFamily:"sans-serif", position:"relative" }}>
      <Particles dark={dark} />
      <div style={{ width:"100%", maxWidth:"430px", position:"relative", zIndex:1 }}>

        <FadeIn delay={0}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
              <img src="/logo-tradingstars.jpg" alt="TradingStars Logo" style={{ width:"42px",height:"42px",borderRadius:"10px",objectFit:"cover",boxShadow:"0 4px 14px rgba(124,58,237,0.45)" }} />
              <div>
                <h3 style={{ color:t.text, margin:0, fontSize:"16px" }}>Trading Stars Analyzer</h3>
                <div style={{ fontSize:"10px", color:t.sub }}>Verified Access · {time.toLocaleTimeString()}</div>
              </div>
            </div>
            <button onClick={() => setDark(!dark)} style={{ background:t.card, border:`1px solid ${t.border}`, color:t.text, borderRadius:"50%", width:"36px", height:"36px", cursor:"pointer" }}>{dark?"☀️":"🌙"}</button>
          </div>
        </FadeIn>

        <div style={{ background:t.card, borderRadius:"16px", border:`1px solid ${t.border}`, padding:"20px", marginBottom:"16px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"15px" }}>
            {["High", "Low", "Close"].map(label => (
              <div key={label}>
                <label style={{ fontSize:"11px", fontWeight:"700", color:t.sub, display:"block", marginBottom:"5px" }}>{label}</label>
                <input type="number" value={label === "High" ? high : label === "Low" ? low : close}
                  onChange={(e) => label === "High" ? setHigh(e.target.value) : label === "Low" ? setLow(e.target.value) : setClose(e.target.value)}
                  style={{ width:"100%", padding:"10px", background:t.input, border:`1px solid ${t.border}`, borderRadius:"8px", color:t.text, outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
          <button onClick={hitung} disabled={loading} style={{ width:"100%", padding:"12px", background:"#2563eb", color:"white", border:"none", borderRadius:"10px", fontWeight:"bold", cursor:"pointer" }}>
            {loading ? "Menghitung..." : "Hitung Pivot Point"}
          </button>
        </div>

        {result && (
          <FadeIn delay={100}>
            <div style={{ background:t.card, borderRadius:"16px", border:`1px solid ${t.border}`, overflow:"hidden" }}>
              <div style={{ padding:"15px", borderBottom:`1px solid ${t.border}`, background:session.bg }}>
                <span style={{ fontSize:"12px", fontWeight:"bold", color:session.color }}>{session.name} SESSION</span>
              </div>
              <div style={{ padding:"20px" }}>
                {[["R3", result.r3, "#dc2626"], ["R2", result.r2, "#ef4444"], ["R1", result.r1, "#f97316"], ["PP", result.pivot, "#2563eb"], ["S1", result.s1, "#22c55e"], ["S2", result.s2, "#16a34a"], ["S3", result.s3, "#15803d"]].map(([l, v, c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${t.border}` }}>
                    <span style={{ fontWeight:"bold", color:c }}>{l}</span>
                    <span style={{ color:t.text, fontWeight:"bold" }}>{fmt(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
