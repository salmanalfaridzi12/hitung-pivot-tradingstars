/**
 * GET /api/stock/[code]
 *
 * Fetches latest OHLCV data + calculated MA20 Volume & MA20 Price for an
 * Indonesian stock listed on IDX.  Uses Yahoo Finance /v8/finance/chart with
 * the two-step cookie + crumb authentication pattern required since 2024.
 *
 * Ticker mapping:  "MNCN"  →  "MNCN.JK"
 */

// In-memory crumb cache (server lifetime, reset on cold start)
let cachedCrumb = null;
let cachedCookie = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Step 1 — Fetch Yahoo Finance cookies from the consent / FC endpoint.
 */
async function getYahooCookie() {
  const res = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": BROWSER_UA },
    redirect: "follow",
  });
  const setCookieHeader = res.headers.get("set-cookie") || "";
  // Extract the "B" session cookie
  const match = setCookieHeader.match(/B=([^;]+)/);
  return match ? `B=${match[1]}` : "";
}

/**
 * Step 2 — Exchange cookie for a crumb token.
 */
async function getYahooCrumb(cookie) {
  const res = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": BROWSER_UA,
      Cookie: cookie,
    },
  });
  const crumb = await res.text();
  return crumb.trim();
}

/**
 * Returns { cookie, crumb }, refreshing from Yahoo if the cached values
 * are older than CACHE_TTL_MS.
 */
async function getAuth() {
  const now = Date.now();
  if (cachedCrumb && cachedCookie && now - cacheTimestamp < CACHE_TTL_MS) {
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  const cookie = await getYahooCookie();
  const crumb = await getYahooCrumb(cookie);

  cachedCookie = cookie;
  cachedCrumb = crumb;
  cacheTimestamp = now;

  return { cookie, crumb };
}

/**
 * Calculate average of a numeric array, ignoring null/undefined/NaN.
 */
function safeAvg(arr = []) {
  const valid = arr.filter((v) => v != null && !isNaN(v));
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

/**
 * Main Route Handler
 */
export async function GET(request, { params }) {
  const code = params.code?.toUpperCase().trim();
  if (!code) {
    return Response.json({ error: "Stock code is required" }, { status: 400 });
  }

  const ticker = `${code}.JK`;

  try {
    // ── Authenticate ──────────────────────────────────────────────────────
    const { cookie, crumb } = await getAuth();

    // ── Fetch 3-month daily chart (enough for MA20 calculation) ──────────
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
      `?interval=1d&range=3mo&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Cookie: cookie,
        Accept: "application/json",
      },
    });

    if (res.status === 404) {
      return Response.json(
        { error: `Saham "${code}" tidak ditemukan di IDX.` },
        { status: 404 }
      );
    }

    if (!res.ok) {
      // Crumb might be stale — clear cache so next request refreshes
      cachedCrumb = null;
      cachedCookie = null;
      return Response.json(
        { error: `Yahoo Finance error ${res.status}. Coba lagi sebentar.` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return Response.json(
        { error: `Data tidak tersedia untuk "${code}".` },
        { status: 404 }
      );
    }

    const quote = result.indicators?.quote?.[0] ?? {};
    const n = (result.timestamp ?? []).length;

    if (n === 0) {
      return Response.json(
        { error: `Tidak ada candle data untuk "${code}".` },
        { status: 404 }
      );
    }

    // ── Latest candle (last trading day) ─────────────────────────────────
    // Walk back from the end to find the last non-null candle
    let idx = n - 1;
    while (idx >= 0 && (quote.close?.[idx] == null || isNaN(quote.close[idx]))) {
      idx--;
    }
    if (idx < 0) {
      return Response.json({ error: "Data candle kosong." }, { status: 404 });
    }

    const open   = quote.open?.[idx]   ?? null;
    const high   = quote.high?.[idx]   ?? null;
    const low    = quote.low?.[idx]    ?? null;
    const close  = quote.close?.[idx]  ?? null;
    const volume = quote.volume?.[idx] ?? null;

    // ── MA20 (use the 20 candles ending at idx) ───────────────────────────
    const slice20 = (arr) => (arr ?? []).slice(Math.max(0, idx - 19), idx + 1);

    const ma20Price  = safeAvg(slice20(quote.close));
    const ma20Volume = safeAvg(slice20(quote.volume));

    // ── Metadata ──────────────────────────────────────────────────────────
    const meta = result.meta ?? {};
    const lastTimestamp = result.timestamp?.[idx];
    const tradingDate = lastTimestamp
      ? new Date(lastTimestamp * 1000).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

    return Response.json({
      code,
      ticker,
      tradingDate,
      currency: meta.currency ?? "IDR",
      open:      open   != null ? Math.round(open)   : null,
      high:      high   != null ? Math.round(high)   : null,
      low:       low    != null ? Math.round(low)    : null,
      close:     close  != null ? Math.round(close)  : null,
      volume:    volume != null ? Math.round(volume) : null,
      ma20Price:  ma20Price  != null ? Math.round(ma20Price)  : null,
      ma20Volume: ma20Volume != null ? Math.round(ma20Volume) : null,
      currentPrice: close != null ? Math.round(close) : null,
    });
  } catch (err) {
    console.error("[API /stock] Error:", err);
    return Response.json(
      { error: "Gagal mengambil data. Periksa koneksi dan coba lagi." },
      { status: 500 }
    );
  }
}
