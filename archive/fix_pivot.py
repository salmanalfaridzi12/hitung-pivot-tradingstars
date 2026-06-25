import re

file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Hitung Logic to Safeguard H < L and use explicit math
old_hitung = '''  const hitung=()=>{
    const h=parseFloat(high),l=parseFloat(low),c=parseFloat(close);
    if(isNaN(h)||isNaN(l)||isNaN(c)) return;'''

new_hitung = '''  const hitung=()=>{
    let h=parseFloat(high),l=parseFloat(low),c=parseFloat(close);
    if(isNaN(h)||isNaN(l)||isNaN(c)) return;
    if(h < l) { const temp=h; h=l; l=temp; } // Safeguard for inverted inputs'''

if old_hitung in code:
    code = code.replace(old_hitung, new_hitung)


# 2. Match exact formula string representation to user's requested syntax (Classic)
old_classic = '''      } else {
        pivot = (h+l+c)/3;
        r1 = 2*pivot-l; r2 = pivot+(h-l); r3 = h+2*(pivot-l);
        s1 = 2*pivot-h; s2 = pivot-(h-l); s3 = l-2*(h-pivot);
      }'''

new_classic = '''      } else {
        pivot = (h + l + c) / 3;
        r1 = (2 * pivot) - l;
        s1 = (2 * pivot) - h;
        r2 = pivot + (h - l);
        s2 = pivot - (h - l);
        r3 = h + 2 * (pivot - l);
        s3 = l - 2 * (h - pivot);
      }'''
if old_classic in code:
    code = code.replace(old_classic, new_classic)


# 3. Fix colors of levelDefs: Red for Rs, Green for Ss
old_levels = '''  const levelDefs=result?[
    {label:"R3",sub:"Resistance 3",value:result.r3,color:"#9f1239",light:dark?"#4c0519":"#fff1f2",border:"#fda4af"},
    {label:"R2",sub:"Resistance 2",value:result.r2,color:"#dc2626",light:dark?"#3b0f0f":"#fef2f2",border:"#fecaca"},
    {label:"R1",sub:"Resistance 1",value:result.r1,color:"#ea580c",light:dark?"#431407":"#fff7ed",border:"#fed7aa"},
    {label:"PP",sub:"Pivot Point", value:result.pivot,color:"#2563eb",light:dark?"#1a2f50":"#eff6ff",border:"#bfdbfe",bold:true},
    {label:"S1",sub:"Support 1",   value:result.s1,color:"#16a34a",light:dark?"#14532d":"#f0fdf4",border:"#bbf7d0"},
    {label:"S2",sub:"Support 2",   value:result.s2,color:"#0891b2",light:dark?"#164e63":"#ecfeff",border:"#a5f3fc"},
    {label:"S3",sub:"Support 3",   value:result.s3,color:"#7c3aed",light:dark?"#2e1065":"#f5f3ff",border:"#c4b5fd"},
  ]:[];'''

new_levels = '''  const levelDefs=result?[
    {label:"R3",sub:"Resistance 3",value:result.r3,color:"#9f1239",light:dark?"#4c0519":"#fff1f2",border:"#fda4af"},
    {label:"R2",sub:"Resistance 2",value:result.r2,color:"#dc2626",light:dark?"#3b0f0f":"#fef2f2",border:"#fecaca"},
    {label:"R1",sub:"Resistance 1",value:result.r1,color:"#ef4444",light:dark?"#450a0a":"#fef2f2",border:"#fca5a5"},
    {label:"PP",sub:"Pivot Point", value:result.pivot,color:"#2563eb",light:dark?"#1a2f50":"#eff6ff",border:"#bfdbfe",bold:true},
    {label:"S1",sub:"Support 1",   value:result.s1,color:"#16a34a",light:dark?"#14532d":"#f0fdf4",border:"#bbf7d0"},
    {label:"S2",sub:"Support 2",   value:result.s2,color:"#22c55e",light:dark?"#064e3b":"#dcfce7",border:"#86efac"},
    {label:"S3",sub:"Support 3",   value:result.s3,color:"#4ade80",light:dark?"#064e3b":"#d1fae5",border:"#4ade80"},
  ]:[];'''
if old_levels in code:
    code = code.replace(old_levels, new_levels)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Pivot logic safely updated!")
