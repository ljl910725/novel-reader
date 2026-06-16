import { describe, expect, it } from 'vitest';
import iconv from 'iconv-lite';
import { decodeTxtBuffer, scoreCjkText } from './decode-text';
import { parseTxt } from './txt-parser';

// Minimal GBK-encoded Chinese bytes (「你好」)
const GBK_HELLO = Buffer.from([0xc4, 0xe3, 0xba, 0xc3]);

describe('decodeTxtBuffer', () => {
  it('decodes UTF-8 Chinese', () => {
    const text = decodeTxtBuffer(Buffer.from('第一章 你好世界\n正文', 'utf-8'));
    expect(text).toContain('第一章');
    expect(text).toContain('你好');
  });

  it('decodes GBK Chinese', () => {
    const text = decodeTxtBuffer(GBK_HELLO);
    expect(text).toBe('你好');
  });

  it('prefers valid decoding over replacement characters', () => {
    const asGbk = Buffer.concat([
      iconv.encode('第1章\n', 'gbk'),
      iconv.encode('中文小说'.repeat(20), 'gbk'),
    ]);
    const decoded = decodeTxtBuffer(asGbk);
    expect(decoded).toContain('第1章');
    expect(decoded).not.toContain('\uFFFD');
  });

  it('scores CJK text higher than mojibake', () => {
    expect(scoreCjkText('第一章 修仙之路')).toBeGreaterThan(scoreCjkText('Ã©ÂÂÃ¨ÂÂ'));
  });
});

describe('parseTxt', () => {
  it('splits chapters by pattern', () => {
    const text = 'My Book\n\n\u7b2c1\u7ae0 start\ncontent1\n\n\u7b2c2\u7ae0 cont\ncontent2';
    const result = parseTxt(Buffer.from(text, 'utf-8'), { title: 'My Book' });
    expect(result.meta.title).toBe('My Book');
    expect(result.meta.author).toBe('未知');
    expect(result.chapters.length).toBeGreaterThanOrEqual(2);
  });

  it('returns single chapter titled 正文 for plain text', () => {
    const result = parseTxt(Buffer.from('hello world', 'utf-8'));
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0]?.title).toBe('正文');
  });

  it('decodes GBK content without placeholder titles', () => {
    const body = iconv.encode('第一章 开端\n\n这是正文。', 'gbk');
    const result = parseTxt(body, { title: '测试书' });
    expect(result.meta.title).toBe('测试书');
    expect(result.chapters[0]?.title).toContain('第一章');
    expect(result.chapters[0]?.content).toContain('正文');
  });
});
