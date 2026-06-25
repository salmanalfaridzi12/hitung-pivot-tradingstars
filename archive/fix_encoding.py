import codecs
import re

filepath = r"app/page.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

def clean_warning_text(text, replacement):
    # This will match the text even if it has arbitrary garbage before it
    # We look for "DATA TIDAK VALID", "Sedang Koreksi", "Risk Tinggi", "Tech Rebound"
    # and we forcefully replace the exact line logic.
    pass

# We can just do regex replacement for the whole line since we know exactly what is there.
content = re.sub(r'alert\(".*?DATA TIDAK VALID:', 'alert("⚠️ DATA TIDAK VALID:', content)
content = re.sub(r'alert\(".*?DATA TIDAK MASUK AKAL:', 'alert("⚠️ DATA TIDAK MASUK AKAL:', content)

# Risk tinggi line
content = re.sub(r'\? ".*Risk Tinggi"', '? "⚠️ Risk Tinggi"', content)

# Badges
content = re.sub(r'badge = ".*Tech Rebound";', 'badge = "⚠️ Tech Rebound";', content)
content = re.sub(r'badge = ".*Sedang Koreksi";', 'badge = "⚠️ Sedang Koreksi";', content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Done with regex replacements.")
