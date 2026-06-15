import type { LegadoBookSource } from '@novel-reader/shared';
import { DEFAULT_READER_THEME } from '@novel-reader/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { guestStorage } from './guestStorage';

const sampleSource: LegadoBookSource = {
  bookSourceUrl: 'https://example.com/source.json',
  bookSourceName: 'Web Test Source',
  searchUrl: 'https://example.com/search?q={{key}}',
  ruleSearch: { bookList: '.list', name: '.name', bookUrl: '.url' },
  ruleToc: { chapterList: '.chapters', chapterName: '.title', chapterUrl: '.link' },
  ruleContent: { content: '.content' },
};

describe('guestStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('imports and reads guest sources', () => {
    const added = guestStorage.importSources([sampleSource]);
    expect(added).toHaveLength(1);
    expect(guestStorage.getEnabledConfigs()).toHaveLength(1);
  });

  it('adds shelf items and saves progress', () => {
    const row = guestStorage.addToShelf({
      title: 'Guest Book',
      author: 'Author',
      sourceId: 'guest-0',
      bookUrl: 'https://example.com/book',
    });
    expect(guestStorage.getShelf()).toHaveLength(1);
    guestStorage.saveProgress(row.id, 2, 50);
    expect(guestStorage.getProgress(row.id)?.chapterIndex).toBe(2);
  });

  it('saves reader theme', () => {
    guestStorage.saveTheme(DEFAULT_READER_THEME);
    expect(guestStorage.getTheme()?.preset).toBe('day');
  });
});
