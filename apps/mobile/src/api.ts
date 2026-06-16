import type { UserPermissions } from '@novel-reader/shared';
import { clearTokens, getAccessToken, setTokens } from './lib/authStorage';
import { deviceStorage } from './lib/deviceStorage';

async function baseUrl() {
  return deviceStorage.getApiUrl();
}

export async function getToken() {
  return getAccessToken();
}

export async function setToken(token: string | null) {
  if (token) await setTokens(token, '');
  else await clearTokens();
}

export { clearTokens, setTokens };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${await baseUrl()}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as { message?: string | string[] }));
    const raw = err.message;
    const message = Array.isArray(raw) ? raw.join('；') : raw;
    if (res.status >= 500) {
      throw new Error(
        message && message !== 'Internal Server Error'
          ? message
          : `服务器错误（${res.status}），请稍后重试`,
      );
    }
    throw new Error(message ?? `请求失败（${res.status}）`);
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
  login: (body: { email: string; password: string; rememberDays?: 0 | 1 | 7 | 30 }) =>
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

  search: (q: string) => request<Array<Record<string, unknown>>>(`/search?q=${encodeURIComponent(q)}`),

  shelf: () => request<Array<Record<string, unknown>>>('/shelf'),
  addToShelf: (body: Record<string, unknown>) =>
    request('/shelf', { method: 'POST', body: JSON.stringify(body) }),

  getChapters: (bookId: string) =>
    request<Array<{ id: string; title: string; index: number }>>(`/books/${bookId}/chapters`),

  getChapterContent: (id: string) => request<{ content: string }>(`/chapters/${id}/content`),

  listFiles: () => request<UploadedFileRecord[]>('/files'),
  fileStatus: (id: string) => request<UploadedFileRecord>(`/files/${id}/status`),
  deleteFile: (id: string) => request<{ ok: boolean }>(`/files/${id}`, { method: 'DELETE' }),
  uploadFile: (uri: string, name: string, mimeType: string) => {
    const fd = new FormData();
    fd.append('file', { uri, name, type: mimeType } as unknown as Blob);
    return request<{ fileId: string; parseStatus: string; duplicate?: boolean }>('/files/upload', {
      method: 'POST',
      body: fd,
      headers: {},
    });
  },
};
