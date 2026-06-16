import type { FileFormat } from '@novel-reader/shared';

export type FileBuffer = Buffer | Uint8Array;

function toBuffer(buffer: FileBuffer): Buffer {
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

/** ZIP local file header (PK\x03\x04) or empty/spanned archive signatures. */
export function isZipArchive(buffer: FileBuffer): boolean {
  const b = toBuffer(buffer);
  if (b.length < 4 || b[0] !== 0x50 || b[1] !== 0x4b) return false;
  return (
    (b[2] === 0x03 && b[3] === 0x04) ||
    (b[2] === 0x05 && b[3] === 0x06) ||
    (b[2] === 0x07 && b[3] === 0x08)
  );
}

function looksLikeHtmlOrText(buffer: FileBuffer): boolean {
  const b = toBuffer(buffer);
  if (b.length === 0) return false;

  let start = 0;
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    start = 3;
  }

  const head = b
    .slice(start, Math.min(b.length, start + 512))
    .toString('utf8')
    .trimStart()
    .toLowerCase();

  if (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<?xml')
  ) {
    return true;
  }

  // Plain text without binary null bytes (common for mislabeled .epub downloads).
  const sample = b.slice(start, Math.min(b.length, start + 4096));
  return !sample.includes(0);
}

export function detectFormat(filename: string, buffer: FileBuffer): FileFormat {
  const ext = filename.toLowerCase().split('.').pop();

  if (isZipArchive(buffer)) return 'EPUB';
  if (ext === 'txt') return 'TXT';

  // HTML/text saved as .epub — parse as TXT so upload can still succeed.
  if (ext === 'epub' && looksLikeHtmlOrText(buffer)) return 'TXT';

  if (ext === 'epub') return 'EPUB';
  return 'TXT';
}

export function detectEncoding(buffer: FileBuffer): 'utf-8' | 'gbk' {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8';
  }
  const sample = buffer.slice(0, Math.min(buffer.length, 4096)).toString('binary');
  const utf8Invalid = /[\x80-\xff]/.test(sample) && !isValidUtf8(buffer.slice(0, 4096));
  if (utf8Invalid) return 'gbk';
  return 'utf-8';
}

function isValidUtf8(buf: FileBuffer): boolean {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buf);
    return true;
  } catch {
    return false;
  }
}
