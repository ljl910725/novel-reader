import { describe, expect, it } from 'vitest';
import { DEFAULT_GUEST_PERMISSIONS, DEFAULT_USER_PERMISSIONS, mergePermissions } from './permissions';

describe('permissions', () => {
  it('guest defaults allow local reading and search', () => {
    expect(DEFAULT_GUEST_PERMISSIONS.searchBooks).toBe(true);
    expect(DEFAULT_GUEST_PERMISSIONS.importSources).toBe(true);
    expect(DEFAULT_GUEST_PERMISSIONS.cloudSync).toBe(false);
  });

  it('merges user overrides', () => {
    const merged = mergePermissions(DEFAULT_USER_PERMISSIONS, { cloudUpload: false });
    expect(merged.cloudUpload).toBe(false);
    expect(merged.searchBooks).toBe(true);
  });
});
