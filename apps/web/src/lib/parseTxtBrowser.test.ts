import { describe, expect, it } from 'vitest';
import { decodeTxtBytes } from './decodeTxtBrowser';
import { parseTxtBrowser, parseTxtBrowserLazy } from './parseTxtBrowser';

describe('decodeTxtBytes', () => {
  it('decodes UTF-8 Chinese', () => {
    const buf = new TextEncoder().encode('第一章 你好');
    expect(decodeTxtBytes(buf)).toContain('你好');
  });

  it('decodes GBK Chinese', () => {
    const gbk = new Uint8Array([0xb5, 0xda, 0x31, 0xd5, 0xc2, 0x0a, 0xd5, 0xfd, 0xce, 0xc4]);
    const text = decodeTxtBytes(gbk);
    expect(text).toContain('第1章');
    expect(text).toContain('正文');
  });
});

describe('parseTxtBrowser', () => {
  it('parses UTF-8 text with chapters', () => {
    const text = '书名\n\n第一章 开始\n内容A\n\n第二章 继续\n内容B';
    const buf = new TextEncoder().encode(text);
    const book = parseTxtBrowser(buf, { title: '测试书' });
    expect(book.meta.title).toBe('测试书');
    expect(book.chapters.length).toBeGreaterThanOrEqual(2);
  });

  it('lazy parse returns slices without chapter content copies', () => {
    const text = '第1章 你好\n章节内容\n\n第2章 继续\n更多';
    const buf = new TextEncoder().encode(text);
    const lazy = parseTxtBrowserLazy(buf);
    expect(lazy.slices.length).toBe(2);
    expect(lazy.slices[0]?.title).toContain('第1章');
  });
});
