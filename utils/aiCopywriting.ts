// Phase 23 — AI COPYWRITING LAYER (PRESENTATION ONLY).
//
// Mengubah output AI (/api/ai-analyze) menjadi teks "Salin / Bagikan" bergaya
// mentor trading berpengalaman: bahasa Indonesia sederhana, kalimat pendek,
// bebas jargon indikator — siap dibaca di WhatsApp/Telegram/Notes.
//
// LARANGAN: ✗ kalkulasi pasar ✗ level baru ✗ skor baru ✗ mengubah keputusan AI.
// Seluruh angka, sentimen, skor, dan alasan datang dari aiData APA ADANYA —
// modul ini hanya memilih KATA (wording), bukan sinyal.

export interface AiCopyLevel {
  level?: number | string | null;
  /** Alasan dari AI — entry memakai `desc`, TP/SL memakai `reason`. */
  desc?: string | null;
  reason?: string | null;
}

export interface AiCopyInput {
  symbol?: string | null;
  timeframe?: string | null;
  /** BULLISH | BEARISH | KONSOLIDASI | wait_and_see | NETRAL (dari AI). */
  sentiment?: string | null;
  /** 0–100, dihitung deterministik di server — dipakai apa adanya. */
  confluenceScore?: number | null;
  headline?: string | null;
  /** analysis_text ?? analysis (fallback schema lama). */
  narrative?: string | null;
  entryAggressive?: AiCopyLevel | null;
  entryDemand?: AiCopyLevel | null;
  tp?: AiCopyLevel | null;
  sl?: AiCopyLevel | null;
  zonaPantau?: { bottom?: number | string | null; top?: number | string | null; desc?: string | null } | null;
  risk?: string | null;
  /** Dari calcRRR (string/angka) — hanya DIBACA untuk memilih narasi. */
  rrr?: number | string | null;
  /** aiSetup.collapse — bearish / wait & see / entry N/A. */
  crisis?: boolean;
}

type Mood = "bullish" | "bearish" | "sideways" | "wait";

const DIVIDER = "━━━━━━━━━━━━━━━━━━";

const DISCLAIMER =
  "⚠️ Analisa AI ini bersifat edukatif dan bukan merupakan rekomendasi investasi. " +
  "Selalu lakukan analisa pribadi serta gunakan manajemen risiko sebelum mengambil keputusan trading.";

// ── Util presentasi (identik semantik dengan helper page.jsx) ─────────────────
const isNA = (v: unknown): boolean => {
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  return (
    s === "" || s === "-" || s === "n/a" || s === "na" ||
    s === "tidak ada" || s === "null" ||
    /wait[\s_]*(and[\s_]*)?see/.test(s)
  );
};

const fmtLevel = (v: number | string | null | undefined): string => {
  if (v == null) return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("id-ID") : "-";
  const s = String(v).trim();
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return s !== "" && Number.isFinite(n) && /\d/.test(s) ? n.toLocaleString("id-ID") : s || "-";
};

// RR dibaca dari string app ("0.54" / "1 : 0.54") — angka terakhir yang valid.
function parseRR(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const tokens = String(v).match(/\d+(?:[.,]\d+)?/g);
  if (!tokens?.length) return null;
  const n = Number(tokens[tokens.length - 1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function moodOf(sentiment: string | null | undefined): Mood {
  const s = String(sentiment ?? "").toLowerCase();
  if (/bullish/.test(s)) return "bullish";
  if (/bearish/.test(s)) return "bearish";
  if (/wait/.test(s)) return "wait";
  return "sideways"; // KONSOLIDASI / NETRAL / tak dikenal → mendatar
}

// ── Kamus jargon → bahasa awam ────────────────────────────────────────────────
// Urutan PENTING: frasa spesifik lebih dulu, kata generik paling akhir.
// Semua padanan berupa frasa nomina agar kalimat asli AI tetap gramatikal.
const ORDINAL: Record<string, string> = { "1": "pertama", "2": "kedua", "3": "ketiga" };

type Rule = readonly [RegExp, string] | readonly [RegExp, (m: string, ...g: string[]) => string];

const GLOSSARY: readonly Rule[] = [
  // Buang singkatan dalam kurung supaya tidak diterjemahkan dua kali.
  [/\s*\((?:BoS|ChoCh|FVG|SMC|OB|VCP)\)/gi, ""],
  // Pola candle
  [/\bbullish\s+marubozu\b/gi, "candle naik penuh — pembeli menguasai perdagangan dari awal sampai akhir sesi"],
  [/\bbearish\s+marubozu\b/gi, "candle turun penuh — penjual menguasai perdagangan dari awal sampai akhir sesi"],
  [/\bmarubozu\b/gi, "candle bertubuh penuh tanpa perlawanan"],
  [/\bbullish\s+engulfing\b/gi, "candle naik besar yang menutupi candle sebelumnya — pembeli mengambil alih"],
  [/\bbearish\s+engulfing\b/gi, "candle turun besar yang menutupi candle sebelumnya — penjual mengambil alih"],
  [/\bdoji\b/gi, "candle ragu-ragu (pembeli dan penjual masih seimbang)"],
  [/\bshooting\s+star\b/gi, "candle dengan ekor atas panjang — penjual mulai menekan"],
  [/\bhammer\b/gi, "candle dengan ekor bawah panjang — pembeli mulai melawan"],
  [/\bcandlestick\b/gi, "candle"],
  // Struktur SMC
  [/\bbreak\s+of\s+structure\b/gi, "penembusan struktur harga sebelumnya"],
  [/\bBoS\b/g, "penembusan struktur harga"],
  [/\bchange\s+of\s+character\b/gi, "perubahan karakter pergerakan harga"],
  [/\bChoCh\b/gi, "perubahan karakter pergerakan harga"],
  [/\bbullish\s+order\s?blocks?\b/gi, "area akumulasi beli institusi"],
  [/\bbearish\s+order\s?blocks?\b/gi, "area distribusi jual institusi"],
  [/\border\s?blocks?\b/gi, "area transaksi besar institusi"],
  [/\bfair\s+value\s+gaps?\b/gi, "celah harga yang belum terisi"],
  [/\bFVG\b/g, "celah harga yang belum terisi"],
  [/\bliquidity\s+(?:sweep|grab)\b/gi, "aksi menyapu antrean order"],
  [/\bliquidity\b/gi, "area ramai antrean transaksi"],
  [/\blikuiditas\b/gi, "antrean transaksi"],
  [/\bsmart\s+money\s+concepts?\b/gi, "jejak transaksi institusi besar"],
  [/\bSMC\b/g, "jejak transaksi institusi besar"],
  [/\bVCP\b/g, "pola penyempitan rentang harga (biasanya tanda akumulasi)"],
  [/\bswing\s+high\b/gi, "puncak harga sebelumnya"],
  [/\bswing\s+low\b/gi, "dasar harga sebelumnya"],
  // Moving average & volume
  [/\bMA\s?-?20\s+volume\b/gi, "rata-rata volume 20 hari terakhir"],
  [/\bvolume\s+MA\s?-?20\b/gi, "rata-rata volume 20 hari terakhir"],
  [/\bMA\s?-?20(?:\s+price)?\b/gi, "rata-rata harga 20 hari"],
  // Pivot & level
  [/\bpivot\s+point\b/gi, "titik keseimbangan harga"],
  [/\bPP\b/g, "titik keseimbangan harga"],
  [/\b(?:resistance\s+|resisten(?:si)?\s+)?R([123])\b/gi, (_m, d) => `area resistance ${ORDINAL[d]}`],
  [/\b(?:support\s+)?S([123])\b/gi, (_m, d) => `area support ${ORDINAL[d]}`],
  // Zona demand/supply
  [/\b(?:area|zona)\s+demand\b/gi, "area minat beli"],
  [/\bdemand\s+zones?\b/gi, "area minat beli"],
  [/\bdemand\b/gi, "minat beli"],
  [/\b(?:area|zona)\s+supply\b/gi, "area tekanan jual"],
  [/\bsupply\s+zones?\b/gi, "area tekanan jual"],
  [/\bsupply\b/gi, "tekanan jual"],
  // Istilah momentum/aksi
  [/\b(berhasil|sudah|telah|mampu)\s+break\s?out\b/gi, "$1 menembus"],
  [/\bbreak\s?out\b/gi, "penembusan"],
  [/\brebound\b/gi, "berbalik naik"],
  [/\boverbought\b/gi, "sudah naik terlalu cepat dalam waktu singkat"],
  [/\boversold\b/gi, "sudah turun terlalu dalam dalam waktu singkat"],
  [/\buptrend\b/gi, "tren naik"],
  [/\bdowntrend\b/gi, "tren turun"],
  [/\bwait\s*(?:and|&|_)\s*see\b/gi, "menunggu konfirmasi"],
  [/\brisk[\s/&-]*reward(?:\s+ratio)?\b/gi, "perbandingan risiko dan keuntungan"],
  [/\bRRR?\b/g, "perbandingan risiko dan keuntungan"],
  // Kata generik paling akhir (frasa spesifik di atas sudah aman).
  [/\bbullish\b/gi, "naik"],
  [/\bbearish\b/gi, "turun"],
];

/** Terjemahkan istilah teknikal di teks AI menjadi bahasa awam (wording saja). */
export function humanizeJargon(text: string | null | undefined): string {
  if (!text) return "";
  let s = String(text);
  for (const [re, rep] of GLOSSARY) {
    s = typeof rep === "string" ? s.replace(re, rep) : s.replace(re, rep);
  }
  return s
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

// ── Blok kalimat dinamis (dipilih dari sentimen & skor AI, bukan dihitung) ────
function kondisiPasar(mood: Mood): { emoji: string; label: string } {
  if (mood === "bullish") return { emoji: "🟢", label: "Bullish (Tren Naik)" };
  if (mood === "bearish") return { emoji: "🔴", label: "Bearish (Tren Turun)" };
  if (mood === "wait") return { emoji: "🟡", label: "Wait & See (Tunggu Konfirmasi)" };
  return { emoji: "🟡", label: "Sideways (Bergerak Mendatar)" };
}

function keyakinanLabel(score: number): string {
  if (score >= 80) return "sangat kuat";
  if (score >= 65) return "kuat";
  if (score >= 50) return "cukup";
  if (score >= 35) return "lemah";
  return "sangat lemah";
}

// "Apa yang sedang terjadi + kenapa AI punya bias itu" — pembuka ringkasan.
function kalimatPembuka(mood: Mood, score: number | null): string {
  if (mood === "bullish") {
    if (score != null && score >= 65) return "AI melihat peluang kenaikan yang cukup kuat.";
    if (score != null && score >= 45) return "AI melihat peluang kenaikan, meski masih butuh konfirmasi tambahan.";
    return "AI melihat arah mulai condong naik, namun sinyalnya belum sepenuhnya meyakinkan.";
  }
  if (mood === "bearish") return "AI melihat tekanan jual masih mendominasi pasar.";
  if (mood === "wait") return "AI menilai kondisi pasar belum ideal untuk masuk posisi.";
  return "AI melihat pasar sedang bergerak mendatar — kekuatan pembeli dan penjual masih berimbang.";
}

// "Apa yang perlu diperhatikan trader" — penutup ringkasan.
function kalimatPenutupRingkasan(mood: Mood): string {
  if (mood === "bullish") return "Selama harga masih bertahan di atas area support utama, tren naik ini masih dianggap sehat.";
  if (mood === "bearish") return "Selama belum ada tanda pembalikan arah yang jelas, menahan diri adalah pilihan paling aman.";
  if (mood === "wait") return "Biarkan pasar menunjukkan arahnya dulu — masuk tanpa konfirmasi hanya memperbesar risiko.";
  return "Tunggu harga keluar dari rentang mendatarnya sebelum mengambil keputusan besar.";
}

// Narasi risiko adaptif terhadap RR yang SUDAH dihitung app.
function narasiRisiko(rr: number | null): string | null {
  if (rr == null) return null;
  if (rr >= 2) {
    return "Kabar baiknya, potensi keuntungan pada setup ini jauh lebih besar dibanding risiko yang harus ditanggung. Meski begitu, tetap pasang Stop Loss sebagai pengaman.";
  }
  if (rr >= 1) {
    return "Perbandingan antara risiko dan potensi keuntungan masih cukup sehat, sehingga setup ini layak dipertimbangkan. Tetap disiplin dengan Stop Loss.";
  }
  return "Potensi keuntungan saat ini masih lebih kecil dibanding risiko yang harus ditanggung. Karena itu, gunakan ukuran lot yang sesuai dan tetap disiplin menggunakan Stop Loss.";
}

function kesimpulan(mood: Mood): string {
  if (mood === "bullish") {
    return "Bias AI saat ini masih BUY. Namun hindari mengejar harga yang sudah naik terlalu jauh — menunggu pullback atau penembusan yang valid akan memberi titik masuk yang lebih aman.";
  }
  if (mood === "bearish") {
    return "Bias AI saat ini cenderung turun, jadi prioritas utamanya adalah menjaga modal. Tunggu tanda pembalikan arah yang jelas sebelum berpikir untuk membeli.";
  }
  if (mood === "wait") {
    return "AI menyarankan menunggu dulu. Peluang di pasar selalu ada — masuk tanpa konfirmasi justru memperbesar risiko.";
  }
  return "Pasar belum memilih arah. Bersabar menunggu harga menembus salah satu sisi biasanya lebih menguntungkan daripada menebak-nebak.";
}

const MODE_MENUNGGU =
  "AI belum menemukan setup beli yang layak saat ini. Jangan memaksakan entry — lebih baik menunggu sampai muncul tanda pembalikan yang jelas.";

// ── Public API — susun teks Salin/Bagikan ─────────────────────────────────────
export function composeAiCopy(input: AiCopyInput): string {
  const symbol = String(input.symbol ?? "").trim() || "Saham";
  const tf = String(input.timeframe ?? "").trim() || "DAILY";
  const mood = moodOf(input.sentiment);
  const score =
    typeof input.confluenceScore === "number" && Number.isFinite(input.confluenceScore)
      ? Math.round(input.confluenceScore)
      : null;
  const cond = kondisiPasar(mood);
  const crisis =
    input.crisis ??
    (mood === "bearish" || mood === "wait" || (isNA(input.entryAggressive?.level) && isNA(input.entryDemand?.level)));

  const parts: string[] = [];
  parts.push(`📊 Analisa AI — ${symbol} (${tf})`);
  parts.push(`${cond.emoji} Kondisi Pasar\n${cond.label}`);
  if (score != null) parts.push(`⭐ Tingkat Keyakinan AI\n${score}/100 — keyakinan ${keyakinanLabel(score)}`);
  parts.push(DIVIDER);

  // Ringkasan: apa yang terjadi → kenapa → apa yang diperhatikan.
  parts.push("📌 Ringkasan");
  parts.push(kalimatPembuka(mood, score));
  // Headline hanya fallback saat narasi kosong (hindari info dobel).
  const rawNarasi = String(input.narrative ?? "").trim() || String(input.headline ?? "").trim();
  const narasi = humanizeJargon(rawNarasi);
  if (narasi) parts.push(...narasi.split(/\n+/).map((p) => p.trim()).filter(Boolean));
  parts.push(kalimatPenutupRingkasan(mood));
  parts.push(DIVIDER);

  if (!crisis) {
    const plan: string[] = [];
    const item = (emoji: string, label: string, lv: AiCopyLevel | null | undefined) => {
      if (!lv || isNA(lv.level)) return;
      const why = humanizeJargon(lv.desc ?? lv.reason);
      plan.push(`${emoji} ${label}\n${fmtLevel(lv.level)}${why ? ` — ${why}` : ""}`);
    };
    item("📍", "Entry", input.entryAggressive);
    item("🔄", "Area Buy on Pullback", input.entryDemand);
    item("🎯", "Target Profit", input.tp);
    item("🛑", "Stop Loss", input.sl);
    if (plan.length) {
      parts.push("💼 Rencana Trading");
      parts.push(...plan);
      parts.push(DIVIDER);
    }
  } else {
    parts.push("⏳ Mode Menunggu");
    parts.push(MODE_MENUNGGU);
    const zp = input.zonaPantau;
    if (zp && !isNA(zp.bottom) && !isNA(zp.top)) {
      const why = humanizeJargon(zp.desc);
      parts.push(`🔍 Zona Pantau\n${fmtLevel(zp.bottom)} – ${fmtLevel(zp.top)}${why ? ` — ${why}` : ""}`);
    }
    parts.push(DIVIDER);
  }

  // Risiko: narasi RR hanya saat ada rencana aktif (crisis tidak punya setup).
  const risiko: string[] = [];
  const rrText = crisis ? null : narasiRisiko(parseRR(input.rrr));
  if (rrText) risiko.push(rrText);
  const catatan = humanizeJargon(input.risk);
  if (catatan) risiko.push(`Catatan: ${catatan}`);
  if (risiko.length) {
    parts.push("⚖️ Risiko yang Perlu Diketahui");
    parts.push(...risiko);
    parts.push(DIVIDER);
  }

  parts.push("🧭 Kesimpulan AI");
  parts.push(kesimpulan(mood));
  parts.push(DIVIDER);
  parts.push(DISCLAIMER);
  return parts.join("\n\n");
}

// ═══ Phase 23.1 — THREADS FORMATTER (format BARU, bukan reuse teks Salin) ═══
// Post singkat gaya trader profesional berbagi insight: hook → penjelasan →
// plan → pengingat risiko → pertanyaan engagement → hashtag. Maks 450 karakter,
// 3–6 emoji. Tetap presentation-only: seluruh nilai dari aiData apa adanya.

const THREADS_LIMIT = 450;

// Potong di batas kata (bukan tengah kata) dengan elipsis.
function truncateWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, Math.max(0, max - 1));
  const at = cut.lastIndexOf(" ");
  return (at > 20 ? cut.slice(0, at) : cut).replace(/[\s,;:—-]+$/, "") + "…";
}

function threadsHook(mood: Mood, symbol: string, score: number | null): string {
  if (mood === "bullish") {
    return score != null && score >= 65
      ? `📈 ${symbol} mulai menunjukkan sinyal menarik.`
      : `📈 ${symbol} masuk radar AI hari ini.`;
  }
  if (mood === "bearish") return `⚠️ ${symbol} masih tertekan — saatnya ekstra sabar.`;
  if (mood === "wait") return `⏳ ${symbol} masuk mode tunggu dulu.`;
  return `👀 ${symbol} sedang mendatar — pasar menunggu arah.`;
}

// "Kenapa penting + apa yang dipantau" — satu paragraf pendek per bias.
function threadsWhy(mood: Mood, score: number | null): string {
  if (mood === "bullish") {
    const skor = score != null ? ` (skor AI ${score}/100)` : "";
    return `Peluang naik masih terbuka${skor}. Kuncinya: harga bertahan di atas area support.`;
  }
  if (mood === "bearish") return "Tekanan jual masih dominan. Tunggu tanda pembalikan sebelum masuk.";
  if (mood === "wait") return "AI belum melihat setup yang layak. Konfirmasi dulu, baru aksi.";
  return "Pembeli dan penjual masih seimbang. Biarkan harga memilih arah dulu.";
}

function threadsRisk(rr: number | null): string {
  if (rr != null && rr < 1) return "🛡️ Potensi profit masih lebih kecil dari risikonya — kecilkan posisi.";
  if (rr != null && rr >= 2) return "🛡️ RR menarik, tapi tetap pakai Stop Loss.";
  if (rr != null) return "🛡️ RR cukup sehat — tetap disiplin Stop Loss.";
  return "🛡️ Apapun biasnya, manajemen risiko tetap nomor satu.";
}

function threadsQuestion(mood: Mood): string {
  if (mood === "bullish") return "Bullish atau bearish menurut kalian?";
  if (mood === "bearish") return "Menurut kalian masih layak hold?";
  if (mood === "wait") return "Bagaimana pendapat kalian?";
  return "Ada yang sedang memperhatikan saham ini juga?";
}

// 5–8 hashtag dinamis (simbol disisipkan bila ada; dedupe).
function threadsHashtags(symbolRaw: string): string {
  const sym = symbolRaw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const tags = ["#IHSG", "#SahamIndonesia", "#Trading", "#Investasi"];
  if (sym && sym !== "SAHAM") tags.push(`#${sym}`);
  tags.push("#TradingStars");
  return Array.from(new Set(tags)).join(" ");
}

export function composeThreadsCopy(input: AiCopyInput): string {
  const rawSym = String(input.symbol ?? "").trim();
  const symbol = rawSym ? rawSym.toUpperCase() : "Saham";
  const mood = moodOf(input.sentiment);
  const score =
    typeof input.confluenceScore === "number" && Number.isFinite(input.confluenceScore)
      ? Math.round(input.confluenceScore)
      : null;
  const crisis =
    input.crisis ??
    (mood === "bearish" || mood === "wait" || (isNA(input.entryAggressive?.level) && isNA(input.entryDemand?.level)));

  const hook = threadsHook(mood, symbol, score);
  const p2 = threadsWhy(mood, score);

  // Plan ringkas / ajakan memantau (crisis tidak menampilkan level eksekusi).
  let blok = "";
  if (!crisis) {
    const entryLevel = !isNA(input.entryAggressive?.level)
      ? input.entryAggressive?.level
      : input.entryDemand?.level;
    const lines: string[] = [];
    if (!isNA(entryLevel)) lines.push(`📍 Entry ${fmtLevel(entryLevel)}`);
    if (!isNA(input.tp?.level)) lines.push(`🎯 TP ${fmtLevel(input.tp?.level)}`);
    if (!isNA(input.sl?.level)) lines.push(`🛑 SL ${fmtLevel(input.sl?.level)}`);
    blok = lines.join("\n");
  } else {
    const zp = input.zonaPantau;
    blok =
      zp && !isNA(zp.bottom) && !isNA(zp.top)
        ? `⏳ Belum ada setup beli. Zona pantau: ${fmtLevel(zp.bottom)}–${fmtLevel(zp.top)}.`
        : "⏳ Belum ada setup beli — amati dulu reaksi harga.";
  }

  const risk = threadsRisk(crisis ? null : parseRR(input.rrr));
  const q = threadsQuestion(mood);
  const tags = threadsHashtags(rawSym);

  // "Apa yang terjadi" — kalimat pertama headline AI (fallback narasi), bebas
  // jargon, dipotong sesuai sisa anggaran karakter.
  const sumber = String(input.headline ?? "").trim() || String(input.narrative ?? "").trim();
  let p1 = humanizeJargon(sumber);
  const kalimat = p1.match(/^[^.!?\n]+[.!?]?/);
  p1 = (kalimat ? kalimat[0] : p1).trim();
  const others = [hook, p2, blok, risk, q, tags].filter(Boolean);
  const budget = THREADS_LIMIT - others.reduce((n, x) => n + x.length, 0) - 2 * (others.length + 1);
  p1 = budget >= 40 && p1 ? truncateWords(p1, Math.min(130, budget)) : "";

  let out = [hook, p1, p2, blok, risk, q, tags].filter(Boolean).join("\n\n");
  if (out.length > THREADS_LIMIT) out = others.join("\n\n"); // guard: buang p1
  return out;
}
