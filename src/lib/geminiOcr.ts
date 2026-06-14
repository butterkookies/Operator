// Model fallback chain — tries each in order until one succeeds.
// gemini-1.5-flash has the broadest free-tier availability.
const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-pro',
  'gemini-1.5-flash',
];

function apiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const OCR_PROMPT =
  'Extract all text from this image exactly as it appears. ' +
  'Preserve paragraph structure and line breaks. ' +
  'Fix obvious scanning artifacts or OCR noise. ' +
  'If the image contains math equations, render them in plain text notation. ' +
  'Return only the extracted text — no commentary, no markdown fences.';

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

async function callGemini(apiKey: string, parts: GeminiPart[]): Promise<string> {
  let lastError: Error = new Error('All Gemini models failed.');

  for (const model of MODELS) {
    const res = await fetch(`${apiUrl(model)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    }

    const err = await res.json().catch(() => ({}));
    const msg: string = err?.error?.message || `HTTP ${res.status}`;

    // Invalid key — no point retrying other models
    if (res.status === 400 && msg.toLowerCase().includes('api key')) {
      throw new GeminiInvalidKeyError();
    }

    // Quota exhausted on this model — try next
    if (res.status === 429 || msg.toLowerCase().includes('quota')) {
      lastError = new GeminiQuotaError(model, msg);
      continue;
    }

    // Any other error — surface immediately
    throw new Error(`Gemini API error: ${msg}`);
  }

  throw lastError;
}

// ── Errors ──────────────────────────────────────────────────
export class GeminiNoKeyError extends Error {
  constructor() {
    super('No Gemini API key configured. Add your key in Account Settings.');
    this.name = 'GeminiNoKeyError';
  }
}

export class GeminiInvalidKeyError extends Error {
  constructor() {
    super('Gemini API key is invalid. Check your key in Account Settings.');
    this.name = 'GeminiInvalidKeyError';
  }
}

export class GeminiQuotaError extends Error {
  constructor(model: string, rawMessage: string) {
    super(`All Gemini models failed. Last tried ${model}: ${rawMessage}`);
    this.name = 'GeminiQuotaError';
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * OCR a single file using Gemini (Image or PDF).
 * @param apiKey  User's Gemini API key from user_settings
 * @param file    Image or PDF file
 */
export async function ocrDocument(apiKey: string | null, file: File): Promise<string> {
  if (!apiKey) throw new GeminiNoKeyError();

  let mime = file.type;
  if (!mime) {
    mime = file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
  }

  const base64 = await fileToBase64(file);
  return callGemini(apiKey, [
    { inlineData: { mimeType: mime, data: base64 } },
    { text: OCR_PROMPT },
  ]);
}

// ── Helpers ──────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
