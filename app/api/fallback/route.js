import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const code = symbol.replace("IDX:", "");

    const tvRes = await fetch("https://scanner.tradingview.com/indonesia/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: [`IDX:${code}`] },
        columns: ["open", "high", "low", "close", "volume"]
      })
    });

    if (!tvRes.ok) {
      return NextResponse.json({ error: "TV scanner returned error" }, { status: tvRes.status });
    }

    const data = await tvRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Fallback Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
