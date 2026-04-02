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

export default function PivotAnalyzer() {
  const [dark, setDark] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false); // ✅ kembali false
  const [checking, setChecking] = useState(false);
  const authInstance = useRef(null);

  const [high, setHigh] = useState("");
  const [low, setLow] = useState("");
  const [close, setClose] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  const t = {
    bg: dark ? "#080e1a" : "#f0f4f8",
    card: dark ? "#111827" : "#ffffff",
    border: dark ? "#1e2d42" : "#e2e8f0",
    text: dark ? "#f0f6ff" : "#0f172a",
    sub: dark ? "#7a92b0" : "#64748b",
    input: dark ? "#0d1421" : "#f8fafc"
  };

  useEffect(() => { const iv = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(iv); }, []);

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
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"40px", height:"40px", background:"linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>📊</div>
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
