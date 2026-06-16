import { beforeEach, describe, expect, it } from 'vitest';
import { clearTestStorage } from '../../test/setup';
import { clearTokens, getAccessToken, isRememberExpired, setTokens } from './authStorage';

describe('authStorage', () => {
  beforeEach(() => {
    clearTestStorage();
  });

  it('stores session tokens in secure store', async () => {
    await setTokens('access-1', 'refresh-1');
    expect(await getAccessToken()).toBe('access-1');
  });

  it('stores remember-me tokens in async storage', async () => {
    await setTokens('access-2', 'refresh-2', 7);
    expect(await getAccessToken()).toBe('access-2');
    expect(await isRememberExpired()).toBe(false);
  });

  it('clears tokens on logout', async () => {
    await setTokens('access-3', 'refresh-3', 1);
    await clearTokens();
    expect(await getAccessToken()).toBeNull();
  });
});
