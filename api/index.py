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
        hist = stock.history(period=fetch_period)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data for {ticker}")

        # Drop today's incomplete candle if market still open
        if now.hour < 16 and not hist.empty and hist.index[-1].date() == now.date():
            hist = hist[:-1]

        if len(hist) < bars_needed:
            raise HTTPException(
                status_code=404,
                detail=f"Not enough history for {tf} aggregation ({len(hist)} bars, need {bars_needed})"
            )

        # ── Build current-period OHLCV ───────────────────────────────────────
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

        return {
            "ticker":      ticker_jk,
            "timeframe":   tf,
            "open":        round(ohlcv["open"],  2),
            "high":        round(ohlcv["high"],  2),
            "low":         round(ohlcv["low"],   2),
            "close":       round(ohlcv["close"], 2),
            "volume":      int(ohlcv["volume"] / 100),
            "ma20_volume": ma20_volume,
            "ma20_price":  round(ma20_price) if ma20_price > 0 else 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unhandled error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error fetching stock data")
