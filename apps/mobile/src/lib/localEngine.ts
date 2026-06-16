import type { LegadoBookSource, SearchResult } from '@novel-reader/shared';
import { api } from '../api';

export async function localSearch(q: string, sources: LegadoBookSource[]) {
  if (!q?.trim()) throw new Error('请输入搜索关键词');
  if (sources.length === 0) throw new Error('请先导入并启用书源');
  return (await api.guestSearch(q, sources)) as SearchResult[];
}

export async function localToc(source: unknown, bookUrl: string) {
  return api.guestToc(source, bookUrl);
}

export async function localContent(source: unknown, chapterUrl: string) {
  return api.guestContent(source, chapterUrl);
}

export async function localTestSources(
  items: Array<{ id: string; source: unknown }>,
  keyword = '测试',
) {
  return api.guestTestSources(items, keyword);
}

/** Map guest-{index} sourceId from search results to device source ids */
export function mapGuestSourceIds(
  raw: SearchResult[],
  enabledSources: Array<{ id: string }>,
): SearchResult[] {
  return raw.map((item) => {
    const idx = Number(String(item.sourceId).replace('guest-', ''));
    return { ...item, sourceId: enabledSources[idx]?.id ?? item.sourceId };
  });
}
