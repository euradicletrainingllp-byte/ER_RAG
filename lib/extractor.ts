/**
 * Multi-format text extractor: PDF, PPTX, DOCX, XLSX
 * Returns an array of Chunk objects — one per slide/page/section.
 */

export interface Chunk {
  slideNumber: number;
  title: string;
  body: string;
  text: string;
  hasTable: boolean;
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function extractPdf(buffer: Buffer): Promise<Chunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const fullText: string = data.text || '';

  // Split on form-feeds (page breaks) if present, else treat as one chunk
  const rawPages = fullText.split(/\f/).filter((p: string) => p.trim());
  if (rawPages.length === 0) return [];

  return rawPages.map((pageText: string, i: number) => {
    const lines = pageText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const title = lines[0] ?? '';
    const body = lines.slice(1).join('\n');
    return {
      slideNumber: i + 1,
      title,
      body,
      text: pageText.trim(),
      hasTable: false,
    };
  });
}

// ── PPTX ──────────────────────────────────────────────────────────────────────
function extractTextFromXml(xml: string): string {
  const matches = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)];
  return matches
    .map((m) => m[1].trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

async function extractPptx(buffer: Buffer): Promise<Chunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);

  // Collect slide XMLs in order
  const slideEntries: { name: string; content: string }[] = [];
  for (const [name, file] of Object.entries(zip.files) as [string, { async: (t: string) => Promise<string> }][]) {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) {
      const content = await file.async('string');
      slideEntries.push({ name, content });
    }
  }

  // Sort by slide number
  slideEntries.sort((a, b) => {
    const na = parseInt(a.name.match(/slide(\d+)/)?.[1] ?? '0');
    const nb = parseInt(b.name.match(/slide(\d+)/)?.[1] ?? '0');
    return na - nb;
  });

  return slideEntries.map(({ content }, i) => {
    // Find title placeholder shape
    let titleText = '';
    const titleShapeMatch = content.match(
      /<p:sp>[\s\S]*?<p:ph\s[^>]*type="(?:title|ctrTitle)"[\s\S]*?<\/p:sp>/
    );
    let bodyXml = content;
    if (titleShapeMatch) {
      titleText = extractTextFromXml(titleShapeMatch[0]);
      bodyXml = content.replace(titleShapeMatch[0], '');
    }
    const bodyText = extractTextFromXml(bodyXml);

    return {
      slideNumber: i + 1,
      title: titleText,
      body: bodyText,
      text: [titleText, bodyText].filter(Boolean).join('\n'),
      hasTable: content.includes('<a:tbl>'),
    };
  });
}

// ── DOCX ──────────────────────────────────────────────────────────────────────
async function extractDocx(buffer: Buffer): Promise<Chunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  const fullText: string = result.value || '';

  // Chunk into ~500-word blocks
  const words = fullText.split(/\s+/);
  const chunkSize = 500;
  const chunks: Chunk[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const block = words.slice(i, i + chunkSize).join(' ');
    const lines = block.split('\n').map((l: string) => l.trim()).filter(Boolean);
    chunks.push({
      slideNumber: Math.floor(i / chunkSize) + 1,
      title: lines[0] ?? '',
      body: lines.slice(1).join('\n'),
      text: block.trim(),
      hasTable: false,
    });
  }
  return chunks;
}

// ── XLSX ──────────────────────────────────────────────────────────────────────
async function extractXlsx(buffer: Buffer): Promise<Chunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const chunks: Chunk[] = [];
  let chunkIdx = 1;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const rowStrings = rows
      .filter((r: string[]) => r.some((c) => String(c).trim()))
      .map((r: string[]) => r.map((c) => String(c).trim()).join(' | '));

    // 50-row chunks per sheet
    for (let i = 0; i < rowStrings.length; i += 50) {
      const batch = rowStrings.slice(i, i + 50);
      const title = i === 0 ? sheetName : `${sheetName} (rows ${i + 1}–${i + batch.length})`;
      const body = batch.join('\n');
      chunks.push({
        slideNumber: chunkIdx++,
        title,
        body,
        text: `${title}\n${body}`,
        hasTable: true,
      });
    }
  }
  return chunks;
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
export async function extractFile(buffer: Buffer, filename: string): Promise<Chunk[]> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf':
      return extractPdf(buffer);
    case 'pptx':
    case 'ppt':
      return extractPptx(buffer);
    case 'docx':
    case 'doc':
      return extractDocx(buffer);
    case 'xlsx':
    case 'xls':
      return extractXlsx(buffer);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

export const SUPPORTED_TYPES = ['.pdf', '.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls'];
