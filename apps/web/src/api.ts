import type { UserPermissions } from '@novel-reader/shared';

const API = '/api';

function getToken() {
  return localStorage.getItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? '请求失败');
  }
  return res.json();
}

export type UploadedFileRecord = {
  id: string;
  filename: string;
  format: string;
  fileSize: number;
  parseStatus: 'PENDING' | 'PARSING' | 'DONE' | 'FAILED';
  parseError?: string | null;
  createdAt: string;
  book: { id: string; title: string; author: string; bookType: string } | null;
};

export const api = {
  register: (body: { email: string; password: string; nickname: string; code: string }) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  sendRegisterCode: (email: string) =>
    request<{ ok: boolean; message: string; devCode?: string }>('/auth/send-register-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string; devCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    request<{ ok: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateProfile: (nickname: string) =>
    request<{ id: string; email: string; nickname: string }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ nickname }),
    }),
  sendChangeEmailCode: (email: string) =>
    request<{ ok: boolean; message: string; devCode?: string }>('/auth/send-change-email-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  changeEmail: (body: { newEmail: string; code: string }) =>
    request<{ id: string; email: string; nickname: string }>('/auth/email', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean; message: string }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () =>
    request<{
      id: string;
      email: string;
      nickname: string;
      onboardingDone: boolean;
      role: string;
      permissions: UserPermissions;
    }>('/auth/me'),
  completeOnboarding: () => request('/auth/onboarding/complete', { method: 'POST' }),

  getGuestPermissionsConfig: () => request<{ guest: UserPermissions }>('/config/permissions'),

  guestSearch: (q: string, sources: unknown) =>
    request<Array<Record<string, unknown>>>('/guest/search', {
      method: 'POST',
      body: JSON.stringify({ q, sources }),
    }),
  guestTestSources: (items: Array<{ id: string; source: unknown }>, q?: string) =>
    request<{
      results: Array<{ id: string; name?: string; success: boolean; count?: number; error?: string }>;
      passed: number;
      failed: number;
    }>('/guest/sources/test', { method: 'POST', body: JSON.stringify({ items, q }) }),
  guestToc: (source: unknown, bookUrl: string) =>
    request<Array<{ id: string; title: string; index: number; sourceChapterUrl?: string }>>('/guest/toc', {
      method: 'POST',
      body: JSON.stringify({ source, bookUrl }),
    }),
  guestContent: (source: unknown, chapterUrl: string) =>
    request<{ content: string }>('/guest/content', {
      method: 'POST',
      body: JSON.stringify({ source, chapterUrl }),
    }),

  sourceStore: () => request<Array<Record<string, unknown>>>('/source-store'),
  importStoreSource: (id: string) => request(`/source-store/${id}/import`, { method: 'POST' }),

  sources: () => request<Array<Record<string, unknown>>>('/sources'),
  importSources: (data: unknown) =>
    request<{ created: unknown[]; imported: number; skipped: Array<{ name: string; reason: string }> }>(
      '/sources/import',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  importSourceUrl: (url: string) =>
    request<{ created: unknown[]; imported: number; skipped: Array<{ name: string; reason: string }> }>(
      '/sources/import-url',
      { method: 'POST', body: JSON.stringify({ url }) },
    ),
  testSource: (id: string, q?: string) =>
    request<{ success: boolean; count?: number; error?: string; suggestion?: string }>(
      `/sources/${id}/test?q=${encodeURIComponent(q ?? '测试')}`,
      { method: 'POST' },
    ),
  testSourcesBatch: (ids: string[], q?: string) =>
    request<{
      results: Array<{ id: string; name?: string; success: boolean; count?: number; error?: string }>;
      passed: number;
      failed: number;
    }>('/sources/test-batch', { method: 'POST', body: JSON.stringify({ ids, q }) }),
  deleteSource: (id: string) => request<{ ok: boolean }>(`/sources/${id}`, { method: 'DELETE' }),
  deleteSourcesBatch: (ids: string[]) =>
    request<{ deleted: number }>('/sources/batch', { method: 'DELETE', body: JSON.stringify({ ids }) }),
  debugSource: (id: string, body: { keyword: string; bookUrl?: string; chapterUrl?: string }) =>
    request(`/sources/${id}/debug`, { method: 'POST', body: JSON.stringify(body) }),
  updateSource: (id: string, body: Record<string, unknown>) =>
    request(`/sources/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  wizardProbe: (siteUrl: string) =>
    request('/source-wizard/probe', { method: 'POST', body: JSON.stringify({ siteUrl }) }),
  wizardAnalyzeSearch: (body: { siteUrl: string; searchUrl: string; keyword: string }) =>
    request('/source-wizard/analyze-search', { method: 'POST', body: JSON.stringify(body) }),
  wizardAnalyzeToc: (tocUrl: string) =>
    request('/source-wizard/analyze-toc', { method: 'POST', body: JSON.stringify({ tocUrl }) }),
  wizardAnalyzeContent: (contentUrl: string) =>
    request('/source-wizard/analyze-content', { method: 'POST', body: JSON.stringify({ contentUrl }) }),
  wizardSave: (body: Record<string, unknown>) =>
    request('/source-wizard/save', { method: 'POST', body: JSON.stringify(body) }),

  search: (q: string) => request<Array<Record<string, unknown>>>(`/search?q=${encodeURIComponent(q)}`),

  shelf: () => request<Array<Record<string, unknown>>>('/shelf'),
  addToShelf: (body: Record<string, unknown>) =>
    request('/shelf', { method: 'POST', body: JSON.stringify(body) }),

  getBook: (id: string) => request<Record<string, unknown>>(`/books/${id}`),
  getChapters: (id: string) => request<Array<{ id: string; title: string; index: number }>>(`/books/${id}/chapters`),
  getChapterContent: (id: string) => request<{ content: string }>(`/chapters/${id}/content`),

  getProgress: (bookId: string) => request<Record<string, unknown> | null>(`/progress/${bookId}`),
  saveProgress: (bookId: string, body: Record<string, unknown>) =>
    request(`/progress/${bookId}`, { method: 'PUT', body: JSON.stringify(body) }),

  getReaderSettings: () => request<Record<string, unknown>>('/settings/reader'),
  saveReaderSettings: (body: unknown) =>
    request('/settings/reader', { method: 'PUT', body: JSON.stringify(body) }),

  uploadFile: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ fileId: string; parseStatus: string; duplicate?: boolean }>('/files/upload', {
      method: 'POST',
      body: fd,
      headers: {},
    });
  },
  listFiles: () => request<UploadedFileRecord[]>('/files'),
  fileStatus: (id: string) => request<UploadedFileRecord>(`/files/${id}/status`),
  deleteFile: (id: string) => request<{ ok: boolean }>(`/files/${id}`, { method: 'DELETE' }),

  adminUsers: () => request<Array<Record<string, unknown>>>('/admin/users'),
  adminSources: () => request('/admin/sources'),
  adminGuestPermissions: () => request<UserPermissions>('/admin/permissions/guest'),
  adminUpdateGuestPermissions: (body: UserPermissions) =>
    request('/admin/permissions/guest', { method: 'PATCH', body: JSON.stringify(body) }),
  adminUpdateUser: (
    id: string,
    body: { role?: 'USER' | 'ADMIN'; nickname?: string; permissions?: Partial<UserPermissions>; password?: string },
  ) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminResetUserPassword: (id: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  adminSeedStore: () => request('/admin/source-store/seed', { method: 'POST' }),
};
