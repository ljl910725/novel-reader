import type { LegadoBookSource } from '@novel-reader/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearTestStorage } from '../../test/setup';
import { deviceStorage } from './deviceStorage';

const sampleSource: LegadoBookSource = {
  bookSourceUrl: 'https://example.com/source.json',
  bookSourceName: 'Test Source',
  searchUrl: 'https://example.com/search?q={{key}}',
  ruleSearch: { bookList: '.list', name: '.name', bookUrl: '.url' },
  ruleToc: { chapterList: '.chapters', chapterName: '.title', chapterUrl: '.link' },
  ruleContent: { content: '.content' },
};

describe('deviceStorage', () => {
  beforeEach(() => {
    clearTestStorage();
  });

  it('stores and reads API URL', async () => {
    await deviceStorage.setApiUrl('http://192.168.1.1:3001/api/');
    expect(await deviceStorage.getApiUrl()).toBe('http://192.168.1.1:3001/api');
  });

  it('imports sources and lists enabled configs', async () => {
    const added = await deviceStorage.importSources([sampleSource]);
    expect(added).toHaveLength(1);
    expect(added[0].name).toBe('Test Source');

    const configs = await deviceStorage.getEnabledConfigs();
    expect(configs).toHaveLength(1);
    expect(configs[0].bookSourceName).toBe('Test Source');
  });

  it('toggles source enabled state', async () => {
    const [source] = await deviceStorage.importSources([sampleSource]);
    await deviceStorage.toggleSource(source.id, false);
    expect(await deviceStorage.getEnabledConfigs()).toHaveLength(0);
  });

  it('removes sources and updates health', async () => {
    const [a, b] = await deviceStorage.importSources([sampleSource, { ...sampleSource, bookSourceName: 'B' }]);
    await deviceStorage.updateHealth(a.id, 'healthy');
    const all = await deviceStorage.getSources();
    expect(all.find((s) => s.id === a.id)?.healthStatus).toBe('healthy');

    await deviceStorage.removeSources([a.id]);
    expect(await deviceStorage.getSources()).toHaveLength(1);
    expect((await deviceStorage.getSources())[0].id).toBe(b.id);
  });

  it('adds shelf items without duplicates', async () => {
    const [source] = await deviceStorage.importSources([sampleSource]);
    const item = {
      title: 'Book A',
      author: 'Author',
      sourceId: source.id,
      bookUrl: 'https://example.com/book/1',
    };
    const first = await deviceStorage.addToShelf(item);
    const second = await deviceStorage.addToShelf(item);
    expect(first.id).toBe(second.id);
    expect(await deviceStorage.getShelf()).toHaveLength(1);
  });

  it('persists reading progress', async () => {
    const row = await deviceStorage.addToShelf({
      title: 'Book B',
      author: 'Author',
      sourceId: 'src-1',
      bookUrl: 'https://example.com/book/2',
    });
    await deviceStorage.saveProgress(row.id, 3, 120);
    const progress = await deviceStorage.getProgress(row.id);
    expect(progress).toMatchObject({ shelfItemId: row.id, chapterIndex: 3, scrollOffset: 120 });
  });
});
