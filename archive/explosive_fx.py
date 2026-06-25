file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# ─────────────────────────────────────────────────────────────────
# 1. Confetti + ScreenShake states
# ─────────────────────────────────────────────────────────────────
old_state = '''  const [dark,setDark]=useState(false); const [copied,setCopied]=useState(false);
  const [pivotMethod,setPivotMethod]=useState("classic");'''
new_state = '''  const [dark,setDark]=useState(false); const [copied,setCopied]=useState(false);
  const [pivotMethod,setPivotMethod]=useState("classic");
  const [confetti,setConfetti]=useState([]);
  const [shaking,setShaking]=useState(false);'''
code = code.replace(old_state, new_state)

# ─────────────────────────────────────────────────────────────────
# 2. Confetti trigger + screen shake on result
# ─────────────────────────────────────────────────────────────────
old_result = '''      setResult(res);setLoading(false);'''
new_result = '''      setResult(res);setLoading(false);
      // Confetti explosion
      const particles = Array.from({length:36},(_,i)=>({
        id:i, x:Math.random()*100-50, y:Math.random()*-80-20,
        rot:Math.random()*720-360, color:["#f59e0b","#8b5cf6","#ec4899","#22d3ee","#f97316","#a3e635"][i%6],
        size:Math.random()*6+4, dur:Math.random()*0.5+0.7,
      }));
      setConfetti(particles);
      setTimeout(()=>setConfetti([]),1200);
      // Screen shake
      setShaking(true); setTimeout(()=>setShaking(false),280);'''
code = code.replace(old_result, new_result)

# ─────────────────────────────────────────────────────────────────
# 3. Insert Confetti component before SpringBtn
# ─────────────────────────────────────────────────────────────────
confetti_comp = '''
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

'''
code = code.replace('function SpringBtn({ onClick, style, children }) {', confetti_comp + 'function SpringBtn({ onClick, style, children }) {')

# ─────────────────────────────────────────────────────────────────
# 4. Wrap main container with shake class
# ─────────────────────────────────────────────────────────────────
old_wrapper = '''<div className={`min-h-screen flex justify-center p-6 relative transition-colors duration-500 ${dark ? "bg-gradient-to-br from-slate-900 to-black text-white" : "bg-white text-black"}`} style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", paddingTop: "50px" }}>'''
new_wrapper = '''<div className={`min-h-screen flex justify-center p-6 relative transition-colors duration-500 ${dark ? "bg-gradient-to-br from-slate-900 to-black text-white" : "bg-white text-black"}${shaking?" animate-shake":""}`} style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", paddingTop: "50px" }}>
      <ConfettiBurst particles={confetti} />'''
code = code.replace(old_wrapper, new_wrapper)

# ─────────────────────────────────────────────────────────────────
# 5. RGB Neon Border + Dynamic Badge on Pivot Ladder card
# ─────────────────────────────────────────────────────────────────
old_pivot_card = '''          {levelDefs.length>0 && (
            <FadeIn delay={0}>
              <div className={cardClass}>
                <HeatmapBg levels={levelDefs} currentPrice={currentPrice} dark={dark} />
                <div style={{ position:"relative",zIndex:1 }}>
                  <div style={{ padding:"12px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>PIVOT LADDER</span>
                    <span style={{ fontSize:"11px",color:t.sub }}>7 LEVEL · HEATMAP</span>
                  </div>'''

new_pivot_card = '''          {levelDefs.length>0 && (() => {
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
                  </div>'''
code = code.replace(old_pivot_card, new_pivot_card)

# Close the IIFE after the card
old_pivot_card_close = '''              </div>
            </FadeIn>
          )}


          {levelDefs.length>0 && ('''
new_pivot_card_close = '''              </div>
            </FadeIn>
            );
          })()}


          {levelDefs.length>0 && ('''
code = code.replace(old_pivot_card_close, new_pivot_card_close)

# ─────────────────────────────────────────────────────────────────
# 6. Add keyframes to style tag
# ─────────────────────────────────────────────────────────────────
old_style = '''<style>{`
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
  @keyframes tabSlide{from{opacity:0;transform:scaleX(0.7)}to{opacity:1;transform:scaleX(1)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`}</style>'''

new_style = '''<style>{`
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
  @keyframes tabSlide{from{opacity:0;transform:scaleX(0.7)}to{opacity:1;transform:scaleX(1)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes rgbBorder{0%{background-position:0% 0%}100%{background-position:300% 0%}}
  @keyframes pulseBadge{0%,100%{opacity:1;box-shadow:0 0 0 0 transparent}50%{opacity:0.85;box-shadow:0 0 10px currentColor}}
  @keyframes screenShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
  @keyframes confetti-fly{0%{transform:translate(-50%,-50%) rotate(0deg);opacity:1}100%{transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy))) rotate(var(--cr));opacity:0}}
  .animate-shake{animation:screenShake 0.28s cubic-bezier(0.36,0.07,0.19,0.97) both}
`}</style>'''
code = code.replace(old_style, new_style)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Explosive effects injected!")
