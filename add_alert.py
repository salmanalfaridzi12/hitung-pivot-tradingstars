import os

file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State
state_old = '''  const [equity,setEquity]=useState(""); const [riskPct,setRiskPct]=useState("2");'''
state_new = '''  const [equity,setEquity]=useState(""); const [riskPct,setRiskPct]=useState("2");
  const [alertPrice,setAlertPrice]=useState("");'''
code = code.replace(state_old, state_new)

# 2. Clear
clear_old = '''setCurrentPrice("");setResult(null);setProgress(0);setGlowLevel(null);};'''
clear_new = '''setCurrentPrice("");setResult(null);setProgress(0);setGlowLevel(null);setAlertPrice("");};'''
code = code.replace(clear_old, clear_new)

# 3. Hitung
hitung_old = '''setResult(res);setLoading(false);'''
hitung_new = '''setResult(res);setLoading(false);setAlertPrice(Math.round(r1) || h);'''
code = code.replace(hitung_old, hitung_new)

# 4. Component
comp_old = '''              </div>
            </FadeIn>
          )}

          {result && (
            <FadeIn delay={0}>
              <div style={{ marginBottom:"12px" }}>'''

comp_new = '''              </div>
            </FadeIn>
          )}

          {result && (
            <FadeIn delay={30}>
              <div className={cardClass} style={{ padding:"16px", background: dark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                  <span style={{ fontSize:"11px",fontWeight:800,color:dark ? "#8b5cf6" : "#7c3aed",letterSpacing:"1px" }}>🔔 SET PRICE ALERT (TELEGRAM)</span>
                </div>
                <div style={{ marginBottom:"12px" }}>
                  <label style={{ fontSize:"10px",fontWeight:700,color:t.sub,display:"block",marginBottom:"5px" }}>🎯 Target Harga Alert</label>
                  <input type="number" value={alertPrice} onChange={e=>setAlertPrice(e.target.value)} placeholder="Contoh: 1550" style={{...inputStyle, background: dark? "rgba(15,23,42,0.8)" : "rgba(255,255,255,0.9)", textAlign: "center", fontSize: "16px", fontWeight: 800, padding: "12px", boxShadow: dark ? "0 0 12px rgba(139,92,246,0.3)" : "inset 0 2px 4px rgba(0,0,0,0.05)"}} />
                </div>
                <a href={`https://t.me/NAMA_BOT_KAMU?start=ALERT_${stockCode || "IHSG"}_${alertPrice}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#8b5cf6,#6d28d9)",color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px rgba(139,92,246,0.5)",transition:"all 0.2s",display:"flex",justifyContent:"center",alignItems:"center",gap:"8px",marginBottom:"8px" }}>
                    <span style={{ textShadow:"0 0 10px rgba(255,255,255,0.8)", animation: "pulse 2s infinite" }}>🔔</span> Aktifkan Alert di Telegram
                  </button>
                </a>
                <div style={{ textAlign:"center", fontSize:"9px", color:t.sub, lineHeight:1.4 }}>
                  Cukup klik tombol di atas, lalu tekan <b>START</b> di Telegram untuk mengaktifkan notifikasi otomatis.
                </div>
              </div>
            </FadeIn>
          )}

          {result && (
            <FadeIn delay={60}>
              <div style={{ marginBottom:"12px" }}>'''

code = code.replace(comp_old, comp_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Smart alert injected!")
