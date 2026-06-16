import { CHAPTER_SPLIT_PATTERNS } from '@novel-reader/shared';
import { describe, expect, it } from 'vitest';
import { parseTxtBrowser } from './parseTxtBrowser';

describe('parseTxtBrowser', () => {
  it('parses UTF-8 text with chapters', () => {
    const text = '书名\n\n第一章 开始\n内容A\n\n第二章 继续\n内容B';
    const buf = new TextEncoder().encode(text);
    const book = parseTxtBrowser(buf, { title: '测试书' });
    expect(book.meta.title).toBe('测试书');
    expect(book.chapters.length).toBeGreaterThanOrEqual(1);
  });

  it('uses chapter split pattern from shared', () => {
    expect(CHAPTER_SPLIT_PATTERNS[0]).toBeDefined();
    const text = '第1章 你好\n章节内容';
    const book = parseTxtBrowser(new TextEncoder().encode(text));
    expect(book.chapters[0].title).toContain('第');
  });
});
