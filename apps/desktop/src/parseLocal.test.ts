import { describe, expect, it } from 'vitest';
import { parseTxt } from '@novel-reader/file-parser/txt';

describe('desktop local book parsing', () => {
  it('parses plain txt into chapters', () => {
    const text = 'Title\n\nChapter 1\nHello\n\nChapter 2\nWorld';
    const parsed = parseTxt(Buffer.from(text, 'utf-8'), { title: 'Title' });
    expect(parsed.meta.title).toBe('Title');
    expect(parsed.chapters.length).toBeGreaterThanOrEqual(1);
    expect(parsed.chapters[0].content).toContain('Hello');
  });
});
