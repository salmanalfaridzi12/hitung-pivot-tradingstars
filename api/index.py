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

        return {
            "ticker": ticker_jk,
            "close": float(price),
            "high": float(day_high),
            "low": float(day_low),
            "volume": int(volume / 100) if volume else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
