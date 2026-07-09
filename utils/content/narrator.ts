// Phase 24 — CONTENT ENGINE · NARRATOR (presentation-only).
//
// Bank kalimat bergaya trader Indonesia berpengalaman. Setiap slot (hook,
// interpretasi, risiko, kesimpulan, pertanyaan) punya beberapa variasi dan
// dipilih lewat rng ber-seed (Phase 7) supaya wording tidak pernah kaku sama,
// sementara SELURUH informasi trading (level, skor, bias) tetap identik.
//
// Gaya (Phase 2 & 8): interpretasi pasar, bukan deskripsi indikator; hindari
// pengulangan "AI melihat/mendeteksi/menemukan" — mayoritas variasi memakai
// subjek pasar (buyer, momentum, harga, tekanan jual).

import type { Mood } from "./types";
import { pick } from "./helpers";
import { E } from "./emoji";

type RNG = () => number;

// ── Phase 3 — HOOK (tanpa clickbait; hanya sebagian kecil menyebut AI) ────────
const HOOKS: Record<Mood, ReadonlyArray<(sym: string) => string>> = {
  bullish: [
    (s) => `${E.up} ${s} mulai menunjukkan sinyal menarik.`,
    (s) => `${E.chart} Ada peluang menarik di ${s} hari ini.`,
    (s) => `${E.fire} Momentum ${s} mulai berubah.`,
    (s) => `${E.watch} ${s} sedang ramai diperhatikan pelaku pasar.`,
    (s) => `${E.up} Buyer mulai mengambil kendali di ${s}.`,
    (s) => `${E.chart} ${s} masuk radar pantauan AI hari ini.`,
  ],
  bearish: [
    (s) => `${E.down} ${s} masih dalam tekanan — ini catatannya.`,
    (s) => `${E.warn} Belum waktunya agresif di ${s}.`,
    (s) => `${E.watch} ${s} sedang diuji; seller masih unggul.`,
    (s) => `${E.down} Tekanan jual di ${s} belum reda.`,
  ],
  sideways: [
    (s) => `${E.watch} ${s} sedang mendatar — pasar menunggu arah.`,
    (s) => `${E.chart} ${s} bergerak dalam rentang; kesabaran diuji.`,
    (s) => `${E.watch} Tarik-menarik di ${s} belum ada pemenangnya.`,
    (s) => `${E.chart} ${s} sedang mengambil napas dulu.`,
  ],
  wait: [
    (s) => `${E.wait} ${s} masuk mode tunggu dulu.`,
    (s) => `${E.watch} ${s} belum layak dikejar — sabar sebentar.`,
    (s) => `${E.wait} Setup di ${s} belum matang.`,
    (s) => `${E.watch} ${s} masih butuh konfirmasi sebelum layak dieksekusi.`,
  ],
};

export function hookLine(mood: Mood, sym: string, rng: RNG): string {
  return pick(rng, HOOKS[mood])(sym);
}

// ── Phase 2 — INTERPRETASI PASAR (what happened · why matters · what to watch)
const STORY_WHAT: Record<Mood, readonly string[]> = {
  bullish: [
    "Buyer mulai menguasai pergerakan harga sehingga peluang kenaikan kembali terbuka.",
    "Minat beli terlihat meningkat dibanding beberapa hari sebelumnya.",
    "Tekanan beli perlahan mengambil alih kendali, harga mulai ditopang dari bawah.",
    "Permintaan mulai lebih ramai dari penawaran — pergerakan naik jadi lebih mudah.",
  ],
  bearish: [
    "Seller masih memegang kendali dan tekanan jual belum benar-benar reda.",
    "Harga masih tertekan; pembeli belum berani masuk secara agresif.",
    "Arus jual masih lebih deras daripada minat beli.",
  ],
  sideways: [
    "Harga bergerak mendatar — kekuatan pembeli dan penjual masih berimbang.",
    "Pasar sedang mengambil napas; belum ada pihak yang memenangkan arah.",
    "Rentang harga menyempit, keputusan besar belum diambil pelaku pasar.",
  ],
  wait: [
    "Kondisi belum ideal untuk masuk; sinyalnya masih setengah matang.",
    "Setup belum terbentuk penuh — lebih baik menahan diri sebentar.",
    "Belum ada pemicu yang cukup kuat untuk mengambil posisi.",
  ],
};

const STORY_WATCH: Record<Mood, readonly string[]> = {
  bullish: [
    "Selama area support tetap terjaga, tren naik ini masih layak diikuti.",
    "Kuncinya di area support — bertahan di atasnya berarti struktur masih sehat.",
    "Perhatikan reaksi di area support; itu penentu lanjut atau tidaknya kenaikan.",
  ],
  bearish: [
    "Lebih bijak menunggu tanda pembalikan sebelum mengambil posisi.",
    "Fokus jaga modal dulu — konfirmasi pembalikan adalah syarat masuk.",
    "Amati area bawah; reaksi beli yang jelas baru layak ditindaklanjuti.",
  ],
  sideways: [
    "Tunggu harga keluar dari rentangnya sebelum mengambil keputusan besar.",
    "Penembusan salah satu sisi rentang biasanya menjadi sinyal awal arah baru.",
  ],
  wait: [
    "Konfirmasi dulu, aksi kemudian — urutannya jangan dibalik.",
    "Biarkan pasar menunjukkan arah lebih dulu, baru ikut.",
  ],
};

export function storyParts(mood: Mood, rng: RNG): { what: string; watch: string } {
  return { what: pick(rng, STORY_WHAT[mood]), watch: pick(rng, STORY_WATCH[mood]) };
}

// Skor keyakinan — disebut natural, tidak selalu dengan kata "AI".
const SCORE_LINES: ReadonlyArray<(n: number) => string> = [
  (n) => `Tingkat keyakinan analisa saat ini ${n}/100.`,
  (n) => `Skor keyakinan sistem: ${n}/100.`,
  (n) => `Secara keseluruhan, keyakinan setup ini ada di angka ${n}/100.`,
];
export function scoreLine(score: number | null, rng: RNG): string {
  return score == null ? "" : pick(rng, SCORE_LINES)(score);
}

export const BIAS_LABEL: Record<Mood, string> = {
  bullish: "Naik", bearish: "Turun", sideways: "Mendatar", wait: "Tunggu",
};

// ── RISK REMINDER (adaptif RR yang SUDAH dihitung; hanya wording yang variatif)
const RISK_LOW: readonly string[] = [
  `${E.shield} Potensi profit masih lebih kecil dari risikonya — kecilkan posisi.`,
  `${E.shield} Rasio untung-rugi belum ideal; kalau tetap masuk, pakai porsi kecil.`,
];
const RISK_MID: readonly string[] = [
  `${E.shield} Rasio untung-rugi cukup sehat — tetap disiplin batas rugi.`,
  `${E.shield} Risiko dan potensi masih seimbang; jangan lupa pasang pengaman.`,
];
const RISK_HIGH: readonly string[] = [
  `${E.shield} Potensi jauh melebihi risikonya, tapi pengaman tetap wajib.`,
  `${E.shield} Rasio untung-rugi menarik — eksekusi tetap pakai batas rugi.`,
];
const RISK_NONE: readonly string[] = [
  `${E.shield} Apapun biasnya, manajemen risiko tetap nomor satu.`,
  `${E.shield} Atur porsi dan batas rugi dulu, baru bicara profit.`,
];
export function riskLine(rr: number | null, rng: RNG): string {
  if (rr == null) return pick(rng, RISK_NONE);
  if (rr >= 2) return pick(rng, RISK_HIGH);
  if (rr >= 1) return pick(rng, RISK_MID);
  return pick(rng, RISK_LOW);
}

// ── KESIMPULAN (untuk format panjang) ─────────────────────────────────────────
const CONCLUSIONS: Record<Mood, readonly string[]> = {
  bullish: [
    "Bias saat ini masih ke arah beli, tapi jangan mengejar harga yang sudah lari — tunggu pullback atau penembusan yang valid.",
    "Peluang beli masih terbuka selama support bertahan; masuk bertahap lebih aman daripada sekali banyak.",
  ],
  bearish: [
    "Prioritasnya menjaga modal; tunggu pembalikan yang jelas sebelum kembali masuk.",
    "Belum saatnya melawan arus — biarkan tekanan jual mereda dulu.",
  ],
  sideways: [
    "Pasar belum memilih arah; bersabar sering kali lebih menguntungkan daripada menebak.",
    "Simpan amunisi sampai harga keluar dari rentangnya.",
  ],
  wait: [
    "Menunggu bukan berarti ketinggalan — masuk tanpa konfirmasi justru memperbesar risiko.",
    "Peluang selalu datang lagi; pastikan syaratnya terpenuhi dulu.",
  ],
};
export function conclusionLine(mood: Mood, rng: RNG): string {
  return pick(rng, CONCLUSIONS[mood]);
}

// ── Phase 4 — PERTANYAAN ENGAGEMENT ───────────────────────────────────────────
const QUESTIONS: Record<Mood, readonly string[]> = {
  bullish: [
    "Menurut kalian masih layak dikoleksi?",
    "Ada yang sudah pegang saham ini?",
    "Target kalian di area berapa?",
    "Masih lanjut naik atau mulai profit taking?",
    "Entry sekarang atau menunggu pullback?",
  ],
  bearish: [
    "Menurut kalian masih layak hold?",
    "Ada yang menunggu di area bawah?",
    "Kalian pilih amankan modal atau bertahan?",
    "Di harga berapa kalian mulai tertarik?",
  ],
  sideways: [
    "Ada yang sedang memperhatikan saham ini juga?",
    "Menurut kalian arah berikutnya ke mana?",
    "Sabar menunggu, atau ada yang berani masuk duluan?",
  ],
  wait: [
    "Bagaimana pendapat kalian?",
    "Ada yang sabar menunggu di bawah?",
    "Level berapa yang kalian incar untuk masuk?",
  ],
};
export function questionLine(mood: Mood, rng: RNG): string {
  return pick(rng, QUESTIONS[mood]);
}
