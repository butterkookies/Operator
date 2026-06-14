import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { ocrDocument } from './geminiOcr';

// Point pdfjs to its worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export type ExtractionResult = {
  text: string;
  pageCount?: number;
};

// ── Image — Gemini Vision ─────────────────────────────────────
export async function extractFromImage(
  file: File,
  onProgress?: (pct: number) => void,
  geminiApiKey?: string | null
): Promise<ExtractionResult> {
  if (geminiApiKey) {
    if (onProgress) onProgress(30);
    const text = await ocrDocument(geminiApiKey, file);
    if (onProgress) onProgress(100);
    return { text };
  }

  // Fallback: Tesseract (kept as graceful degradation if no Gemini key)
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return { text: data.text.trim() };
}

// ── PDF — render pages → Gemini Vision ──────────────────────
export async function extractFromPdf(
  file: File,
  onProgress?: (pct: number) => void,
  geminiApiKey?: string | null
): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  const pages: string[] = [];

  if (geminiApiKey) {
    if (onProgress) onProgress(30);
    const text = await ocrDocument(geminiApiKey, file);
    if (onProgress) onProgress(100);
    return { text, pageCount };
  }

  // Fallback: Tesseract
  const worker = await createWorker('eng');
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    const { data } = await worker.recognize(blob);
    pages.push(data.text.trim());
    if (onProgress) onProgress(Math.round((i / pageCount) * 100));
  }
  await worker.terminate();
  return { text: pages.join('\n\n---\n\n'), pageCount };
}

// ── DOCX — mammoth (no OCR needed) ──────────────────────────
export async function extractFromDocx(
  file: File,
  onProgress?: (pct: number) => void
): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(50);
  const result = await mammoth.extractRawText({ arrayBuffer });
  if (onProgress) onProgress(100);
  return { text: result.value.trim() };
}

// ── PPTX — JSZip + XML (no OCR needed) ──────────────────────
export async function extractFromPptx(
  file: File,
  onProgress?: (pct: number) => void
): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

  const slides: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const text = matches
      .map((m) => m.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
      .join(' ');
    if (text) slides.push(`[Slide ${i + 1}]\n${text}`);
    if (onProgress) onProgress(Math.round(((i + 1) / slideFiles.length) * 100));
  }

  return { text: slides.join('\n\n'), pageCount: slideFiles.length };
}

// ── Router ───────────────────────────────────────────────────
export async function extractText(
  file: File,
  onProgress?: (pct: number) => void,
  geminiApiKey?: string | null
): Promise<ExtractionResult> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/.test(name)) {
    return extractFromImage(file, onProgress, geminiApiKey);
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractFromPdf(file, onProgress, geminiApiKey);
  }
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractFromDocx(file, onProgress);
  }
  if (
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    name.endsWith('.pptx')
  ) {
    return extractFromPptx(file, onProgress);
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}
