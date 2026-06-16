import type { LegadoBookSource } from '@novel-reader/shared';

/** 演示用书源 - 使用 httpbin 模拟 HTML 响应 */
export const DEMO_MOCK_SOURCE: LegadoBookSource = {
  bookSourceUrl: 'https://httpbin.org',
  bookSourceName: '演示书源（Mock）',
  bookSourceGroup: '演示',
  enabled: true,
  searchUrl: '/html',
  ruleSearch: {
    bookList: 'h1',
    name: 'h1@text',
    author: 'p@text',
    bookUrl: '/html',
  },
  ruleBookInfo: {
    name: 'h1@text',
    author: 'p@text',
    intro: 'p@text',
  },
  ruleToc: {
    chapterList: 'h1',
    chapterName: 'h1@text',
    chapterUrl: '/html',
  },
  ruleContent: {
    content: 'body@html',
  },
};
