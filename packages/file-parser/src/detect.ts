import type { FileFormat } from '@novel-reader/shared';

export type FileBuffer = Buffer | Uint8Array;

export function detectFormat(filename: string, buffer: FileBuffer): FileFormat {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'epub') return 'EPUB';
  if (ext === 'txt') return 'TXT';
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return 'EPUB';
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
