import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '@novel-reader/shared';

describe('auth schemas', () => {
  it('validates register', () => {
    const r = registerSchema.safeParse({
      email: 'test@test.com',
      password: '123456',
      nickname: 'test',
    });
    expect(r.success).toBe(true);
  });

  it('validates login', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
    expect(r.success).toBe(true);
  });
});
