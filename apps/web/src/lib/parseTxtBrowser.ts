import { findChapterSlices, splitTxtChapters, type ParsedBook } from '@novel-reader/shared';
import { decodeTxtBytes } from './decodeTxtBrowser';

export interface TxtParseOptions {
  title?: string;
  author?: string;
}

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim();
  return firstLine && firstLine.length < 50 ? firstLine : '本地 TXT';
}

/** Full parse — use for small files or tests. */
export function parseTxtBrowser(buffer: Uint8Array, options: TxtParseOptions = {}): ParsedBook {
  const normalized = decodeTxtBytes(buffer);
  const title = options.title ?? extractTitle(normalized);
  return {
    meta: { title, author: options.author ?? '未知' },
    chapters: splitTxtChapters(normalized),
  };
}

/** Lightweight parse — decode once, return metadata + slices (no duplicate chapter strings). */
export function parseTxtBrowserLazy(buffer: Uint8Array, options: TxtParseOptions = {}) {
  const text = decodeTxtBytes(buffer);
  const title = options.title ?? extractTitle(text);
  return {
    title,
    author: options.author ?? '未知',
    text,
    slices: findChapterSlices(text),
  };
}

export { decodeTxtBytes };
