import type { LegadoBookSource, ReaderTheme } from '@novel-reader/shared';

const SOURCES_KEY = 'nr_guest_sources';
const SHELF_KEY = 'nr_guest_shelf';
const PROGRESS_KEY = 'nr_guest_progress';
const THEME_KEY = 'nr_guest_theme';

export interface GuestSource {
  id: string;
  name: string;
  group: string;
  enabled: boolean;
  legadoConfig: LegadoBookSource;
  healthStatus?: 'healthy' | 'offline';
  lastChecked?: string;
}

export interface GuestShelfItem {
  id: string;
  title: string;
  author: string;
  sourceId: string;
  bookUrl: string;
  coverUrl?: string;
  intro?: string;
  addedAt: string;
}

export interface GuestProgress {
  shelfItemId: string;
  chapterIndex: number;
  scrollOffset: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const guestStorage = {
  getSources(): GuestSource[] {
    return read(SOURCES_KEY, []);
  },

  saveSources(sources: GuestSource[]) {
    write(SOURCES_KEY, sources);
  },

  importSources(configs: LegadoBookSource[]) {
    const existing = guestStorage.getSources();
    const added: GuestSource[] = configs.map((c) => ({
      id: crypto.randomUUID(),
      name: c.bookSourceName,
      group: c.bookSourceGroup ?? '默认',
      enabled: c.enabled !== false,
      legadoConfig: c,
    }));
    guestStorage.saveSources([...existing, ...added]);
    return added;
  },

  getEnabledConfigs(): LegadoBookSource[] {
    return guestStorage.getSources().filter((s) => s.enabled).map((s) => s.legadoConfig);
  },

  getSourceById(id: string) {
    return guestStorage.getSources().find((s) => s.id === id);
  },

  removeSources(ids: string[]) {
    const idSet = new Set(ids);
    guestStorage.saveSources(guestStorage.getSources().filter((s) => !idSet.has(s.id)));
  },

  updateHealth(id: string, healthStatus: 'healthy' | 'offline') {
    guestStorage.saveSources(
      guestStorage.getSources().map((s) =>
        s.id === id ? { ...s, healthStatus, lastChecked: new Date().toISOString() } : s,
      ),
    );
  },

  getShelf(): GuestShelfItem[] {
    return read(SHELF_KEY, []);
  },

  addToShelf(item: Omit<GuestShelfItem, 'id' | 'addedAt'>) {
    const shelf = guestStorage.getShelf();
    const dup = shelf.find((s) => s.bookUrl === item.bookUrl && s.sourceId === item.sourceId);
    if (dup) return dup;
    const row: GuestShelfItem = {
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    };
    write(SHELF_KEY, [row, ...shelf]);
    return row;
  },

  removeFromShelf(id: string) {
    write(
      SHELF_KEY,
      guestStorage.getShelf().filter((s) => s.id !== id),
    );
  },

  getProgress(shelfItemId: string): GuestProgress | null {
    const all = read<Record<string, GuestProgress>>(PROGRESS_KEY, {});
    return all[shelfItemId] ?? null;
  },

  saveProgress(shelfItemId: string, chapterIndex: number, scrollOffset = 0) {
    const all = read<Record<string, GuestProgress>>(PROGRESS_KEY, {});
    all[shelfItemId] = { shelfItemId, chapterIndex, scrollOffset };
    write(PROGRESS_KEY, all);
  },

  getTheme(): ReaderTheme | null {
    return read(THEME_KEY, null);
  },

  saveTheme(theme: ReaderTheme) {
    write(THEME_KEY, theme);
  },
};
