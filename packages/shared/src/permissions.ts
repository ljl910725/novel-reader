import { z } from 'zod';

export const permissionsSchema = z.object({
  importSources: z.boolean(),
  searchBooks: z.boolean(),
  readOnline: z.boolean(),
  localBooks: z.boolean(),
  cloudUpload: z.boolean(),
  cloudSync: z.boolean(),
  sourceStore: z.boolean(),
  sourceWizard: z.boolean(),
  aiTools: z.boolean(),
  adminPanel: z.boolean(),
});

export type UserPermissions = z.infer<typeof permissionsSchema>;

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  importSources: '导入书源',
  searchBooks: '搜索书籍',
  readOnline: '在线阅读',
  localBooks: '本地书籍',
  cloudUpload: '云端上传',
  cloudSync: '云端同步',
  sourceStore: '书源商店',
  sourceWizard: '书源向导',
  aiTools: 'AI / 词典',
  adminPanel: '管理后台',
};

/** 游客默认可用功能（无需登录） */
export const DEFAULT_GUEST_PERMISSIONS: UserPermissions = {
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

/** 注册用户默认权限 */
export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  importSources: true,
  searchBooks: true,
  readOnline: true,
  localBooks: true,
  cloudUpload: true,
  cloudSync: true,
  sourceStore: true,
  sourceWizard: true,
  aiTools: true,
  adminPanel: false,
};

/** 管理员拥有全部权限 */
export const ADMIN_PERMISSIONS: UserPermissions = {
  importSources: true,
  searchBooks: true,
  readOnline: true,
  localBooks: true,
  cloudUpload: true,
  cloudSync: true,
  sourceStore: true,
  sourceWizard: true,
  aiTools: true,
  adminPanel: true,
};

export function mergePermissions(base: UserPermissions, override?: Partial<UserPermissions> | null): UserPermissions {
  if (!override) return base;
  return { ...base, ...override };
}
