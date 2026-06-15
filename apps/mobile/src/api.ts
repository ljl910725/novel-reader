import type { UserPermissions } from '@novel-reader/shared';
import * as SecureStore from 'expo-secure-store';
import { deviceStorage } from './lib/deviceStorage';

const TOKEN_KEY = 'nr_access_token';

async function baseUrl() {
  return deviceStorage.getApiUrl();
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${await baseUrl()}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? '请求失败');
  }
  return res.json();
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () =>
    request<{
      id: string;
      email: string;
      nickname: string;
      role: string;
      permissions: UserPermissions;
    }>('/auth/me'),

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

  search: (q: string) => request<Array<Record<string, unknown>>>(`/search?q=${encodeURIComponent(q)}`),

  shelf: () => request<Array<Record<string, unknown>>>('/shelf'),

  addToShelf: (body: Record<string, unknown>) =>
    request('/shelf', { method: 'POST', body: JSON.stringify(body) }),

  getChapters: (bookId: string) =>
    request<Array<{ id: string; title: string; index: number }>>(`/books/${bookId}/chapters`),

  getChapterContent: (id: string) => request<{ content: string }>(`/chapters/${id}/content`),
};
