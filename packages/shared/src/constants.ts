import type { MobileSettings, ReaderTheme } from './types';

export const DEFAULT_READER_THEME: ReaderTheme = {
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

export const THEME_PRESETS: Record<string, Partial<ReaderTheme>> = {
  day: {
    preset: 'day',
    backgroundColor: '#f5f0e8',
    textColor: '#333333',
  },
  night: {
    preset: 'night',
    backgroundColor: '#1a1a2e',
    textColor: '#e0e0e0',
  },
  sepia: {
    preset: 'sepia',
    backgroundColor: '#f4ecd8',
    textColor: '#5c4b37',
  },
  green: {
    preset: 'green',
    backgroundColor: '#c7edcc',
    textColor: '#2d4a2d',
  },
};

export const DEFAULT_DESKTOP_WINDOW = {
  width: 480,
  height: 640,
  x: 100,
  y: 100,
  opacity: 0.95,
  alwaysOnTop: true,
};

export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export const CHAPTER_SPLIT_PATTERNS = [
  /^第[零一二三四五六七八九十百千万\d]+章[^\n\r]*/m,
  /^第[零一二三四五六七八九十百千万\d]+节[^\n\r]*/m,
  /^第\s*\d+\s*章[^\n\r]*/m,
  /^Chapter\s+\d+[^\n\r]*/im,
  /^【[^】\n\r]{1,40}】/m,
  /^={3,}$/m,
];

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  aiProvider: 'openai',
  aiApiKey: '',
  aiBaseUrl: '',
  defaultDictionary: 'youdao',
  youdaoAppKey: '',
  youdaoAppSecret: '',
};

export const AI_PROVIDER_DEFAULTS: Record<MobileSettings['aiProvider'], string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  custom: '',
};
