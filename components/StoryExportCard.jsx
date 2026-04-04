import React, { useState } from 'react';
import { toPng } from 'html-to-image';

export default function StoryExportCard({ stockCode = "IHSG", date = "04 Apr 2026", result }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const node = document.getElementById('story-export-card');
      if (!node) return;
      
      const dataUrl = await toPng(node, {
        pixelRatio: 3, 
        cacheBust: true,
        style: { transform: 'scale(1)', margin: '0' }
      });

      const fileName = `TradingStars_${stockCode}_${date.replace(/\s+/g, '')}.png`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Gagal men-generate gambar', err);
      alert('Terjadi kesalahan saat mengunduh gambar.');
    } finally {
      setIsDownloading(false);
    }
  };
  const pivotData = {
    r3: result?.r3 ? Math.round(result.r3).toLocaleString() : "1,750",
    r2: result?.r2 ? Math.round(result.r2).toLocaleString() : "1,710",
    r1: result?.r1 ? Math.round(result.r1).toLocaleString() : "1,680",
    pp: result?.pivot ? Math.round(result.pivot).toLocaleString() : "1,640",
    s1: result?.s1 ? Math.round(result.s1).toLocaleString() : "1,600",
    s2: result?.s2 ? Math.round(result.s2).toLocaleString() : "1,570",
    s3: result?.s3 ? Math.round(result.s3).toLocaleString() : "1,530",
  };

  return (
    <div className="flex flex-col items-center my-8">
      {/* Container Card 9:16 */}
      <div 
        id="story-export-card"
        className="relative flex flex-col w-[360px] h-[640px] bg-gradient-to-b from-[#111111] to-[#222222] rounded-[24px] overflow-hidden shadow-2xl border border-[#333333] shrink-0 transform transition-transform"
      >
        {/* Header (Top) */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-extrabold text-[13px] tracking-widest uppercase">Pivot Analyzer</span>
            <span className="bg-[#16a34a] text-black text-[9px] px-1.5 py-0.5 rounded-sm font-black italic">PRO</span>
          </div>
          <div className="text-[#a1a1aa] text-[9px] font-semibold tracking-wider">
            Created by <span className="text-white">Member VIP</span>
          </div>
        </div>

        {/* Body (Middle) */}
        <div className="flex flex-col items-center flex-1 px-6 pt-2">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a1aa] text-5xl font-black mb-1 tracking-tighter">
            {stockCode}
          </h1>
          <div className="bg-[#1e293b] text-[#94a3b8] text-[11px] px-4 py-1.5 rounded-full border border-[#334155] font-bold tracking-wide shadow-inner mb-6">
            Daily Pivot - {date}
          </div>

          <div className="w-full space-y-2.5">
            {/* Resistance 3-1 */}
            <div className="flex justify-between items-center bg-[#052e16]/40 border border-[#16a34a]/30 rounded-xl px-4 py-2.5 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
              <span className="text-[#16a34a] font-bold text-xs uppercase tracking-wider">Resist 3</span>
              <span className="text-white font-black text-lg">{pivotData.r3}</span>
            </div>
            <div className="flex justify-between items-center bg-[#052e16]/40 border border-[#16a34a]/30 rounded-xl px-4 py-2.5 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
              <span className="text-[#16a34a] font-bold text-xs uppercase tracking-wider">Resist 2</span>
              <span className="text-white font-black text-lg">{pivotData.r2}</span>
            </div>
            <div className="flex justify-between items-center bg-[#052e16]/40 border border-[#16a34a]/30 rounded-xl px-4 py-2.5 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
              <span className="text-[#16a34a] font-bold text-xs uppercase tracking-wider">Resist 1</span>
              <span className="text-white font-black text-lg">{pivotData.r1}</span>
            </div>

            {/* Pivot Point */}
            <div className="flex justify-between items-center bg-gradient-to-r from-[#1e40af]/30 to-[#3b82f6]/10 border border-[#3b82f6]/50 rounded-xl px-4 py-3 my-4 shadow-[0_0_20px_rgba(59,130,246,0.15)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#3b82f6]"></div>
              <span className="text-[#60a5fa] font-extrabold text-xs ml-2 uppercase tracking-wider">PIVOT POINT</span>
              <span className="text-white font-black text-xl">{pivotData.pp}</span>
            </div>

            {/* Support 1-3 */}
            <div className="flex justify-between items-center bg-[#450a0a]/40 border border-[#ef4444]/30 rounded-xl px-4 py-2.5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <span className="text-[#ef4444] font-bold text-xs uppercase tracking-wider">Support 1</span>
              <span className="text-white font-black text-lg">{pivotData.s1}</span>
            </div>
            <div className="flex justify-between items-center bg-[#450a0a]/40 border border-[#ef4444]/30 rounded-xl px-4 py-2.5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <span className="text-[#ef4444] font-bold text-xs uppercase tracking-wider">Support 2</span>
              <span className="text-white font-black text-lg">{pivotData.s2}</span>
            </div>
            <div className="flex justify-between items-center bg-[#450a0a]/40 border border-[#ef4444]/30 rounded-xl px-4 py-2.5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <span className="text-[#ef4444] font-bold text-xs uppercase tracking-wider">Support 3</span>
              <span className="text-white font-black text-lg">{pivotData.s3}</span>
            </div>
          </div>
        </div>

        {/* Footer (Bottom) */}
        <div className="p-6 mt-auto">
          <div className="flex justify-between items-end border-t border-[#333] pt-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-lg p-1">
                {/* QR Placeholder */}
                <div className="w-full h-full border-2 border-dashed border-black/20 rounded-sm flex items-center justify-center">
                  <span className="text-[5px] font-bold text-black/40 text-center leading-tight mt-1">QR<br/>CODE</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[#a1a1aa] text-[9px] font-semibold mb-0.5">Scan to get alerts</span>
                <span className="text-white text-xs font-black tracking-widest">JOIN TRADING STARS</span>
              </div>
            </div>
            <div className="flex flex-col items-end opacity-50">
              <span className="text-[6px] font-bold text-white mb-1 tracking-wider">POWERED BY</span>
              <div className="flex items-center gap-1.5">
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-l-transparent border-r-transparent border-b-white"></div>
                <span className="text-white font-bold text-[10px]">Vercel</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Container (Outside Card) */}
      <div className="flex gap-3 mt-6 w-[360px]">
        <button className="flex-1 bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95">
          👁️ Preview Story
        </button>
        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] border border-[#60a5fa]/30 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 disabled:opacity-75 disabled:cursor-wait"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating...</span>
            </>
          ) : (
            <span>💾 Download PNG</span>
          )}
        </button>
      </div>
    </div>
  );
}
