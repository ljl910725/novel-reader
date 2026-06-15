import { describe, expect, it } from 'vitest';
import { buildLegadoSource } from './wizard';

describe('buildLegadoSource', () => {
  it('builds valid legado config', () => {
    const source = buildLegadoSource(
      'https://example.com',
      '测试',
      '/search?q={{key}}',
      { bookList: '.item', name: '.t@text', bookUrl: 'a@href' },
      { chapterList: 'a', chapterName: '@text', chapterUrl: '@href' },
      { content: '#content@html' },
    );
    expect(source.bookSourceName).toBe('测试');
    expect(source.ruleSearch.bookList).toBe('.item');
  });
});
