import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { api, setToken } from './api';
import { deviceStorage } from './lib/deviceStorage';

const BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';

async function waitForLiveServer(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await request(BASE).get('/api/health');
      if (res.status === 200) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`API not reachable at ${BASE}. Start server: pnpm --filter @novel-reader/server dev`);
}

describe('mobile API integration (live)', () => {
  beforeAll(async () => {
    await waitForLiveServer();
    await deviceStorage.setApiUrl(`${BASE}/api`);
  }, 60000);

  it('fetches guest permissions config', async () => {
    const res = await request(BASE).get('/api/config/permissions');
    expect(res.status).toBe(200);
    expect(res.body.guest.searchBooks).toBe(true);
  });

  it('loads source store', async () => {
    const items = await api.sourceStore();
    expect(Array.isArray(items)).toBe(true);
  });

  it('logs in with demo account', async () => {
    const { accessToken } = await api.login({ email: 'demo@novel.local', password: 'demo123' });
    expect(accessToken).toBeTruthy();
    await setToken(accessToken);

    const me = await api.me();
    expect(me.email).toBe('demo@novel.local');
    expect(me.permissions.searchBooks).toBe(true);
  });

  it('loads shelf for logged-in user', async () => {
    const { accessToken } = await api.login({ email: 'demo@novel.local', password: 'demo123' });
    await setToken(accessToken);
    const shelf = await api.shelf();
    expect(Array.isArray(shelf)).toBe(true);
  });
});
