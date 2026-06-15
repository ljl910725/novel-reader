import { describe, expect, it } from 'vitest';
import { DEFAULT_GUEST_PERMISSIONS } from '@novel-reader/shared';

describe('mobile shared', () => {
  it('guest permissions include search', () => {
    expect(DEFAULT_GUEST_PERMISSIONS.searchBooks).toBe(true);
  });
});
