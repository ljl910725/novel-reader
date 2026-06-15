import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(6, '密码至少 6 位'),
  nickname: z.string().min(1, '请输入昵称').max(32),
});

export const loginSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(1, '请输入密码'),
});

export const legadoSourceSchema = z.object({
  bookSourceUrl: z.string().url(),
  bookSourceName: z.string().min(1),
  bookSourceType: z.number().optional(),
  bookSourceGroup: z.string().optional(),
  enabled: z.boolean().optional(),
  enabledExplore: z.boolean().optional(),
  enabledCookieJar: z.boolean().optional(),
  loginUrl: z.string().optional(),
  loginUi: z.string().optional(),
  loginCheckJs: z.string().optional(),
  concurrentRate: z.string().optional(),
  header: z.string().optional(),
  searchUrl: z.string().min(1),
  exploreUrl: z.string().optional(),
  ruleSearch: z.object({
    bookList: z.string().min(1),
    name: z.string().min(1),
    bookUrl: z.string().min(1),
    author: z.string().optional(),
    kind: z.string().optional(),
    wordCount: z.string().optional(),
    lastChapter: z.string().optional(),
    intro: z.string().optional(),
    coverUrl: z.string().optional(),
  }),
  ruleBookInfo: z.record(z.string()).optional(),
  ruleToc: z.object({
    chapterList: z.string().min(1),
    chapterName: z.string().min(1),
    chapterUrl: z.string().min(1),
    isVip: z.string().optional(),
    isPay: z.string().optional(),
  }),
  ruleContent: z.object({
    content: z.string().min(1),
    nextContentUrl: z.string().optional(),
    replaceRegex: z.string().optional(),
    imageStyle: z.string().optional(),
    imageDecode: z.string().optional(),
    webJs: z.string().optional(),
  }),
  ruleExplore: z.record(z.string()).optional(),
  ruleReview: z.record(z.string()).optional(),
  bookSourceComment: z.string().optional(),
  variableComment: z.string().optional(),
});

export const legadoImportSchema = z.array(legadoSourceSchema).min(1);

export const readerThemeSchema = z.object({
  preset: z.enum(['day', 'night', 'sepia', 'green', 'custom']),
  backgroundColor: z.string(),
  textColor: z.string(),
  fontSize: z.number().min(12).max(32),
  lineHeight: z.number().min(1).max(3),
  paragraphSpacing: z.number().min(0).max(32),
  fontFamily: z.string(),
  contentWidth: z.number().min(400).max(1200),
  pageMode: z.enum(['scroll', 'page']),
});

export const desktopWindowSchema = z.object({
  width: z.number().min(300).max(2000),
  height: z.number().min(200).max(1500),
  x: z.number(),
  y: z.number(),
  opacity: z.number().min(0.1).max(1),
  alwaysOnTop: z.boolean(),
});

export const mobileSettingsSchema = z.object({
  aiProvider: z.enum(['openai', 'deepseek', 'custom']).default('openai'),
  aiApiKey: z.string().optional(),
  aiBaseUrl: z.string().url().optional().or(z.literal('')),
  defaultDictionary: z.enum(['youdao', 'bing', 'google']).default('youdao'),
  youdaoAppKey: z.string().optional(),
  youdaoAppSecret: z.string().optional(),
});

export function validateLegadoSources(data: unknown) {
  return legadoImportSchema.safeParse(data);
}
