import { describe, expect, it } from 'vitest';
import { findChapterSlices, pickBestChapterPattern, splitTxtChapters } from './chapter-split';
import { CHAPTER_SPLIT_PATTERNS } from './constants';

describe('chapter-split', () => {
  it('picks pattern with most matches', () => {
    const text = '第1章 A\n\n第2章 B\n\nChapter 1\nC';
    const pattern = pickBestChapterPattern(text);
    expect(pattern.source).toBe(CHAPTER_SPLIT_PATTERNS[0].source);
  });

  it('splits Chinese chapters', () => {
    const text = '书名\n\n第一章 开始\n内容A\n\n第二章 继续\n内容B';
    const chapters = splitTxtChapters(text);
    expect(chapters.length).toBe(2);
    expect(chapters[0]?.title).toContain('第一章');
    expect(chapters[0]?.content).toContain('内容A');
  });

  it('returns 正文 for plain text without markers', () => {
    const chapters = splitTxtChapters('hello world');
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.title).toBe('正文');
  });

  it('findChapterSlices avoids duplicating content strings', () => {
    const text = '第1章 t\nbody\n\n第2章 t2\nbody2';
    const slices = findChapterSlices(text);
    expect(slices).toHaveLength(2);
    expect(slices[1]?.start).toBeGreaterThan(slices[0]?.start ?? 0);
  });

  it('splits bracket-style chapter titles', () => {
    const text = '【第一章】开端\n正文\n\n【第二章】继续\n更多';
    const chapters = splitTxtChapters(text);
    expect(chapters.length).toBeGreaterThanOrEqual(2);
  });
});
