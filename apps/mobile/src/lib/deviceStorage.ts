import type { LegadoBookSource, ReaderTheme } from '@novel-reader/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const SOURCES_KEY = 'nr_device_sources';
const SHELF_KEY = 'nr_device_shelf';
const PROGRESS_KEY = 'nr_device_progress';
const THEME_KEY = 'nr_device_theme';
const API_URL_KEY = 'nr_api_url';

export interface DeviceSource {
  id: string;
  name: string;
  group: string;
  enabled: boolean;
  legadoConfig: LegadoBookSource;
}

export interface DeviceShelfItem {
  id: string;
  title: string;
  author: string;
  sourceId: string;
  bookUrl: string;
  coverUrl?: string;
  addedAt: string;
}

export interface DeviceProgress {
  shelfItemId: string;
  chapterIndex: number;
  scrollOffset: number;
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function newId() {
  return Crypto.randomUUID();
}

/** 手机本地存储：书源、书架、进度均保存在 APK 设备上（AsyncStorage） */
export const deviceStorage = {
  async getApiUrl(): Promise<string> {
    return (await AsyncStorage.getItem(API_URL_KEY)) ?? 'http://10.0.2.2:3001/api';
  },

  async setApiUrl(url: string) {
    await AsyncStorage.setItem(API_URL_KEY, url.replace(/\/$/, ''));
  },

  async getSources(): Promise<DeviceSource[]> {
    return read(SOURCES_KEY, []);
  },

  async saveSources(sources: DeviceSource[]) {
    await write(SOURCES_KEY, sources);
  },

  async importSources(configs: LegadoBookSource[]) {
    const existing = await deviceStorage.getSources();
    const added: DeviceSource[] = [];
    for (const c of configs) {
      added.push({
        id: await newId(),
        name: c.bookSourceName,
        group: c.bookSourceGroup ?? '默认',
        enabled: c.enabled !== false,
        legadoConfig: c,
      });
    }
    await deviceStorage.saveSources([...existing, ...added]);
    return added;
  },

  async getEnabledConfigs(): Promise<LegadoBookSource[]> {
    const sources = await deviceStorage.getSources();
    return sources.filter((s) => s.enabled).map((s) => s.legadoConfig);
  },

  async getSourceById(id: string) {
    return (await deviceStorage.getSources()).find((s) => s.id === id);
  },

  async toggleSource(id: string, enabled: boolean) {
    const all = await deviceStorage.getSources();
    await deviceStorage.saveSources(all.map((s) => (s.id === id ? { ...s, enabled } : s)));
  },

  async getShelf(): Promise<DeviceShelfItem[]> {
    return read(SHELF_KEY, []);
  },

  async addToShelf(item: Omit<DeviceShelfItem, 'id' | 'addedAt'>) {
    const shelf = await deviceStorage.getShelf();
    const dup = shelf.find((s) => s.bookUrl === item.bookUrl && s.sourceId === item.sourceId);
    if (dup) return dup;
    const row: DeviceShelfItem = {
      ...item,
      id: await newId(),
      addedAt: new Date().toISOString(),
    };
    await write(SHELF_KEY, [row, ...shelf]);
    return row;
  },

  async getProgress(shelfItemId: string): Promise<DeviceProgress | null> {
    const all = await read<Record<string, DeviceProgress>>(PROGRESS_KEY, {});
    return all[shelfItemId] ?? null;
  },

  async saveProgress(shelfItemId: string, chapterIndex: number, scrollOffset = 0) {
    const all = await read<Record<string, DeviceProgress>>(PROGRESS_KEY, {});
    all[shelfItemId] = { shelfItemId, chapterIndex, scrollOffset };
    await write(PROGRESS_KEY, all);
  },

  async getTheme(): Promise<ReaderTheme | null> {
    return read(THEME_KEY, null);
  },

  async saveTheme(theme: ReaderTheme) {
    await write(THEME_KEY, theme);
  },
};
