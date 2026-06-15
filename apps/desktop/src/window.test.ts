import { describe, expect, it } from 'vitest';
import { DEFAULT_DESKTOP_WINDOW } from '@novel-reader/shared';

describe('desktop window defaults', () => {
  it('has valid opacity range', () => {
    expect(DEFAULT_DESKTOP_WINDOW.opacity).toBeGreaterThan(0);
    expect(DEFAULT_DESKTOP_WINDOW.opacity).toBeLessThanOrEqual(1);
  });
});
