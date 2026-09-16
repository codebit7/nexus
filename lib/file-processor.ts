// Turn an uploaded meeting transcript into plain text, in the browser.
//
// Ported from notes2board's src/utils/fileProcessor.ts with one important
// change: the PDF worker is served from our own /public folder instead of a
// CDN. nexus-app sets `script-src 'self'` in its CSP (middleware.ts), so the
// cdnjs URL notes2board uses would be blocked here and PDF parsing would fail
// with a confusing worker error.

export interface FileProcessResult {
  text: string;
  fileName: string;
  /** 'text' | 'markdown' | 'pdf' — kept for the meeting_notes row. */
  fileType: string;
}

const SUPPORTED_EXTENSIONS = ['txt', 'md', 'pdf'] as const;

/** 10MB, same limit notes2board uses. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** For the file input's `accept` attribute. */
export const ACCEPTED_FILE_TYPES = '.txt,.md,.pdf';

export function isSupportedFileType(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop();
  return SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number]);
}

/**
 * Pull the text layer out of a PDF.
 *
 * A PDF made by scanning paper has no text layer — only pictures of words. That
 * produces an empty string rather than an error, so it is checked for explicitly
 * and reported as something the user can act on.
 */
async function extractPdfText(file: File): Promise<string> {
  // Dynamic import: pdfjs-dist touches browser globals and must never be pulled
  // into a server bundle.
  const pdfjsLib = await import('pdfjs-dist');

  // Served from public/. Copied there from node_modules/pdfjs-dist/build/.
  // If the version in package.json changes, copy the matching worker again or
  // pdf.js will refuse to run against a mismatched worker.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch {
    throw new Error(
      'Could not open that PDF. It may be damaged or password-protected.'
    );
  }

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
    );
  }

  const text = pages.join('\n\n').trim();

  if (!text) {
    throw new Error(
      'That PDF has no readable text — it looks like a scan or images. Copy the text and paste it in the box instead.'
    );
  }

  return text;
}

/**
 * Read a transcript file and return its text.
 *
 * Throws with a message written for the user, not for a log.
 */
export async function processFile(file: File): Promise<FileProcessResult> {
  if (!isSupportedFileType(file.name)) {
    throw new Error('Unsupported file. Upload a .txt, .md or .pdf file.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('That file is over 10MB. Please upload a smaller one.');
  }

  const extension = file.name.toLowerCase().split('.').pop();

  let text: string;
  let fileType: string;

  switch (extension) {
    case 'txt':
      text = await file.text();
      fileType = 'text';
      break;
    case 'md':
      text = await file.text();
      fileType = 'markdown';
      break;
    case 'pdf':
      text = await extractPdfText(file);
      fileType = 'pdf';
      break;
    default:
      // Unreachable — isSupportedFileType already ran.
      throw new Error(`Unsupported file type: .${extension}`);
  }

  if (!text.trim()) {
    throw new Error('That file is empty.');
  }

  return { text: text.trim(), fileName: file.name, fileType };
}
