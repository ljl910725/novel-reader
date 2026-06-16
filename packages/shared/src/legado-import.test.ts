import { describe, expect, it } from 'vitest';
import { normalizeLegadoSource, parseLegadoImportPayload } from './legado-import';

describe('legado import', () => {
  it('accepts empty ruleExplore arrays from community packs', () => {
    const result = parseLegadoImportPayload([
      {
        bookSourceUrl: 'https://example.com',
        bookSourceName: '测试书源',
        searchUrl: '/search?q={{key}}',
        ruleExplore: [],
        ruleSearch: {
          bookList: '.item',
          name: '.title@text',
          bookUrl: 'a@href',
        },
        ruleToc: {
          chapterList: '.chapter',
          chapterName: 'a@text',
          chapterUrl: 'a@href',
        },
        ruleContent: {
          content: '#content@html',
        },
      },
    ]);
    expect(result.sources).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
  });

  it('skips invalid sources but imports valid ones', () => {
    const result = parseLegadoImportPayload([
      {
        bookSourceUrl: 'https://example.com',
        bookSourceName: '可用书源',
        searchUrl: '/search',
        ruleSearch: { bookList: '.a', name: '.n', bookUrl: '.u' },
        ruleToc: { chapterList: '.c', chapterName: '.n', chapterUrl: '.u' },
        ruleContent: { content: '.content' },
      },
      {
        bookSourceName: '坏书源',
      },
    ]);
    expect(result.sources).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].name).toBe('坏书源');
  });

  it('infers bookSourceUrl from bookUrlPattern', () => {
    const normalized = normalizeLegadoSource({
      bookSourceUrl: '69-明月',
      bookUrlPattern: 'https://69shuba.tw/book/.+',
      bookSourceName: '测试',
      searchUrl: '/s',
      ruleSearch: { bookList: 'a', name: 'b', bookUrl: 'c' },
      ruleToc: { chapterList: 'a', chapterName: 'b', chapterUrl: 'c' },
      ruleContent: { content: 'd' },
    }) as { bookSourceUrl: string };
    expect(normalized.bookSourceUrl).toBe('https://69shuba.tw');
  });
});
