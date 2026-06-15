import { CHAPTER_SPLIT_PATTERNS, type ParsedBook } from '@novel-reader/shared';
import iconv from 'iconv-lite';
import { detectEncoding, type FileBuffer } from './detect';

export interface TxtParseOptions {
  title?: string;
  author?: string;
  chapterPattern?: RegExp;
}

function toBuffer(buf: FileBuffer): Buffer {
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

export function parseTxt(buffer: FileBuffer, options: TxtParseOptions = {}): ParsedBook {
  const b = toBuffer(buffer);
  const encoding = detectEncoding(b);
  const text = encoding === 'gbk' ? iconv.decode(b, 'gbk') : b.toString('utf-8');
  const normalized = text.replace(/\r\n/g, '\n').trim();

  const title = options.title ?? extractTitle(normalized);
  const pattern = options.chapterPattern ?? CHAPTER_SPLIT_PATTERNS[0];
  const chapters = splitChapters(normalized, pattern);

  return {
    meta: {
      title,
      author: options.author ?? '????',
    },
    chapters,
  };
}

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim();
  return firstLine && firstLine.length < 50 ? firstLine : '??? TXT';
}

function splitChapters(text: string, pattern: RegExp): ParsedBook['chapters'] {
  const matches = [...text.matchAll(new RegExp(pattern.source, 'gm'))];
  if (matches.length < 2) {
    return [{ index: 0, title: '??', content: text }];
  }

  const chapters: ParsedBook['chapters'] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const chunk = text.slice(start, end).trim();
    const title = matches[i][0].trim();
    const content = chunk.replace(matches[i][0], '').trim();
    chapters.push({ index: i, title, content });
  }
  return chapters;
}
