import { describe, expect, it } from 'vitest';
import { validateLegadoSources } from './schemas';

describe('legado import schema', () => {
  it('accepts valid source array', () => {
    const result = validateLegadoSources([
      {
        bookSourceUrl: 'https://example.com',
        bookSourceName: '测试书源',
        searchUrl: '/search?q={{key}}',
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
    expect(result.success).toBe(true);
  });

  it('rejects non-array', () => {
    const result = validateLegadoSources({ bookSourceName: 'x' });
    expect(result.success).toBe(false);
  });
});
