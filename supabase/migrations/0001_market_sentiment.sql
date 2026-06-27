-- ============================================================================
-- market_sentiment — feed News & Sentiment Analyzer / Market Pulse
-- Jalankan di Supabase SQL Editor / `supabase db push`.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.market_sentiment (
  id           uuid primary key default gen_random_uuid(),
  ticker       text        not null,
  title        text        not null,
  summary      text,
  sentiment    text        not null check (sentiment in ('Bullish', 'Bearish', 'Neutral')),
  score        int         not null check (score between 0 and 100),
  source       text,
  published_at timestamptz not null default now()
);

create index if not exists market_sentiment_ticker_idx
  on public.market_sentiment (ticker);
create index if not exists market_sentiment_published_at_idx
  on public.market_sentiment (published_at desc);

-- Row Level Security: aktif, izinkan READ publik (anon) saja.
alter table public.market_sentiment enable row level security;

drop policy if exists "Public read access" on public.market_sentiment;
create policy "Public read access"
  on public.market_sentiment
  for select
  using (true);

-- Seed data (mock) — boleh dihapus di production.
insert into public.market_sentiment (ticker, title, summary, sentiment, score, source) values
  ('BBCA', 'Asing kembali borong BBCA',        'Net buy asing Rp1,2T sepekan; harga bertahan kokoh di atas MA20.',       'Bullish', 78, 'IDX Today'),
  ('BBCA', 'Target harga BBCA dinaikkan',      'Sekuritas revisi target seiring NIM solid & kredit tumbuh dobel digit.', 'Bullish', 73, 'Market Watch'),
  ('BBRI', 'BBRI rotasi big-banks',            'Rotasi dana ke big banks; volume akumulasi terus meningkat.',            'Bullish', 71, 'Kontan'),
  ('BBRI', 'Dividen BBRI jadi katalis',        'Ekspektasi dividen tinggi menahan koreksi; demand kuat di area support.','Neutral', 55, 'Bisnis'),
  ('GOTO', 'Tekanan jual GOTO berlanjut',      'Tekanan jual lanjutan pasca lock-up; menembus support kunci.',           'Bearish', 29, 'Reuters ID'),
  ('TLKM', 'TLKM konsolidasi jelang kinerja',  'Konsolidasi jelang rilis kinerja kuartalan; menanti katalis.',           'Neutral', 52, 'CNBC ID'),
  ('ANTM', 'Nikel rebound angkat ANTM',        'Harga nikel rebound; sentimen sektor komoditas menguat.',                'Bullish', 66, 'Mining News'),
  ('MDKA', 'MDKA tertekan net sell asing',     'Koreksi sektor tambang; net sell asing dominan.',                        'Bearish', 38, 'Investor Daily'),
  ('ASII', 'ASII jelang rilis penjualan mobil','Pasar menanti data wholesales; bias netral dengan support MA50 solid.',  'Neutral', 50, 'Bisnis'),
  ('TPIA', 'TPIA breakout konsolidasi',        'Breakout range dengan volume tebal; struktur higher-high terjaga.',      'Bullish', 69, 'IDX Today')
on conflict do nothing;
