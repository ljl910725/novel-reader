import { splitTxtChapters, type ParsedBook } from '@novel-reader/shared';
import type { FileBuffer } from './detect';
import { decodeTxtBuffer } from './decode-text';

export interface TxtParseOptions {
  title?: string;
  author?: string;
  chapterPattern?: RegExp;
}

export function parseTxt(buffer: FileBuffer, options: TxtParseOptions = {}): ParsedBook {
  const normalized = decodeTxtBuffer(buffer);
  const title = options.title ?? extractTitle(normalized);

  return {
    meta: {
      title,
      author: options.author ?? '未知',
    },
    chapters: splitTxtChapters(normalized, options.chapterPattern),
  };
}

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim();
  return firstLine && firstLine.length < 50 ? firstLine : '本地 TXT';
}
