from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI()

# Enable CORS for local testing, to allow frontend from file:// or other local servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/stock/{ticker}")
async def get_stock_data(ticker: str):
    try:
        # Check if the ticker needs .JK appended
        if not ticker.upper().endswith('.JK'):
            ticker_jk = f"{ticker.upper()}.JK"
        else:
            ticker_jk = ticker.upper()
            
        stock = yf.Ticker(ticker_jk)
        
            try:
                # fast_info usually contains these attributes
                info = stock.fast_info
                
                price = info.last_price
                day_high = info.day_high
                day_low = info.day_low
                volume = info.last_volume
                try:
                    open_price = info.open
                except Exception:
                    open_price = price # fallback
            except AttributeError:
                # Fallback to history if fast_info is missing attributes
                hist = stock.history(period="1d")
                if hist.empty:
                    raise HTTPException(status_code=404, detail=f"Data not found for {ticker}")
                
                latest_data = hist.iloc[-1]
                price = latest_data.get("Close", 0.0)
                day_high = latest_data.get("High", 0.0)
                day_low = latest_data.get("Low", 0.0)
                volume = latest_data.get("Volume", 0)
                open_price = latest_data.get("Open", price)

        # Handling cases where fast_info properties might return NaN or error
        if price is None or str(price) == 'nan':
            raise HTTPException(status_code=404, detail=f"Stock data unavailable for {ticker}")

        # Compute MA20 Volume & Price
        try:
            import datetime
            import pytz
            tz = pytz.timezone('Asia/Jakarta')
            now = datetime.datetime.now(tz)

            # fetch 2mo tightly to ensure we have at least 20 trading days
            hist_history = stock.history(period="2mo")
            ma20_volume = 0
            ma20_price = 0
            if not hist_history.empty:
                vols = hist_history['Volume']
                closes = hist_history['Close']
                # Exclude today if market is still running (before 16:00 WIB)
                if now.hour < 16 and not vols.empty and vols.index[-1].date() == now.date():
                    vols = vols[:-1]
                    closes = closes[:-1]
                
                ma20_vol_raw = vols.tail(20).mean()
                ma20_volume = int(round(ma20_vol_raw / 100)) if ma20_vol_raw else 0
                
                ma20_price_raw = closes.tail(20).mean()
                ma20_price = float(ma20_price_raw) if ma20_price_raw else 0
        except Exception as e:
            print(f"Error calculating MA20 Data: {e}")
            ma20_volume = 0
            ma20_price = 0

        return {
            "ticker": ticker_jk,
            "open": float(open_price) if open_price else float(price),
            "close": float(price),
            "high": float(day_high),
            "low": float(day_low),
            "volume": int(volume / 100) if volume else 0,
            "ma20_volume": ma20_volume,
            "ma20_price": round(ma20_price) if ma20_price else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
