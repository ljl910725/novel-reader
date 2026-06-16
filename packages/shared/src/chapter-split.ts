import { CHAPTER_SPLIT_PATTERNS } from './constants';
import type { ChapterInfo } from './types';

export interface ChapterSlice {
  index: number;
  title: string;
  start: number;
  end: number;
}

/** Score decoded text — higher is better for Chinese novel content. */
export function scoreCjkText(text: string): number {
  const sample = text.slice(0, 8000);
  if (!sample) return 0;

  const cjk = (sample.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const replacement = (sample.match(/\uFFFD/g) ?? []).length;
  const mojibake = (sample.match(/[\u00c0-\u00ff]{3,}/g) ?? []).length;
  const lines = sample.split('\n').filter((l) => l.trim()).length;

  return cjk * 2 + lines - replacement * 10 - mojibake * 5;
}

export function pickBestChapterPattern(
  text: string,
  patterns: readonly RegExp[] = CHAPTER_SPLIT_PATTERNS,
): RegExp {
  let best = patterns[0] ?? /^$/m;
  let bestCount = 0;

  for (const pattern of patterns) {
    const count = [...text.matchAll(new RegExp(pattern.source, 'gm'))].length;
    if (count > bestCount) {
      bestCount = count;
      best = pattern;
    }
  }

  return best;
}

export function findChapterSlices(text: string, pattern?: RegExp): ChapterSlice[] {
  const p = pattern ?? pickBestChapterPattern(text);
  const matches = [...text.matchAll(new RegExp(p.source, 'gm'))];

  if (matches.length === 0) {
    return [{ index: 0, title: '正文', start: 0, end: text.length }];
  }

  return matches.map((m, i) => ({
    index: i,
    title: m[0].trim(),
    start: m.index ?? 0,
    end: i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length,
  }));
}

export function splitTxtChapters(text: string, pattern?: RegExp): ChapterInfo[] {
  return findChapterSlices(text, pattern).map((s) => {
    const chunk = text.slice(s.start, s.end).trim();
    const content = chunk.slice(s.title.length).trim();
    return {
      index: s.index,
      title: s.title,
      content: content || chunk,
    };
  });
}
