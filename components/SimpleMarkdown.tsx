"use client";

import React from "react";

// Markdown renderer ringkas tanpa dependency (aman untuk environment ini).
// Dukungan: heading, bold, italic, inline code, code block, list (ul/ol),
// tabel GFM sederhana, link. Cukup untuk jawaban chat analis.

function inline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Pecah berdasarkan token: **bold**, *italic*, `code`, [t](u)
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) nodes.push(<strong key={`${keyBase}-${i}`} className="font-black text-white">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) nodes.push(<code key={`${keyBase}-${i}`} className="px-1 py-0.5 rounded bg-slate-800 text-purple-200 text-[10px] font-mono">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (mm) nodes.push(<a key={`${keyBase}-${i}`} href={mm[2]} target="_blank" rel="noreferrer" className="text-purple-300 underline">{mm[1]}</a>);
    } else nodes.push(<em key={`${keyBase}-${i}`} className="italic text-slate-200">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length; i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function SimpleMarkdown({ text, className }: { text: string; className?: string }): React.JSX.Element {
  const lines = (text || "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { buf.push(lines[i]); i++; }
      i++;
      blocks.push(<pre key={key++} className="my-1.5 p-2 rounded-lg bg-slate-900 border border-white/10 overflow-x-auto text-[10px] font-mono text-slate-200 whitespace-pre">{buf.join("\n")}</pre>);
      continue;
    }
    // Table (GFM): baris berisi | dan baris berikut adalah pemisah ---
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-]*-[\s:|-]*$/.test(lines[i + 1])) {
      const cell = (r: string) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const head = cell(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) { rows.push(cell(lines[i])); i++; }
      blocks.push(
        <div key={key++} className="my-1.5 overflow-x-auto">
          <table className="text-[10px] w-full border border-white/10 rounded">
            <thead><tr>{head.map((h, j) => <th key={j} className="px-2 py-1 text-left font-black text-slate-300 border-b border-white/10 bg-slate-800/50">{inline(h, `th${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="px-2 py-1 text-slate-300 border-b border-white/5">{inline(c, `td${ri}${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    // Heading
    const hm = /^(#{1,3})\s+(.*)$/.exec(line);
    if (hm) { blocks.push(<p key={key++} className={`font-black text-white ${hm[1].length === 1 ? "text-sm" : "text-[12px]"} mt-2 mb-1`}>{inline(hm[2], `h${key}`)}</p>); i++; continue; }
    // Lists (kumpulkan baris berurutan)
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items: string[] = [];
      const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "")); i++; }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(<Tag key={key++} className={`${ordered ? "list-decimal" : "list-disc"} pl-4 my-1 space-y-0.5`}>{items.map((it, j) => <li key={j}>{inline(it, `li${key}${j}`)}</li>)}</Tag>);
      continue;
    }
    // Empty / paragraph
    if (line.trim() === "") { i++; continue; }
    blocks.push(<p key={key++} className="my-1 leading-relaxed">{inline(line, `p${key}`)}</p>);
    i++;
  }

  return <div className={className}>{blocks}</div>;
}
