import { vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(memory.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      memory.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      memory.delete(key);
      return Promise.resolve();
    }),
    multiSet: vi.fn((pairs: [string, string][]) => {
      for (const [key, value] of pairs) memory.set(key, value);
      return Promise.resolve();
    }),
    multiRemove: vi.fn((keys: string[]) => {
      for (const key of keys) memory.delete(key);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      memory.clear();
      return Promise.resolve();
    }),
  },
}));

let uuid = 0;
vi.mock('expo-crypto', () => ({
  randomUUID: () => `mock-uuid-${++uuid}`,
}));

const secure = new Map<string, string>();

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((key: string) => Promise.resolve(secure.get(key) ?? null)),
  setItemAsync: vi.fn((key: string, value: string) => {
    secure.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    secure.delete(key);
    return Promise.resolve();
  }),
}));

export function clearTestStorage() {
  memory.clear();
  secure.clear();
  uuid = 0;
}
