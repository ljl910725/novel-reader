import { describe, expect, it } from 'vitest';
import { parseTxt } from './txt-parser';

describe('parseTxt', () => {
  it('splits chapters by pattern', () => {
    const text = 'My Book\n\n\u7b2c1\u7ae0 start\ncontent1\n\n\u7b2c2\u7ae0 cont\ncontent2';
    const result = parseTxt(Buffer.from(text, 'utf-8'), { title: 'My Book' });
    expect(result.meta.title).toBe('My Book');
    expect(result.chapters.length).toBeGreaterThanOrEqual(2);
  });

  it('returns single chapter for plain text', () => {
    const result = parseTxt(Buffer.from('hello world', 'utf-8'));
    expect(result.chapters).toHaveLength(1);
  });
});
