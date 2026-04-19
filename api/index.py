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
        
        price = 0.0
        day_high = 0.0
        day_low = 0.0
        volume = 0
        open_price = 0.0

        try:
            # fast_info usually contains these attributes
            info = stock.fast_info
            
            price = float(info.last_price) if info.last_price is not None else 0.0
            day_high = float(info.day_high) if info.day_high is not None else 0.0
            day_low = float(info.day_low) if info.day_low is not None else 0.0
            volume = int(info.last_volume) if info.last_volume is not None else 0
            
            try:
                open_price = float(info.open) if info.open is not None else price
            except:
                open_price = price
        except:
            # Fallback to history if fast_info fails completely
            try:
                hist = stock.history(period="1d")
                if not hist.empty:
                    latest_data = hist.iloc[-1]
                    price = float(latest_data.get("Close", 0.0))
                    day_high = float(latest_data.get("High", 0.0))
                    day_low = float(latest_data.get("Low", 0.0))
                    volume = int(latest_data.get("Volume", 0))
                    open_price = float(latest_data.get("Open", price))
            except Exception as e:
                print(f"Error fetching 1d history: {e}")
                pass

        if price == 0.0 or str(price) == 'nan':
            raise HTTPException(status_code=404, detail=f"Stock data unavailable for {ticker}")

        # Compute MA20 Volume & Price safely
        ma20_volume = 0
        ma20_price = 0.0
        try:
            import datetime
            import pytz
            import pandas as pd
            tz = pytz.timezone('Asia/Jakarta')
            
            # Use 3mo to be extremely safe about getting 20 active trading days
            hist_history = stock.history(period="3mo") 
            
            if not hist_history.empty:
                vols = hist_history.get('Volume', pd.Series(dtype=float))
                closes = hist_history.get('Close', pd.Series(dtype=float))
                
                if not vols.empty and not closes.empty:
                    now = datetime.datetime.now(tz)
                    # Exclude today if market is still running (before 16:00 WIB)
                    if now.hour < 16 and vols.index[-1].date() == now.date():
                        vols = vols[:-1]
                        closes = closes[:-1]
                    
                    ma20_vol_raw = vols.tail(20).mean()
                    if pd.notna(ma20_vol_raw):
                        ma20_volume = int(round(ma20_vol_raw / 100))
                    
                    ma20_price_raw = closes.tail(20).mean()
                    if pd.notna(ma20_price_raw):
                        ma20_price = float(ma20_price_raw)
        except Exception as e:
            print(f"Error calculating MA20 Data: {e}")

        # Ensure safe types and defaults before JSON serialization
        return {
            "ticker": ticker_jk,
            "open": float(open_price) if open_price > 0 else float(price),
            "close": float(price),
            "high": float(day_high) if day_high > 0 else float(price),
            "low": float(day_low) if day_low > 0 else float(price),
            "volume": int(volume / 100) if volume > 0 else 0,
            "ma20_volume": ma20_volume,
            "ma20_price": round(ma20_price) if ma20_price > 0 else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unhandled endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error fetching stock data")
