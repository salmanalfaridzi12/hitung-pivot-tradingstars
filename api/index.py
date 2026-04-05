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

        # Handling cases where fast_info properties might return NaN or error
        if price is None or str(price) == 'nan':
            raise HTTPException(status_code=404, detail=f"Stock data unavailable for {ticker}")

        # Compute MA20 Volume
        try:
            import datetime
            import pytz
            tz = pytz.timezone('Asia/Jakarta')
            now = datetime.datetime.now(tz)

            hist_1mo = stock.history(period="1mo")
            ma20_volume = 0
            if not hist_1mo.empty:
                vols = hist_1mo['Volume']
                # Exclude today if market is still running (before 16:00 WIB)
                if now.hour < 16 and not vols.empty and vols.index[-1].date() == now.date():
                    vols = vols[:-1]
                
                ma20_vol_raw = vols.tail(20).mean()
                ma20_volume = int(round(ma20_vol_raw / 100)) if ma20_vol_raw else 0
        except Exception as e:
            print(f"Error calculating MA20 Volume: {e}")
            ma20_volume = 0

        return {
            "ticker": ticker_jk,
            "close": float(price),
            "high": float(day_high),
            "low": float(day_low),
            "volume": int(volume / 100) if volume else 0,
            "ma20_volume": ma20_volume
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
