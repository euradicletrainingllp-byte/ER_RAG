/**
 * Direct Gemini REST API calls — no SDK dependency issues.
 * Embedding model: gemini-embedding-001 (768-dim via MRL truncation)
 * Generation model: gemini-2.5-flash
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const EMBED_MODEL = 'models/gemini-embedding-001';
const GEN_MODEL = 'models/gemini-2.5-flash';
const DELAY_MS = 120; // stay inside free-tier rate limit

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY!;
  try {
    const res = await fetch(`${BASE}/${EMBED_MODEL}:embedContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        content: { parts: [{ text: text.trim() }] },
        outputDimensionality: 768,
      }),
    });
    if (!res.ok) {
      console.error('Gemini embed error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    await sleep(DELAY_MS);
    return data.embedding?.values ?? null;
  } catch (e) {
    console.error('Gemini embed exception:', e);
    return null;
  }
}

export async function generateContent(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const res = await fetch(`${BASE}/${GEN_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }], role: 'user' }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini generate error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
