import { beforeEach, describe, expect, it, vi } from 'vitest';

const { guestSearchMock, guestTestSourcesMock } = vi.hoisted(() => ({
  guestSearchMock: vi.fn(),
  guestTestSourcesMock: vi.fn(),
}));

vi.mock('../api', () => ({
  api: {
    guestSearch: guestSearchMock,
    guestTestSources: guestTestSourcesMock,
  },
}));

import { localSearch, localTestSources, mapGuestSourceIds } from './localEngine';
import type { LegadoBookSource } from '@novel-reader/shared';

const sampleSource: LegadoBookSource = {
  bookSourceUrl: 'https://example.com',
  bookSourceName: 'Test',
  searchUrl: '/search?q={{key}}',
  ruleSearch: { bookList: '.list', name: '.name', bookUrl: '.url' },
  ruleToc: { chapterList: '.chapters', chapterName: '.title', chapterUrl: '.link' },
  ruleContent: { content: '.content' },
};

describe('localEngine', () => {
  beforeEach(() => {
    guestSearchMock.mockReset();
    guestTestSourcesMock.mockReset();
    guestSearchMock.mockResolvedValue([
      {
        name: 'Book A',
        author: 'Author',
        bookUrl: 'https://example.com/book/1',
        sourceId: 'guest-0',
        sourceName: 'Test',
      },
    ]);
    guestTestSourcesMock.mockResolvedValue({
      results: [{ id: 'src-1', name: 'Test', success: true, count: 1 }],
      passed: 1,
      failed: 0,
    });
  });

  it('searches via guest API', async () => {
    const raw = await localSearch('keyword', [sampleSource]);
    expect(guestSearchMock).toHaveBeenCalledWith('keyword', [sampleSource]);
    expect(raw).toHaveLength(1);
    expect(raw[0].sourceId).toBe('guest-0');
  });

  it('maps guest source ids to device ids', () => {
    const mapped = mapGuestSourceIds(
      [{ sourceId: 'guest-0', name: 'A', author: '', bookUrl: '', sourceName: '' }],
      [{ id: 'device-abc' }],
    );
    expect(mapped[0].sourceId).toBe('device-abc');
  });

  it('tests sources via guest API', async () => {
    const batch = await localTestSources([{ id: 'src-1', source: sampleSource }], '测试');
    expect(guestTestSourcesMock).toHaveBeenCalled();
    expect(batch.passed).toBe(1);
    expect(batch.results[0].success).toBe(true);
  });
});
