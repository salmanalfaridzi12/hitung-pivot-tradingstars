import os

file_path = 'app/page.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. cardClass Fix
code = code.replace(
    'const cardClass = "bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-2xl overflow-hidden mb-3 relative transition-all duration-300 shadow-[0_8px_32px_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]";',
    'const cardClass = `backdrop-blur-md border rounded-2xl overflow-hidden mb-3 relative transition-all duration-300 ${dark ? "bg-black/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-white/20 border-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.07)]"}`;'
)

# 2. Main Wrapper Fix
code = code.replace(
    '<div className="min-h-screen flex justify-center p-6 relative transition-colors duration-500 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-black text-black dark:text-white" style={{ fontFamily:"\'Segoe UI\',system-ui,sans-serif" }}>',
    '<div className={`min-h-screen flex justify-center p-6 relative transition-colors duration-500 ${dark ? "bg-gradient-to-br from-slate-900 to-black text-white" : "bg-white text-black"}`} style={{ fontFamily:"\'Segoe UI\',system-ui,sans-serif" }}>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Replacement done via Python to bypass Tailwind dark prefix!")
