import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { verifySession, readSessionCookie } from "../../../utils/auth";

// Phase 17 · Module 2 — AI Institutional Validator (server).
// Gemini HANYA menjelaskan output deterministik yang dikirim. Tidak menghitung
// apa pun. Key Gemini tidak pernah ke browser.
export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM = `Kamu adalah SENIOR INSTITUTIONAL EQUITY ANALYST.
Kamu HANYA menafsirkan & menjelaskan output ENGINE DETERMINISTIK yang diberikan (skor, zona, probabilitas yang SUDAH dihitung).
LARANGAN KERAS: jangan menghitung indikator/skor/probabilitas sendiri, jangan mengarang angka/level, jangan menciptakan data.
Bila sebuah data bernilai "unavailable", tulis "Data unavailable" — JANGAN menebak.
Tugas: interpretasi profesional, ringkasan eksekutif, narasi pasar, skenario bull/bear/netral, risiko, kekuatan, sinyal konflik, posisi institusional, dan logika manajemen trade — semuanya KONSISTEN dengan angka deterministik yang diberikan.
Balas HANYA JSON valid (tanpa markdown/teks lain) dengan struktur PERSIS:
{"institutionalBias":"","confidenceExplanation":"","executiveSummary":"","marketNarrative":"","bullScenario":"","bearScenario":"","neutralScenario":"","topRisks":[],"topStrengths":[],"missingConfirmations":[],"conflictingSignals":[],"tradeManagement":{"entryLogic":"","stopLogic":"","takeProfitLogic":"","invalidations":[]},"institutionalCommentary":"","nextCatalysts":[]}
Gunakan Bahasa Indonesia yang profesional & ringkas.`;

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const ok = await verifySession(readSessionCookie(req.headers.get("cookie")), process.env.JWT_SECRET);
    if (!ok) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 401 });
  }
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "GEMINI_API_KEY belum diset" }, { status: 500 });

  let payload: unknown;
  try { payload = (await req.json())?.payload; } catch { return NextResponse.json({ ok: false, error: "Body invalid" }, { status: 400 }); }
  if (!payload) return NextResponse.json({ ok: false, error: "payload wajib" }, { status: 400 });

  const prompt = `${SYSTEM}\n\nDATA DETERMINISTIK (sumber kebenaran — JANGAN ubah angkanya):\n${JSON.stringify(payload)}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature: 0.5, maxOutputTokens: 2048, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = (res.text || "").trim();
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { return NextResponse.json({ ok: false, error: "Gemini mengembalikan non-JSON", raw: text.slice(0, 200) }, { status: 502 }); }
    return NextResponse.json({ ok: true, model: MODEL, analysis: parsed });
  } catch (err: any) {
    let msg = err?.message || "Gagal memanggil Gemini";
    if (/503|UNAVAILABLE|overload/i.test(msg)) msg = "Model Gemini sibuk.";
    else if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) msg = "Kuota Gemini tercapai.";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
