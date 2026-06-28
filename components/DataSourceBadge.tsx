"use client";

import React from "react";

// Phase 17.1 — Developer Mode badge. Menampilkan SUMBER DATA tiap panel (dev only).
// mock=true → "MOCK SOURCE DETECTED" (merah). Tidak tampil di production.
export default function DataSourceBadge({ source, mock = false }: { source: string; mock?: boolean }): React.JSX.Element | null {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return null;
  return (
    <span
      title="Developer Mode — data source"
      className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border whitespace-nowrap ${
        mock ? "text-red-300 border-red-400/50 bg-red-500/10" : "text-emerald-300/70 border-emerald-400/30 bg-emerald-500/10"
      }`}
    >
      {mock ? "⚠ MOCK SOURCE" : `src: ${source}`}
    </span>
  );
}
