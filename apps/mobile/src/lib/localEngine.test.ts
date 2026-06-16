import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchMock = vi.fn();

vi.mock('@novel-reader/book-engine', () => ({
  BookEngine: vi.fn().mockImplementation(() => ({
    search: searchMock,
    getToc: vi.fn(),
    getContent: vi.fn(),
  })),
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
    searchMock.mockReset();
    searchMock.mockResolvedValue([
      {
        name: 'Book A',
        author: 'Author',
        bookUrl: 'https://example.com/book/1',
        sourceId: 'https://example.com',
        sourceName: 'Test',
      },
    ]);
  });

  it('searches locally and tags guest source ids', async () => {
    const raw = await localSearch('keyword', [sampleSource]);
    expect(raw).toHaveLength(1);
    expect(raw[0].sourceId).toBe('guest-0');
    expect(raw[0].sourceName).toBe('Test');
  });

  it('maps guest source ids to device ids', () => {
    const mapped = mapGuestSourceIds(
      [{ sourceId: 'guest-0', name: 'A', author: '', bookUrl: '', sourceName: '' }],
      [{ id: 'device-abc' }],
    );
    expect(mapped[0].sourceId).toBe('device-abc');
  });

  it('tests sources locally', async () => {
    const batch = await localTestSources([{ id: 'src-1', source: sampleSource }], '测试');
    expect(batch.passed).toBe(1);
    expect(batch.results[0].success).toBe(true);
  });
});
