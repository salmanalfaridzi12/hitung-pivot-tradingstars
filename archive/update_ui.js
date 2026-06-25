const fs = require('fs');
let code = fs.readFileSync('app/page.jsx', 'utf8');

// 1. Add .dark wrapper to root
code = code.replace(
  /<div style=\{\{\s*minHeight:"100vh"[^}]+\}\}>/,
  '<div className={dark ? "dark" : ""}>\n      <div className="min-h-screen flex justify-center p-6 relative transition-colors duration-500 bg-gray-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-black" style={{ fontFamily:"\'Segoe UI\',system-ui,sans-serif" }}>'
);
// Fix the closing tags for the new wrapper
code = code.replace(
  /<\/div>\n\s*<style>\{`@keyframes pulse/g,
  '</div>\n      </div>\n      <style>{`@keyframes pulse'
);

// 2. Add Tailwind string literal for Card
const cardClassDef = '\n  const cardClass = "bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-2xl overflow-hidden mb-3 relative transition-all duration-300 shadow-[0_8px_32px_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]";';
code = code.replace(/const cardStyle=\{[^}]+\};/, 'const cardStyle={};' + cardClassDef);

// 3. Replace all style={cardStyle} with className={cardClass}
code = code.replace(/<div style=\{cardStyle\}>/g, '<div className={cardClass}>');
code = code.replace(/<div style=\{\{\s*\.\.\.cardStyle\s*,\s*padding:"14px 16px"\s*\}\}>/g, '<div className={cardClass} style={{ padding:"14px 16px" }}>');
code = code.replace(/<div style=\{\{\s*textAlign:"center",\s*padding:"40px 20px",\s*color:t\.sub,\s*fontSize:"13px",\s*\.\.\.cardStyle\s*\}\}>/g, '<div className={cardClass} style={{ textAlign:"center", padding:"40px 20px", color:t.sub, fontSize:"13px" }}>');

// 4. Input Style With Neon Glow
code = code.replace(
  /const inputStyle=\{[^}]+\};/,
  'const inputStyle={width:"100%",padding:"10px",background:t.input,border:`1px solid ${dark ? "rgba(139,92,246,0.4)" : "rgba(34,211,238,0.5)"}`,borderRadius:"8px",color:t.text,fontSize:"14px",fontWeight:600,outline:"none",boxSizing:"border-box",transition:"all 0.3s",fontFamily:"inherit",boxShadow:dark?"0 0 10px rgba(139,92,246,0.2)":"0 0 12px rgba(34,211,238,0.3)"};'
);

// 5. Fix Trading Plan Layout Contrast
code = code.replace(
  /<div className=\{cardClass\} style=\{\{\s*padding:"14px 16px"\s*\}\}>\n\s*<div style=\{\{\s*display:"flex",\s*justifyContent:"space-between",\s*alignItems:"center",\s*marginBottom:"12px"\s*\}\}>\n\s*<span style=\{\{\s*fontSize:"11px",\s*fontWeight:700,\s*color:t\.sub,\s*letterSpacing:"1px"\s*\}\}>⚖️ TRADING PLAN OPTIMIZER<\/span>\n\s*<\/div>/,
  '<div className={cardClass} style={{ padding:"14px 16px", background: dark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.4)" }}>\n                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>\n                  <span style={{ fontSize:"11px",fontWeight:700,color:dark ? "#bbb" : "#444",letterSpacing:"1px" }}>⚖️ TRADING PLAN OPTIMIZER</span>\n                </div>'
);

fs.writeFileSync('app/page.jsx', code);
console.log("Replacement done!");
