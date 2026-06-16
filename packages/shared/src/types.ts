export type UserRole = 'USER' | 'ADMIN';

export type BookType =
  | 'SOURCE'
  | 'LOCAL_TXT'
  | 'LOCAL_EPUB'
  | 'SERVER_TXT'
  | 'SERVER_EPUB';

export type FileFormat = 'TXT' | 'EPUB';
export type ParseStatus = 'PENDING' | 'PARSING' | 'DONE' | 'FAILED';

export interface LegadoBookSource {
  bookSourceUrl: string;
  bookSourceName: string;
  bookSourceType?: number;
  bookSourceGroup?: string;
  enabled?: boolean;
  enabledExplore?: boolean;
  enabledCookieJar?: boolean;
  loginUrl?: string;
  loginUi?: string;
  loginCheckJs?: string;
  concurrentRate?: string;
  header?: string;
  searchUrl: string;
  exploreUrl?: string;
  ruleSearch: Record<string, string>;
  ruleBookInfo?: Record<string, string>;
  ruleToc: Record<string, string>;
  ruleContent: Record<string, string>;
  ruleExplore?: Record<string, string>;
  ruleReview?: Record<string, string>;
  bookSourceComment?: string;
  variableComment?: string;
}

export interface SearchResult {
  name: string;
  author: string;
  bookUrl: string;
  coverUrl?: string;
  intro?: string;
  sourceId: string;
  sourceName: string;
}

export interface BookMetadata {
  publisher?: string;
  language?: string;
}

export interface BookMeta {
  title: string;
  author: string;
  intro?: string;
  coverUrl?: string;
  metadata?: BookMetadata;
}

export interface ChapterInfo {
  index: number;
  title: string;
  url?: string;
  content?: string;
}

export interface ParsedBook {
  meta: BookMeta;
  chapters: ChapterInfo[];
}

export interface ReaderTheme {
  preset: 'day' | 'night' | 'sepia' | 'green' | 'custom';
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
  contentWidth: number;
  pageMode: 'scroll' | 'page';
}

export interface DesktopWindowSettings {
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  alwaysOnTop: boolean;
}

export interface MobileSettings {
  aiProvider: 'openai' | 'deepseek' | 'custom';
  aiApiKey?: string;
  aiBaseUrl?: string;
  defaultDictionary: 'youdao' | 'bing' | 'google';
  youdaoAppKey?: string;
  youdaoAppSecret?: string;
}

export interface SourceStoreItem {
  id: string;
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'offline';
  lastCheckedAt?: string;
  description?: string;
}

export interface WizardProbeResult {
  siteUrl: string;
  hasSearch: boolean;
  suggestedSearchUrl?: string;
  searchInputSelector?: string;
  message: string;
}

export interface WizardAnalyzeResult {
  rules: Record<string, string>;
  preview: unknown[];
  message: string;
}

export interface DebugStepResult {
  step: 'search' | 'bookInfo' | 'toc' | 'content';
  success: boolean;
  requestUrl?: string;
  htmlSnippet?: string;
  parsed?: unknown;
  error?: string;
  suggestion?: string;
}
