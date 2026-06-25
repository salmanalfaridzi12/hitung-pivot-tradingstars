# Pivot Analyzer Pro — TradingStars

Pivot Point analyzer untuk trader IDX. Hitung level Pivot (PP, R1–R3, S1–S3) dari
data OHLC, lengkap dengan analisa tren (MA20), RRR, sinyal, pivot ladder, chart,
dan **analisa AI (Google Gemini)**.

Dibangun dengan **Next.js 16 (App Router) + React 19 + Tailwind CSS v4**.

## Fitur

- Kalkulasi Pivot Point (Daily / Weekly / Monthly)
- Deteksi pola candle, confluence, dan Risk/Reward ratio
- Pivot ladder, sinyal, dan chart (lightweight-charts)
- **Analisa AI via Gemini** — ringkasan sentiment, confidence gauge, rencana
  Entry/TP/SL, dengan cache, auto-analisa, salin & share Telegram
- Watchlist, History, Average calculator, export gambar
- Gate akses via Bot Telegram (production)

## Setup

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev                  # http://localhost:3000
```

> Saat development, gate Telegram otomatis dibypass (lihat `proxy.ts`), jadi bisa
> langsung akses tanpa login.

## Environment Variables

Salin dari `.env.example` ke `.env.local`:

| Variable | Wajib | Keterangan |
|---|---|---|
| `GEMINI_API_KEY` | untuk fitur AI | API key Google Gemini — ambil di https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | opsional | Default `gemini-2.5-flash` |
| `NEXT_PUBLIC_API_URL` | opsional | Backend API (auto-fill OHLC) |
| `BOT_TOKEN`, `GROUP_ID`, `JWT_SECRET` | production | Gate akses Bot Telegram |
| `NEXT_PUBLIC_SITE_URL` | production | URL situs (metadata & share) |

## Struktur

- `app/page.jsx` — halaman utama (kalkulator + UI)
- `app/api/ai-analyze/route.ts` — endpoint analisa AI (Gemini, server-side)
- `app/globals.css` — Tailwind + style 3D
- `proxy.ts` — gate auth (Next 16; dulu `middleware.ts`)
- `utils/patterns.js` — deteksi pola candle & confluence
- `archive/` — skrip dev lama (tidak dipakai runtime)

## Deploy

Optimized untuk **Vercel**. Set semua env production di dashboard Vercel. Di
production, gate Telegram dan proteksi endpoint AI aktif penuh.
