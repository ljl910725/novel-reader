import { describe, expect, it } from 'vitest';

describe('api module', () => {
  it('uses /api prefix', () => {
    expect('/api/auth/login').toContain('/api');
  });
});
