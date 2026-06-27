// Glosarium istilah teknikal untuk tooltip edukatif di narasi Analisa AI.
// tokenizeGlossary() memecah teks jadi segmen; segmen yang cocok glosarium
// membawa `def` agar bisa dibungkus <Tooltip> oleh komponen GlossaryText.

export interface GlossaryEntry {
  id: string;
  aliases: string[];
  def: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { id: "SMC", aliases: ["Smart Money Concept", "SMC"],
    def: "Smart Money Concept — membaca jejak 'uang besar' (institusi) lewat struktur pasar, likuiditas, dan order block." },
  { id: "BoS", aliases: ["Break of Structure", "BoS", "BOS"],
    def: "Break of Structure — harga menembus high/low struktur sebelumnya, menandakan kelanjutan tren." },
  { id: "ChoCh", aliases: ["Change of Character", "ChoCh", "CHoCH", "CHOCH"],
    def: "Change of Character — pergeseran karakter pasar (mis. dari turun ke naik); sering jadi sinyal awal pembalikan." },
  { id: "Liquidity", aliases: ["Liquidity Sweep", "Liquidity", "Likuiditas"],
    def: "Liquidity — area berisi tumpukan order/stop (di atas high / bawah low) yang sering 'disapu' institusi sebelum bergerak." },
  { id: "Order Block", aliases: ["Order Block"],
    def: "Order Block — zona candle terakhir sebelum pergerakan impulsif; sering jadi area entry institusi." },
  { id: "VCP", aliases: ["Volatility Contraction Pattern", "Volatility Contraction", "VCP"],
    def: "Volatility Contraction Pattern — koreksi yang makin mengecil dengan volume mengering; kerap mendahului breakout." },
];

// Alias diurut terpanjang dulu agar frasa multi-kata menang atas singkatannya.
const ALIASES = GLOSSARY.flatMap((g) => g.aliases.map((a) => ({ a, def: g.def })))
  .sort((x, y) => y.a.length - x.a.length);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERN = new RegExp(`(${ALIASES.map((x) => escapeRe(x.a)).join("|")})`, "gi");

export interface GlossarySegment {
  text: string;
  def?: string;
}

export function tokenizeGlossary(text: string): GlossarySegment[] {
  const out: GlossarySegment[] = [];
  if (!text) return out;
  let last = 0;
  let m: RegExpExecArray | null;
  PATTERN.lastIndex = 0;
  while ((m = PATTERN.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const matched = m[0];
    const def = ALIASES.find((x) => x.a.toLowerCase() === matched.toLowerCase())?.def;
    out.push({ text: matched, def });
    last = m.index + matched.length;
    if (PATTERN.lastIndex === m.index) PATTERN.lastIndex++; // guard zero-length
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
