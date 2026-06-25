import re

file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# ─────────────────────────────────────────────────────────────────
# 1. GlowCard component – radial glow follows mouse/touch
# ─────────────────────────────────────────────────────────────────
glow_component = '''
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

'''

# Insert GlowCard before FadeIn component
code = code.replace('function FadeIn({ children, delay=0, style={} }) {', glow_component + 'function FadeIn({ children, delay=0, style={} }) {')

# ─────────────────────────────────────────────────────────────────
# 2. Spring bounce button – useSpringButton hook
# ─────────────────────────────────────────────────────────────────
spring_hook = '''
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

'''
code = code.replace('function getMarketStatus() {', spring_hook + 'function getMarketStatus() {')

# ─────────────────────────────────────────────────────────────────
# 3. Liquid Tab Transitions – floating indicator
# ─────────────────────────────────────────────────────────────────
# Replace tab bar section
old_tab_bar = '''          <div style={{ display:"flex",gap:"4px",background:t.card,padding:"4px",borderRadius:"12px",marginBottom:"14px",border:`1px solid ${t.border}` }}>
            {[["main","📊 Analisa"],["avg","🧮 Avg Down"],["history","🕐 History"],["story","📸 Story"]].map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={tabStyle(tab===key)}>{label}</button>
            ))}
          </div>'''

new_tab_bar = '''          <div style={{ position:"relative",display:"flex",gap:"2px",background:t.card,padding:"4px",borderRadius:"12px",marginBottom:"14px",border:`1px solid ${t.border}` }}>
            {[["main","📊 Analisa"],["avg","🧮 Avg Down"],["history","🕐 History"],["story","📸 Story"]].map(([key,label],idx)=>((
              <button key={key} onClick={()=>setTab(key)} style={{ flex:1,padding:"9px 4px",background:"transparent",color:tab===key?"#fff":t.sub,border:"none",borderRadius:"8px",fontSize:"11px",fontWeight:700,cursor:"pointer",transition:"color 0.25s",position:"relative",zIndex:1 }}>
                {tab===key && (
                  <span style={{ position:"absolute",inset:0,background:dark?"#1e3a5f":"#0f172a",borderRadius:"8px",zIndex:-1,boxShadow:dark?"0 2px 10px rgba(99,102,241,0.35)":"0 2px 8px rgba(15,23,42,0.25)", animation:"tabSlide 0.25s cubic-bezier(0.22,1,0.36,1)" }} />
                )}
                {label}
              </button>
            )))}
          </div>'''
code = code.replace(old_tab_bar, new_tab_bar)

# ─────────────────────────────────────────────────────────────────
# 4. Spring bounce on Hitung Pivot button
# ─────────────────────────────────────────────────────────────────
old_hitung_btn = '''<button onClick={hitung} style={{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)'''
new_hitung_btn = '''<SpringButton label={loading ? null : "🚀 Hitung Pivot Point"} onClick={hitung} style={{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)'''
# Don't do simple replace since it might not catch fully - let's use a targeted approach on the button
old_hitung_full = '''<button onClick={hitung} style={{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:"#fff",border:"none",borderRadius:"12px",fontSize:"15px",fontWeight:800,cursor:"pointer",marginBottom:"14px",boxShadow:"0 8px 24px rgba(124,58,237,0.4)",transition:"all 0.3s",letterSpacing:"0.5px" }}>
                  {loading ? `Menghitung... ${progress}%` : "🚀 Hitung Pivot Point"}
                </button>'''
new_hitung_full = '''<SpringBtn onClick={hitung} style={{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:"#fff",border:"none",borderRadius:"12px",fontSize:"15px",fontWeight:800,cursor:"pointer",marginBottom:"14px",boxShadow:"0 8px 24px rgba(124,58,237,0.4)",transition:"box-shadow 0.3s",letterSpacing:"0.5px",display:"block" }}>
                  {loading ? `Menghitung... ${progress}%` : "🚀 Hitung Pivot Point"}
                </SpringBtn>'''

if old_hitung_full in code:
    code = code.replace(old_hitung_full, new_hitung_full)

# ─────────────────────────────────────────────────────────────────
# 5. Spring bounce on Share button
# ─────────────────────────────────────────────────────────────────
old_share_btn = '''<button onClick={copyAnalisa}
                  style={{ width:"100%",padding:"13px",background:copied?"#16a34a":"#2563eb",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:800,cursor:"pointer",transition:"background 0.3s",boxShadow:copied?"0 4px 14px rgba(22,163,74,0.4)":"0 4px 14px rgba(37,99,235,0.35)" }}>
                  {copied ? "✅ Laporan Disalin!" : "📤 Salin & Share Analisa"}
                </button>'''
new_share_btn = '''<SpringBtn onClick={copyAnalisa} style={{ width:"100%",padding:"13px",background:copied?"#16a34a":"#2563eb",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:800,cursor:"pointer",transition:"background 0.3s",boxShadow:copied?"0 4px 14px rgba(22,163,74,0.4)":"0 4px 14px rgba(37,99,235,0.35)",display:"block" }}>
                  {copied ? "✅ Laporan Disalin!" : "📤 Salin & Share Analisa"}
                </SpringBtn>'''
if old_share_btn in code:
    code = code.replace(old_share_btn, new_share_btn)

# ─────────────────────────────────────────────────────────────────
# 6. Add SpringBtn component + tabSlide keyframe 
# ─────────────────────────────────────────────────────────────────
spring_component = '''
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

'''
code = code.replace('function useSpringButton() {', spring_component + 'function useSpringButton() {')

# ─────────────────────────────────────────────────────────────────
# 7. Add keyframe for tab slide to style tag
# ─────────────────────────────────────────────────────────────────
old_style = '''<style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}`}</style>'''
new_style = '''<style>{`
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
  @keyframes tabSlide{from{opacity:0;transform:scaleX(0.7)}to{opacity:1;transform:scaleX(1)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`}</style>'''
code = code.replace(old_style, new_style)

# ─────────────────────────────────────────────────────────────────
# 8. Apply GlowCard to main pivot result card
# ─────────────────────────────────────────────────────────────────
old_lvl_card_open = '''  const levelDefs=result?['''
# We won't replace levelDefs, just find where pivot result card is rendered
# The pivot result cards use levelDefs.map. Let's wrap the container for level cards
old_pivot_section = '''              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",position:"relative",zIndex:1 }}>
                  {levelDefs.map(({label,sub,value,color,light,border,bold})=>('''
new_pivot_section = '''              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",position:"relative",zIndex:1 }}>
                  {levelDefs.map(({label,sub,value,color,light,border,bold},_li)=>('''
if old_pivot_section in code:
    code = code.replace(old_pivot_section, new_pivot_section)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Micro-interactions injected successfully!")
