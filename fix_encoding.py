import codecs
import sys

filepath = r"app/page.jsx"

try:
    # Read the file with utf-8 encoding (if it was saved as utf-8)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
except Exception as e:
    print("Could not read as utf-8, trying latin1...", e)
    with open(filepath, "r", encoding="latin1") as f:
        content = f.read()

# Known mojibake mappings that appeared in the file
replacements = {
    "â€“": "-",
    "â€”": "-",
    "âœ…": "✅",
    "âš¡": "⚡",
    "âš ï¸ ": "⚠️",
    "âš ": "⚠️",  # alternative without variation selector
    "â–²": "▲",
    "â–¼": "▼",
    "â˜…": "★",
    "â€¢": "•",
    "â”€": "-",
    "â• ": "=",
    "Ã¢": ""
}

original_len = len(content)
for k, v in replacements.items():
    content = content.replace(k, v)

# Re-write file securely as true UTF-8
with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Done. File cleaned and saved as UTF-8.")
