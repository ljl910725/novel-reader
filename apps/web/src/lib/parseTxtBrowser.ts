import { CHAPTER_SPLIT_PATTERNS, type ParsedBook } from '@novel-reader/shared';

export interface TxtParseOptions {
  title?: string;
  author?: string;
}

function decodeText(buffer: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!looksLikeGbkMojibake(utf8)) {
    return utf8.replace(/\r\n/g, '\n').trim();
  }
  try {
    return new TextDecoder('gbk').decode(buffer).replace(/\r\n/g, '\n').trim();
  } catch {
    return utf8.replace(/\r\n/g, '\n').trim();
  }
}

/** UTF-8 误读 GBK 时常见乱码特征 */
function looksLikeGbkMojibake(text: string): boolean {
  const sample = text.slice(0, 2000);
  const cjk = (sample.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const mojibake = (sample.match(/[\u00c0-\u00ff]{2,}/g) ?? []).length;
  return mojibake > 3 && cjk < sample.length / 8;
}

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim();
  return firstLine && firstLine.length < 50 ? firstLine : '本地 TXT';
}

function splitChapters(text: string, pattern: RegExp): ParsedBook['chapters'] {
  const matches = [...text.matchAll(new RegExp(pattern.source, 'gm'))];
  if (matches.length === 0) {
    return [{ index: 0, title: '正文', content: text }];
  }
  const chapters: ParsedBook['chapters'] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const chunk = text.slice(start, end).trim();
    const title = matches[i][0].trim();
    const content = chunk.slice(title.length).trim();
    chapters.push({ index: i, title, content: content || chunk });
  }
  return chapters;
}

export function parseTxtBrowser(buffer: Uint8Array, options: TxtParseOptions = {}): ParsedBook {
  const normalized = decodeText(buffer);
  const title = options.title ?? extractTitle(normalized);
  const pattern = CHAPTER_SPLIT_PATTERNS[0];
  return {
    meta: { title, author: options.author ?? '未知' },
    chapters: splitChapters(normalized, pattern),
  };
}
