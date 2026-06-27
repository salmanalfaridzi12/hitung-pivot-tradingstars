"use client";

import React from "react";
import Tooltip from "./Tooltip";
import { tokenizeGlossary } from "../lib/glossary";

interface GlossaryTextProps {
  text: string;
  className?: string;
}

// Render teks dengan istilah glosarium (SMC/BoS/ChoCh/Liquidity/Order Block/VCP)
// dibungkus <Tooltip> otomatis. Hover → definisi edukatif.
export default function GlossaryText({ text, className }: GlossaryTextProps): React.JSX.Element {
  const segments = tokenizeGlossary(text || "");
  return (
    <p className={className}>
      {segments.map((s, i) =>
        s.def ? (
          <Tooltip key={i} content={s.def}>{s.text}</Tooltip>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        )
      )}
    </p>
  );
}
