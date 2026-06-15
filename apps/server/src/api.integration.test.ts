import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

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

describe('API integration (live)', () => {
  let token = '';

  beforeAll(async () => {
    await waitForLiveServer();
  }, 60000);

  it('GET /api/health', async () => {
    const res = await request(BASE).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/config/permissions', async () => {
    const res = await request(BASE).get('/api/config/permissions');
    expect(res.status).toBe(200);
    expect(res.body.guest.searchBooks).toBe(true);
  });

  it('POST /api/auth/login', async () => {
    const res = await request(BASE)
      .post('/api/auth/login')
      .send({ email: 'demo@novel.local', password: 'demo123' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    token = res.body.accessToken;
  });

  it('GET /api/auth/me', async () => {
    const res = await request(BASE)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('demo@novel.local');
    expect(res.body.permissions).toBeTruthy();
  });

  it('GET /api/source-store', async () => {
    const res = await request(BASE).get('/api/source-store');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/guest/sources/validate rejects invalid source', async () => {
    const res = await request(BASE)
      .post('/api/guest/sources/validate')
      .send({ data: [{ bookSourceName: 'x' }] });
    expect(res.status).toBe(201);
    expect(res.body.valid).toBe(false);
  });

  it('GET /api/sources with auth', async () => {
    const res = await request(BASE)
      .get('/api/sources')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/shelf with auth', async () => {
    const res = await request(BASE)
      .get('/api/shelf')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/admin/users forbidden for demo user', async () => {
    const res = await request(BASE)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/auth/login as admin', async () => {
    const res = await request(BASE)
      .post('/api/auth/login')
      .send({ email: 'admin@novel.local', password: 'admin123' });
    expect(res.status).toBe(201);
    const adminToken = res.body.accessToken;

    const users = await request(BASE)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(users.status).toBe(200);
    expect(users.body.length).toBeGreaterThan(0);

    const guestPerms = await request(BASE)
      .get('/api/admin/permissions/guest')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(guestPerms.status).toBe(200);
    expect(guestPerms.body.searchBooks).toBe(true);
  });
});
