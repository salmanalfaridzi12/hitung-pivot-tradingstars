import urllib.request
import json

def fetch_tv_data(ticker):
    url = "https://scanner.tradingview.com/indonesia/scan"
    payload = json.dumps({
        "symbols": {"tickers": [f"IDX:{ticker}"]},
        "columns": ["close", "high", "low", "open", "volume"]
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    
    with urllib.request.urlopen(req) as response:
        r = json.loads(response.read().decode('utf-8'))
        
    print(r)

fetch_tv_data("BBRI")
