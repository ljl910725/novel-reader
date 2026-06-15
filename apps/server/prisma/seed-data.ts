/** Docker/生产种子专用数据，避免依赖 workspace 包解析 */

export const DEFAULT_GUEST_PERMISSIONS = {
  importSources: true,
  searchBooks: true,
  readOnline: true,
  localBooks: true,
  cloudUpload: false,
  cloudSync: false,
  sourceStore: true,
  sourceWizard: true,
  aiTools: false,
  adminPanel: false,
};

export const DEFAULT_READER_THEME = {
  preset: 'day',
  backgroundColor: '#f5f0e8',
  textColor: '#333333',
  fontSize: 18,
  lineHeight: 1.8,
  paragraphSpacing: 12,
  fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
  contentWidth: 720,
  pageMode: 'scroll',
};

export const DEFAULT_DESKTOP_WINDOW = {
  width: 480,
  height: 640,
  x: 100,
  y: 100,
  opacity: 0.95,
  alwaysOnTop: true,
};

export const DEMO_STORE_SOURCES = [
  {
    id: 'demo-mock-1',
    description: '内置演示书源，用于测试搜索与阅读流程',
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
  },
  {
    id: 'demo-mock-2',
    description: '备用演示书源',
    bookSourceUrl: 'https://httpbin.org',
    bookSourceName: '演示书源 2',
    bookSourceGroup: '演示',
    enabled: true,
    searchUrl: '/html',
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
