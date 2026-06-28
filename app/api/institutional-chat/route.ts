import { GoogleGenAI } from "@google/genai";
import { verifySession, readSessionCookie } from "../../../utils/auth";

// Phase 17 · Module 7 — Institutional AI Copilot (server, SSE streaming).
// Gemini HANYA menjelaskan/membandingkan output deterministik yang dikirim sebagai
// context. DILARANG menghitung indikator/skor/probabilitas atau mengarang angka.
export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM = `Kamu adalah INSTITUTIONAL AI COPILOT — asisten analis ekuitas senior.
Kamu HANYA antarmuka cerdas di atas engine DETERMINISTIK. Engine adalah satu-satunya sumber kebenaran.
DILARANG KERAS: menghitung RSI/EMA/ATR/Confluence/probabilitas, mendeteksi Order Block/Liquidity/FVG sendiri, mengarang angka/level, atau mengubah output deterministik.
BOLEH: menjelaskan, membandingkan, meringkas, mengedukasi, menjelaskan risiko & skenario, menjawab pertanyaan lanjutan — SELALU konsisten dengan angka pada CONTEXT.
Jika data bernilai "unavailable", katakan "Data tidak tersedia" — jangan menebak.
Jawab dalam Bahasa Indonesia, format Markdown (heading/list/tabel/bold bila membantu), ringkas & profesional.
Bila ada "focus", jelaskan HANYA panel tersebut.`;

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const ok = await verifySession(readSessionCookie(req.headers.get("cookie")), process.env.JWT_SECRET);
    if (!ok) return new Response("data: " + JSON.stringify({ error: "Akses ditolak." }) + "\n\n", { status: 401, headers: { "Content-Type": "text/event-stream" } });
  }
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  let body: any;
  try { body = await req.json(); } catch { return new Response("bad body", { status: 400 }); }
  const { context, history, question } = body || {};
  if (!question || !context) return new Response("missing fields", { status: 400 });

  const enc = new TextEncoder();
  const send = (ctrl: ReadableStreamDefaultController, obj: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

  const histText = Array.isArray(history)
    ? history.map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n")
    : "";
  const prompt = `${SYSTEM}\n\nCONTEXT DETERMINISTIK (sumber kebenaran — jangan ubah angkanya):\n${JSON.stringify(context)}\n\nRIWAYAT:\n${histText}\n\nPERTANYAAN USER: ${question}`;

  const stream = new ReadableStream({
    async start(ctrl) {
      if (!apiKey) {
        send(ctrl, { error: "GEMINI_API_KEY belum diset di server." });
        ctrl.close();
        return;
      }
      try {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContentStream({
          model: MODEL,
          contents: prompt,
          config: { temperature: 0.5, maxOutputTokens: 1400, thinkingConfig: { thinkingBudget: 0 } },
        });
        for await (const chunk of res as any) {
          const t = chunk?.text || "";
          if (t) send(ctrl, { delta: t });
        }
        send(ctrl, { done: true });
      } catch (err: any) {
        let msg = err?.message || "Gagal memanggil Gemini";
        if (/503|UNAVAILABLE|overload/i.test(msg)) msg = "Model Gemini sibuk.";
        else if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) msg = "Kuota Gemini tercapai.";
        send(ctrl, { error: msg });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
