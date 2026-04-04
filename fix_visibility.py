import re

file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

old_block = '''                  <div>
                    <label style={{ fontSize:"11px",fontWeight:700,color:"#8b5cf6",display:"block",marginBottom:"5px" }}>🎯 Harga Sekarang (opsional)</label>
                    <input type="number" value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)} placeholder="Aktivator Fitur" style={inputStyle}
                      onFocus={e=>{e.target.style.borderColor="#8b5cf6";e.target.style.boxShadow="0 0 0 3px rgba(139,92,246,0.12)";}}
                      onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                  </div>'''

new_block = '''                  <div style={{ display: "block", visibility: "visible" }}>
                    <label style={{ fontSize:"11px",fontWeight:700,color:"#8b5cf6",display:"block",marginBottom:"5px" }}>🎯 Harga Sekarang (opsional)</label>
                    <input type="number" value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)} placeholder="Aktivator Fitur" style={{...inputStyle, display: "block", opacity: 1, visibility: "visible"}}
                      onFocus={e=>{e.target.style.borderColor="#8b5cf6";e.target.style.boxShadow="0 0 0 3px rgba(139,92,246,0.12)";}}
                      onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow="none";}} />
                  </div>'''

if old_block in code:
    code = code.replace(old_block, new_block)
    print("Fix applied.")
else:
    print("Block not found. It might have already been fixed or formatted differently.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)
