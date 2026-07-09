"use client";

import React, { useState, useMemo } from "react";
import { Scale, TrendingUp, TrendingDown, AlertTriangle, Coins, Info, Percent } from "lucide-react";

// Format angka Rupiah pakai locale id-ID (pemisah ribuan titik)
const fmtRp = (n) =>
  n != null && Number.isFinite(n) && n !== 0
    ? n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "0";

const fmtPct = (n) =>
  n != null && Number.isFinite(n)
    ? n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";

export default function RightIssueCalculator() {
  // -- Input State
  const [hargaSaham, setHargaSaham] = useState("");
  const [jumlahSaham, setJumlahSaham] = useState("");
  const [rasioLama, setRasioLama] = useState("");
  const [rasioBaru, setRasioBaru] = useState("");
  const [hargaPelaksanaan, setHargaPelaksanaan] = useState("");

  // -- Derived calculations (reactive — update otomatis saat input berubah)
  const calc = useMemo(() => {
    const hs = Math.max(parseFloat(hargaSaham) || 0, 0);
    const js = Math.max(parseFloat(jumlahSaham) || 0, 0);
    const a = Math.max(parseFloat(rasioLama) || 0, 0);
    const b = Math.max(parseFloat(rasioBaru) || 0, 0);
    const hp = Math.max(parseFloat(hargaPelaksanaan) || 0, 0);

    // Guard: jika rasio belum valid (minimal 1) → fallback semua ke 0
    if (a < 1 || b < 1) {
      return {
        sahamBaru: 0,
        sahamBaruExact: 0,
        danaDibutuhkan: 0,
        terp: 0,
        nilaiRight: 0,
        totalSahamSetelah: 0,
        nilaiPortofolioSebelum: 0,
        nilaiPortofolioSesudah: 0,
        dilusiPersen: 0,
        valid: false,
      };
    }

    const sahamBaruExact = js * (b / a);
    const sahamBaru = Math.floor(sahamBaruExact);
    const danaDibutuhkan = sahamBaruExact * hp;
    const terp = (hs * a + hp * b) / (a + b);
    const nilaiRight = terp - hp;
    const totalSahamSetelah = js + sahamBaruExact;
    const nilaiPortofolioSebelum = js * hs;
    const nilaiPortofolioSesudah = totalSahamSetelah * terp;
    const dilusiPersen = (b / (a + b)) * 100;

    return {
      sahamBaru,
      sahamBaruExact,
      danaDibutuhkan,
      terp,
      nilaiRight,
      totalSahamSetelah,
      nilaiPortofolioSebelum,
      nilaiPortofolioSesudah,
      dilusiPersen,
      valid: hs > 0 && js > 0 && hp > 0,
    };
  }, [hargaSaham, jumlahSaham, rasioLama, rasioBaru, hargaPelaksanaan]);

  // -- Helper: input field component (konsisten dgn style project)
  const InputField = ({ label, value, onChange, placeholder, suffix, min }) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-purple-400/80 uppercase ml-2 flex items-center gap-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={min ?? 0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  // -- Helper: result row component
  const ResultRow = ({ label, value, color = "text-slate-100", icon: Icon, borderBottom = true }) => (
    <div className={`flex justify-between items-center py-3 ${borderBottom ? "border-b border-white/5" : ""}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-3.5 h-3.5 ${color} opacity-60`} />}
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-sm font-black ${color} tabular-nums`}>{value}</p>
    </div>
  );

  const deltaPortofolio = calc.nilaiPortofolioSesudah - calc.nilaiPortofolioSebelum;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-700 space-y-4">
      <div className="bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_40px_rgba(168,85,247,0.05)] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 mb-8 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 uppercase tracking-widest leading-tight">
            KALKULATOR RIGHT ISSUE
          </h2>
          <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-2 px-4 shadow-sm border border-purple-500/20 bg-purple-500/10 rounded-full inline-block py-1">
            Simulasi HMETD Otomatis
          </p>
        </div>

        {/* Input Fields */}
        <div className="relative z-10 text-left mb-6 space-y-4">
          <InputField
            label="Harga Saham (Cum-Right)"
            value={hargaSaham}
            onChange={setHargaSaham}
            placeholder="Contoh: 5000"
            suffix="Rp"
          />
          <InputField
            label="Jumlah Saham Dimiliki"
            value={jumlahSaham}
            onChange={setJumlahSaham}
            placeholder="Contoh: 10000"
            suffix="Lembar"
          />

          {/* Rasio: a : b */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-purple-400/80 uppercase ml-2 flex items-center gap-1">
              Rasio Right Issue (Lama : Baru)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={rasioLama}
                onChange={(e) => setRasioLama(e.target.value)}
                placeholder="5"
                className="flex-1 bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-center"
              />
              <span className="text-purple-500 font-black text-lg select-none">:</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={rasioBaru}
                onChange={(e) => setRasioBaru(e.target.value)}
                placeholder="1"
                className="flex-1 bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-center"
              />
            </div>
            <p className="text-[9px] text-slate-600 ml-2">
              Contoh: 5 : 1 = setiap 5 saham lama berhak beli 1 saham baru
            </p>
          </div>

          <InputField
            label="Harga Pelaksanaan (Exercise Price)"
            value={hargaPelaksanaan}
            onChange={setHargaPelaksanaan}
            placeholder="Contoh: 3500"
            suffix="Rp"
          />
        </div>

        {/* Live Results */}
        <div className="relative z-10 bg-slate-950/80 p-5 rounded-2xl border border-white/5 space-y-0">
          <ResultRow
            label="Saham Baru (Hak Beli)"
            value={
              <>
                {fmtRp(calc.sahamBaru)}{" "}
                <span className="text-[10px] text-slate-500">lembar</span>
              </>
            }
            icon={TrendingUp}
            color="text-indigo-400"
          />
          <ResultRow
            label="Dana Exercise Penuh"
            value={<>Rp {fmtRp(calc.danaDibutuhkan)}</>}
            icon={Coins}
            color="text-amber-400"
          />
          <ResultRow
            label="TERP (Harga Teoritis)"
            value={<>Rp {fmtRp(calc.terp)}</>}
            icon={TrendingUp}
            color="text-purple-400"
          />
          <ResultRow
            label="Nilai Teoritis 1 Right"
            value={
              <span className={calc.nilaiRight >= 0 ? "text-green-400" : "text-red-400"}>
                Rp {fmtRp(calc.nilaiRight)}
              </span>
            }
            icon={Scale}
            color={calc.nilaiRight >= 0 ? "text-green-400" : "text-red-400"}
          />
          <ResultRow
            label="Total Saham Setelah Exercise"
            value={
              <>
                {fmtRp(calc.totalSahamSetelah)}{" "}
                <span className="text-[10px] text-slate-500">lembar</span>
              </>
            }
            icon={TrendingUp}
            color="text-slate-100"
          />

          {/* Portofolio Comparison */}
          <div className="pt-3 border-t border-white/5 mt-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Perbandingan Portofolio</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sebelum</p>
                <p className="text-sm font-black text-slate-300">Rp {fmtRp(calc.nilaiPortofolioSebelum)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sesudah</p>
                <p className="text-sm font-black text-green-400">Rp {fmtRp(calc.nilaiPortofolioSesudah)}</p>
              </div>
            </div>
            {calc.valid && (
              <div className={`mt-2 text-center text-[10px] font-bold px-3 py-1.5 rounded-lg border ${
                deltaPortofolio >= 0
                  ? "text-green-400 bg-green-500/10 border-green-500/20"
                  : "text-red-400 bg-red-500/10 border-red-500/20"
              }`}>
                {deltaPortofolio >= 0 ? "+" : ""}Rp {fmtRp(deltaPortofolio)} ({deltaPortofolio >= 0 ? "+" : ""}{fmtPct((deltaPortofolio / (calc.nilaiPortofolioSebelum || 1)) * 100)}%)
              </div>
            )}
          </div>

          {/* Dilusi */}
          <div className="pt-3 mt-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Percent className="w-3.5 h-3.5 text-orange-400 opacity-60" />
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dilusi Jika Tidak Exercise</p>
              </div>
              <p className="text-sm font-black text-orange-400 tabular-nums">{fmtPct(calc.dilusiPersen)}%</p>
            </div>
            {calc.valid && calc.dilusiPersen > 0 && (
              <div className="mt-2 flex items-start gap-2 bg-orange-500/5 border border-orange-500/15 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-orange-300/80 leading-relaxed">
                  Jika tidak exercise, kepemilikan terdilusi {fmtPct(calc.dilusiPersen)}%.
                  Secara teori, penurunan nilai per saham setara dengan nilai right (Rp {fmtRp(calc.nilaiRight)})
                  yang bisa dijual di pasar untuk mengompensasi dilusi.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="relative z-10 mt-4 flex items-start gap-2 px-2">
          <Info className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-600 leading-relaxed">
            Perhitungan bersifat teoritis untuk simulasi, bukan nasihat investasi.
            Harga pasar aktual bisa berbeda dari TERP.
          </p>
        </div>
      </div>
    </div>
  );
}
