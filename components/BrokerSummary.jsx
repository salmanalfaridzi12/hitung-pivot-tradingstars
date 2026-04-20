"use client";
import React, { useMemo } from "react";
import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function BrokerSummary({ stockCode, currentPrice }) {
  if (!stockCode || !currentPrice) return null;

  // Simulating brokerage data based on stockCode and currentPrice
  const data = useMemo(() => {
    if (!stockCode) return null;
    
    const brokers = ["PD", "YP", "CC", "DH", "GR", "AK", "YU", "KZ", "CP", "MG", "NI", "OD"];
    const seed = stockCode.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Sort brokers randomly based on seed
    const shuffled = [...brokers].sort(() => 0.5 - Math.random());
    
    const buyers = shuffled.slice(0, 3).map((id, i) => ({
      rank: i + 1,
      id,
      avgPrice: Math.round(currentPrice * (1 + (Math.random() * 0.02 - 0.01))),
      lot: Math.floor(Math.random() * 10000 + 5000),
      status: "Buy"
    }));

    const sellers = shuffled.slice(3, 6).map((id, i) => ({
      rank: i + 1,
      id,
      avgPrice: Math.round(currentPrice * (1 + (Math.random() * 0.02 - 0.01))),
      lot: Math.floor(Math.random() * 8000 + 3000),
      status: "Sell"
    }));

    const totalBuy = buyers.reduce((s, b) => s + b.lot, 0);
    const totalSell = sellers.reduce((s, b) => s + b.lot, 0);
    const isAccumulation = totalBuy > totalSell * 1.2;

    return { buyers, sellers, isAccumulation };
  }, [stockCode, currentPrice]);

  if (!data) return null;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-500" />
          Broker Summary (Top 3)
        </h3>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1.5",
          data.isAccumulation ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
        )}>
          {data.isAccumulation ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {data.isAccumulation ? "ACCUMULATION" : "DISTRIBUTION"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top Buyers */}
        <div>
          <p className="text-[10px] font-bold text-green-400 mb-2 uppercase tracking-widest">Top Buyers</p>
          <div className="space-y-2">
            {data.buyers.map((b) => (
              <div key={b.id} className="bg-slate-800/50 rounded-lg p-2 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-100">{b.id}</p>
                  <p className="text-[9px] text-slate-300 font-medium">Avg: {b.avgPrice}</p>
                </div>
                <p className="text-[10px] font-bold text-green-400">{b.lot.toLocaleString()} L</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sellers */}
        <div>
          <p className="text-[10px] font-bold text-red-400 mb-2 uppercase tracking-widest">Top Sellers</p>
          <div className="space-y-2">
            {data.sellers.map((s) => (
              <div key={s.id} className="bg-slate-800/50 rounded-lg p-2 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-100">{s.id}</p>
                  <p className="text-[9px] text-slate-300 font-medium">Avg: {s.avgPrice}</p>
                </div>
                <p className="text-[10px] font-bold text-red-400">{s.lot.toLocaleString()} L</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="flex justify-between text-[9px] font-medium text-slate-300">
          <span>Simulation based on sentiment</span>
          <span className="text-purple-400">TradingStars AI Data</span>
        </div>
      </div>
    </div>
  );
}
