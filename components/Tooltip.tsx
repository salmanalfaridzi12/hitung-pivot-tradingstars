"use client";

import React from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

// Tooltip edukatif ringan (CSS hover, tanpa state). Dark glassmorphism + glow ungu.
export default function Tooltip({ content, children }: TooltipProps): React.JSX.Element {
  return (
    <span className="relative inline-block group/tt">
      <span className="cursor-help underline decoration-dotted decoration-purple-400/70 underline-offset-2 text-purple-200">
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-56 px-3 py-2 rounded-lg bg-slate-950/95 border border-purple-500/30 text-[10px] font-medium text-slate-200 leading-relaxed shadow-xl shadow-black/50 backdrop-blur-md opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150"
      >
        {content}
      </span>
    </span>
  );
}
