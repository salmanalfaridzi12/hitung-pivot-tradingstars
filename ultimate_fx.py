import re

file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# ─────────────────────────────────────────────────────────────────
# 1. State Additions
# ─────────────────────────────────────────────────────────────────
old_state = '''  const [shaking,setShaking]=useState(false);'''
new_state = '''  const [shaking,setShaking]=useState(false);
  const [sentimentVal,setSentimentVal]=useState(50);
  const [livePulse,setLivePulse]=useState(null);
  const [cardTransition,setCardTransition]=useState(false);'''
if old_state in code:
    code = code.replace(old_state, new_state)

# ─────────────────────────────────────────────────────────────────
# 2. Add LiveToast logic (useEffect) + Component
# ─────────────────────────────────────────────────────────────────
pulse_hook_search = '''  useEffect(() => {
    if (!mounted) return;
    const val = stockCode.toUpperCase();'''

pulse_hook_add = '''
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

'''
if pulse_hook_search in code:
    code = code.replace(pulse_hook_search, pulse_hook_add + pulse_hook_search)

# ─────────────────────────────────────────────────────────────────
# 3. Add components (Speedometer, LiveToast, TradingCardMode overlay)
# ─────────────────────────────────────────────────────────────────
components_add = '''
function Speedometer({ value, setValue, dark, t }) {
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
}

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

'''
if 'function FadeIn({ children, delay=0, style={} }) {' in code:
    code = code.replace('function FadeIn({ children, delay=0, style={} }) {', components_add + 'function FadeIn({ children, delay=0, style={} }) {')


# ─────────────────────────────────────────────────────────────────
# 4. Integrate Speedometer into main tab
# ─────────────────────────────────────────────────────────────────
speedometer_trigger = '''        {tab==="main" && <>
          <FadeIn delay={120}>'''
speedometer_insert = '''        {tab==="main" && <>
          <FadeIn delay={100}>
            <Speedometer value={sentimentVal} setValue={setSentimentVal} dark={dark} t={t} />
          </FadeIn>
          <FadeIn delay={120}>'''
if speedometer_trigger in code:
    code = code.replace(speedometer_trigger, speedometer_insert)

# ─────────────────────────────────────────────────────────────────
# 5. Integrate LiveToast and CardTransition overlay
# ─────────────────────────────────────────────────────────────────
toast_trigger = '''      <ConfettiBurst particles={confetti} />'''
toast_insert = '''      <ConfettiBurst particles={confetti} />
      <LiveToast pulse={livePulse} dark={dark} />
      <CardTransitionMode active={cardTransition} dark={dark} />'''
if toast_trigger in code:
    code = code.replace(toast_trigger, toast_insert)


# ─────────────────────────────────────────────────────────────────
# 6. Make copyAnalisa trigger CardTransitionMode
# ─────────────────────────────────────────────────────────────────
old_copy = '''  const copyAnalisa=()=>{
    if(!result) return;'''
new_copy = '''  const copyAnalisa=()=>{
    if(!result) return;
    setCardTransition(true);
    setTimeout(() => {
      setCardTransition(false);
      executeCopyAnalisa();
    }, 1200);
  };
  const executeCopyAnalisa=()=>{'''
if old_copy in code:
    code = code.replace(old_copy, new_copy)

# ─────────────────────────────────────────────────────────────────
# 7. Add keyframes
# ─────────────────────────────────────────────────────────────────
old_styles = '''  @keyframes confetti-fly{0%{transform:translate(-50%,-50%) rotate(0deg);opacity:1}100%{transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy))) rotate(var(--cr));opacity:0}}
  .animate-shake{animation:screenShake 0.28s cubic-bezier(0.36,0.07,0.19,0.97) both}
`}</style>'''
new_styles = '''  @keyframes confetti-fly{0%{transform:translate(-50%,-50%) rotate(0deg);opacity:1}100%{transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy))) rotate(var(--cr));opacity:0}}
  .animate-shake{animation:screenShake 0.28s cubic-bezier(0.36,0.07,0.19,0.97) both}
  @keyframes toastSlideUp{0%{opacity:0;transform:translateY(20px) scale(0.9)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes fadeInC{from{opacity:0}to{opacity:1}}
  @keyframes holoCard{0%{transform:rotateY(-90deg) scale(0.8);opacity:0}40%{transform:rotateY(10deg) scale(1.05);opacity:1}60%{transform:rotateY(-5deg) scale(1)}100%{transform:rotateY(0deg) scale(1)}}
  @keyframes progressLine{0%{width:0%}100%{width:100%}}
`}</style>'''
if old_styles in code:
    code = code.replace(old_styles, new_styles)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Ultimate features injected successfully!")
