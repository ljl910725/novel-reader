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

export const api = {
  register: (body: { email: string; password: string; nickname: string }) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
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
    request('/sources/import', { method: 'POST', body: JSON.stringify(data) }),
  importSourceUrl: (url: string) =>
    request('/sources/import-url', { method: 'POST', body: JSON.stringify({ url }) }),
  testSource: (id: string, q?: string) =>
    request(`/sources/${id}/test?q=${encodeURIComponent(q ?? '测试')}`, { method: 'POST' }),
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
    return request<{ fileId: string; parseStatus: string }>('/files/upload', {
      method: 'POST',
      body: fd,
      headers: {},
    });
  },
  fileStatus: (id: string) => request<Record<string, unknown>>(`/files/${id}/status`),

  adminUsers: () => request<Array<Record<string, unknown>>>('/admin/users'),
  adminSources: () => request('/admin/sources'),
  adminGuestPermissions: () => request<UserPermissions>('/admin/permissions/guest'),
  adminUpdateGuestPermissions: (body: UserPermissions) =>
    request('/admin/permissions/guest', { method: 'PATCH', body: JSON.stringify(body) }),
  adminUpdateUser: (id: string, body: { role?: 'USER' | 'ADMIN'; permissions?: Partial<UserPermissions> }) =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminSeedStore: () => request('/admin/source-store/seed', { method: 'POST' }),
};
