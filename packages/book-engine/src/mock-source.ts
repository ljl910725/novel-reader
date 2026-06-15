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

export const DEMO_STORE_SOURCES: Array<LegadoBookSource & { id: string; description: string }> = [
  {
    id: 'demo-mock-1',
    description: '内置演示书源，用于测试搜索与阅读流程',
    ...DEMO_MOCK_SOURCE,
  },
  {
    id: 'demo-mock-2',
    bookSourceUrl: 'https://httpbin.org',
    bookSourceName: '演示书源 2',
    bookSourceGroup: '演示',
    enabled: true,
    searchUrl: '/html',
    description: '备用演示书源',
    ruleSearch: {
      bookList: 'body',
      name: 'title@text',
      author: 'p@text',
      bookUrl: '/html',
    },
    ruleToc: {
      chapterList: 'body',
      chapterName: 'title@text',
      chapterUrl: '/html',
    },
    ruleContent: {
      content: 'body@html',
    },
  },
];
