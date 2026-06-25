import os

file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Root Wrapper
code = code.replace(
    '<div style={{ minHeight:"100vh",background:t.bg,display:"flex",justifyContent:"center",padding:"24px 16px",fontFamily:"\'Segoe UI\',system-ui,sans-serif",transition:"background 0.4s",position:"relative" }}>',
    '<div className={dark ? "dark" : ""}>\n      <div className="min-h-screen flex justify-center p-6 relative transition-colors duration-500 bg-gray-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-black" style={{ fontFamily:"\'Segoe UI\',system-ui,sans-serif" }}>'
)
# Fix the closing tags for the new wrapper
code = code.replace(
    '      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}`}</style>\n    </div>',
    '      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}`}</style>\n      </div>\n    </div>'
)

# 2. Card Class & Input Style
code = code.replace(
    '  const cardStyle={background:t.card,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:"16px",border:`1px solid ${t.border}`,overflow:"hidden",marginBottom:"12px",position:"relative",boxShadow:dark?"0 8px 32px rgba(0,0,0,0.5)":"0 8px 32px rgba(31,38,135,0.07)",transition:"background 0.3s, border-color 0.3s, box-shadow 0.3s"};',
    '  const cardClass = "bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-2xl overflow-hidden mb-3 relative transition-all duration-300 shadow-[0_8px_32px_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]";\n  const cardStyle = {};'
)

code = code.replace(
    '  const inputStyle={width:"100%",padding:"10px",background:t.input,border:`1.5px solid ${t.border}`,borderRadius:"8px",color:t.text,fontSize:"14px",fontWeight:600,outline:"none",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s",fontFamily:"inherit"};',
    '  const inputStyle={width:"100%",padding:"10px",background:t.input,border:`1px solid ${dark ? "rgba(139,92,246,0.4)" : "rgba(34,211,238,0.5)"}`,borderRadius:"8px",color:t.text,fontSize:"14px",fontWeight:600,outline:"none",boxSizing:"border-box",transition:"all 0.3s",fontFamily:"inherit",boxShadow:dark?"0 0 10px rgba(139,92,246,0.2)":"0 0 12px rgba(34,211,238,0.3)"};'
)

# 3. Replace all style={cardStyle} with className={cardClass} -> Since we need to replace all, split and join
code = code.replace('<div style={cardStyle}>', '<div className={cardClass}>')
code = code.replace('<div style={{ ...cardStyle,padding:"14px 16px" }}>', '<div className={cardClass} style={{ padding:"14px 16px" }}>')
code = code.replace('<div style={{ textAlign:"center",padding:"40px 20px",color:t.sub,fontSize:"13px", ...cardStyle }}>', '<div className={cardClass} style={{ textAlign:"center", padding:"40px 20px", color:t.sub, fontSize:"13px" }}>')

# 4. Fix Trading Plan Optimizer Contrast
code = code.replace(
    '<div className={cardClass} style={{ padding:"14px 16px" }}>\n                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>\n                  <span style={{ fontSize:"11px",fontWeight:700,color:t.sub,letterSpacing:"1px" }}>⚖️ TRADING PLAN OPTIMIZER</span>',
    '<div className={cardClass} style={{ padding:"14px 16px", background: dark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.4)" }}>\n                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>\n                  <span style={{ fontSize:"11px",fontWeight:700,color:dark ? "#bbb" : "#444",letterSpacing:"1px" }}>⚖️ TRADING PLAN OPTIMIZER</span>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Replacement done via Python!")
