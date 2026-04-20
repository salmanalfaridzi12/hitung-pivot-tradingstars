from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
import datetime
import pytz

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def aggregate_ohlcv(df: pd.DataFrame) -> dict:
    """Aggregate a DataFrame of daily OHLCV bars into a single period bar."""
    if df.empty:
        return None
    return {
        "open":   float(df["Open"].iloc[0]),
        "high":   float(df["High"].max()),
        "low":    float(df["Low"].min()),
        "close":  float(df["Close"].iloc[-1]),
        "volume": int(df["Volume"].sum()),
    }

@app.get("/api/stock/{ticker}")
async def get_stock_data(
    ticker: str,
    timeframe: str = Query(default="daily", description="daily | weekly | monthly")
):
    try:
        tf = timeframe.lower()

        if not ticker.upper().endswith(".JK"):
            ticker_jk = f"{ticker.upper()}.JK"
        else:
            ticker_jk = ticker.upper()

        stock = yf.Ticker(ticker_jk)

        tz = pytz.timezone("Asia/Jakarta")
        now = datetime.datetime.now(tz)

        # ── 1. Fetch Real-time Source (TradingView Scanner for zero-delay) ──
        live_price = 0.0
        live_high = 0.0
        live_low = 0.0
        live_open = 0.0
        live_prev_close = 0.0
        live_vol = 0

        # Primary Fast Source: TradingView (Bypasses Yahoo's 15-minute IDX delay)
        import urllib.request
        import json
        try:
            tv_url = "https://scanner.tradingview.com/indonesia/scan"
            raw_ticker = ticker.upper().replace(".JK", "")
            payload = json.dumps({
                "symbols": {"tickers": [f"IDX:{raw_ticker}"]},
                "columns": ["close", "high", "low", "open", "volume"]
            }).encode('utf-8')
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Origin': 'https://www.tradingview.com',
                'Referer': 'https://www.tradingview.com/'
            }
            
            req = urllib.request.Request(tv_url, data=payload, headers=headers)
            
            with urllib.request.urlopen(req, timeout=6) as response:
                r = json.loads(response.read().decode('utf-8'))
                if r.get('data') and len(r['data']) > 0:
                    props = r['data'][0]['d']
                    if props[0] is not None:
                        live_price = float(props[0])
                        live_high = float(props[1])
                        live_low = float(props[2])
                        live_open = float(props[3])
                        live_vol = int(props[4])
        except Exception as e:
            print(f"TradingView fetch Timeout/Blocked, falling back smoothly to Yahoo: {e}")

        # Fallback 1: yfinance fast_info
        if not live_price or live_price == 0:
            try:
                if hasattr(stock, 'fast_info'):
                    live_price = float(getattr(stock.fast_info, 'last_price', 0.0) or stock.fast_info.get('lastPrice', 0.0))
                    live_high = float(getattr(stock.fast_info, 'day_high', 0.0) or stock.fast_info.get('dayHigh', 0.0))
                    live_low = float(getattr(stock.fast_info, 'day_low', 0.0) or stock.fast_info.get('dayLow', 0.0))
                    live_open = float(getattr(stock.fast_info, 'open', 0.0) or stock.fast_info.get('open', 0.0))
                    live_prev_close = float(getattr(stock.fast_info, 'previous_close', 0.0) or stock.fast_info.get('previousClose', 0.0))
                    live_vol = int(getattr(stock.fast_info, 'last_volume', 0) or stock.fast_info.get('lastVolume', 0))
            except Exception:
                pass

        # Fallback 2: Yahoo Info
        if not live_price or live_price == 0:
            try:
                info = stock.info
                live_price = float(info.get("currentPrice") or info.get("regularMarketPrice") or 0.0)
                live_high = float(info.get("regularMarketDayHigh") or 0.0)
                live_low = float(info.get("regularMarketDayLow") or 0.0)
                live_open = float(info.get("regularMarketOpen") or 0.0)
                live_prev_close = float(info.get("previousClose") or 0.0)
                live_vol = int(info.get("regularMarketVolume") or 0)
            except Exception:
                pass
        
        # Validation for High/Low 0 or null during market open
        if live_price > 0:
            if not live_high or live_high == 0: live_high = live_price
            if not live_low or live_low == 0: live_low = live_price
            if not live_open or live_open == 0: live_open = live_prev_close if live_prev_close > 0 else live_price

        # ── Determine how many daily bars to aggregate ──────────────────────
        if tf == "weekly":
            # Last 5 trading days = 1 week candle
            bars_needed   = 5
            ma_periods    = 20   # MA20 Weekly = 20 weeks = 100 daily bars
            ma_daily_bars = 100
            fetch_period  = "6mo"
        elif tf == "monthly":
            # Last 20 trading days = 1 month candle
            bars_needed   = 20
            ma_periods    = 20   # MA20 Monthly = 20 months ≈ 400 daily bars
            ma_daily_bars = 400
            fetch_period  = "2y"
        else:  # daily (default)
            bars_needed   = 1
            ma_periods    = 20   # MA20 Daily = 20 trading days
            ma_daily_bars = 60
            fetch_period  = "3mo"

        # ── Fetch enough history ─────────────────────────────────────────────
        try:
            hist = stock.history(period=fetch_period)
        except Exception as e:
            print(f"Yahoo history error: {e}")
            hist = pd.DataFrame()

        if hist.empty:
            raise HTTPException(
                status_code=404, 
                detail=f"Koneksi bermasalah: Kedua sumber penyedia data (TradingView & Yahoo Finance) gagal merespon untuk saham {ticker}. Silakan coba lagi dalam beberapa menit."
            )

        has_today = not hist.empty and hist.index[-1].date() == now.date()

        # Update delayed history with real-time fast_info
        if live_price > 0:
            if has_today:
                hist.iloc[-1, hist.columns.get_loc('Open')] = live_open
                hist.iloc[-1, hist.columns.get_loc('High')] = max(live_high, float(hist.iloc[-1]['High']))
                hl_low = float(hist.iloc[-1]['Low'])
                hist.iloc[-1, hist.columns.get_loc('Low')] = min(live_low, hl_low) if hl_low > 0 else live_low
                hist.iloc[-1, hist.columns.get_loc('Close')] = live_price
                hist.iloc[-1, hist.columns.get_loc('Volume')] = max(live_vol, int(hist.iloc[-1]['Volume']))
            elif now.hour >= 9 and now.date().weekday() < 5:
                # Add today if missing entirely during market hours
                new_row = pd.DataFrame({
                    'Open': [live_open], 'High': [live_high], 'Low': [live_low],
                    'Close': [live_price], 'Volume': [live_vol]
                }, index=[pd.Timestamp(now)])
                hist = pd.concat([hist, new_row])
                has_today = True

        if len(hist) < bars_needed:
            raise HTTPException(
                status_code=404,
                detail=f"Not enough history for {tf} aggregation ({len(hist)} bars, need {bars_needed})"
            )

        # ── Build ACTIVE period OHLCV (Bypass T-1, Use Live Data) ────────────
        # User requested aggressive live volatility tracking, bypassing completed limits
        period_bars = hist.tail(bars_needed)
        ohlcv = aggregate_ohlcv(period_bars)

        if not ohlcv or ohlcv["close"] == 0:
            raise HTTPException(status_code=404, detail=f"Could not aggregate OHLCV for {ticker}")

        # ── Compute MA20 (price & volume) for the chosen timeframe ───────────
        ma20_price  = 0.0
        ma20_volume = 0

        ref_bars = hist.iloc[:-bars_needed] if len(hist) > bars_needed else hist  # exclude current period

        if tf == "daily":
            closes  = ref_bars["Close"].tail(ma_daily_bars)
            volumes = ref_bars["Volume"].tail(ma_daily_bars)
            ma20_price_raw  = closes.tail(20).mean()
            ma20_volume_raw = volumes.tail(20).mean()
        else:
            # Aggregate into weekly/monthly bars first, then compute MA
            group_size = bars_needed  # 5 for weekly, 20 for monthly
            chunks = [ref_bars.iloc[i:i+group_size] for i in range(0, len(ref_bars) - group_size + 1, group_size)]
            agg_closes  = pd.Series([c["Close"].iloc[-1] for c in chunks if len(c) == group_size])
            agg_volumes = pd.Series([c["Volume"].sum()  for c in chunks if len(c) == group_size])
            ma20_price_raw  = agg_closes.tail(20).mean()  if not agg_closes.empty  else float("nan")
            ma20_volume_raw = agg_volumes.tail(20).mean() if not agg_volumes.empty else float("nan")

        if pd.notna(ma20_price_raw):
            ma20_price = float(ma20_price_raw)
        if pd.notna(ma20_volume_raw):
            ma20_volume = int(round(ma20_volume_raw / 100))

        # 2. Handle Jam Bursa: Distinguish previous close vs current price
        # The T-1 Pivot reference close IS our ohlcv["close"]. 
        prev_close_val = ohlcv["close"]
        
        # Current true running price for real-time Signal checking
        current_price_val = live_price if live_price > 0 else (hist.iloc[-1]["Close"] if has_today else ohlcv["close"])

        return {
            "ticker":      ticker_jk,
            "timeframe":   tf,
            "open":        round(ohlcv["open"],  2),
            "high":        round(ohlcv["high"],  2),
            "low":         round(ohlcv["low"],   2),
            "close":       round(ohlcv["close"], 2),
            "prev_close":  round(prev_close_val, 2),
            "current_price": round(current_price_val, 2),
            "volume":      int(ohlcv["volume"] / 100),
            "ma20_volume": ma20_volume,
            "ma20_price":  round(ma20_price) if ma20_price > 0 else 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unhandled error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error fetching stock data")
