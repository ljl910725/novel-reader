import { BookEngine } from '@novel-reader/book-engine';
import {
  legadoSourceSchema,
  type LegadoBookSource,
  type SearchResult,
} from '@novel-reader/shared';

function dedupe(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.name}-${r.author}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSource(source: unknown): LegadoBookSource {
  return legadoSourceSchema.parse(source) as LegadoBookSource;
}

export async function localSearch(q: string, sources: LegadoBookSource[]) {
  if (!q?.trim()) throw new Error('请输入搜索关键词');
  if (sources.length === 0) throw new Error('请先导入并启用书源');

  const allResults: SearchResult[] = [];
  await Promise.all(
    sources.map(async (config, index) => {
      const localId = `guest-${index}`;
      try {
        const engine = new BookEngine(config);
        const results = await engine.search(q);
        allResults.push(
          ...results.map((r) => ({
            ...r,
            sourceId: localId,
            sourceName: config.bookSourceName,
          })),
        );
      } catch {
        // skip failed sources
      }
    }),
  );

  return dedupe(allResults);
}

export async function localToc(source: unknown, bookUrl: string) {
  const config = parseSource(source);
  const engine = new BookEngine(config);
  const toc = await engine.getToc(bookUrl);
  return toc.map((c, index) => ({
    id: `guest-ch-${index}`,
    title: c.title,
    index: c.index,
    sourceChapterUrl: c.url,
  }));
}

export async function localContent(source: unknown, chapterUrl: string) {
  const config = parseSource(source);
  const engine = new BookEngine(config);
  const content = await engine.getContent(chapterUrl);
  return { content, chapterUrl };
}

export async function localTestSources(
  items: Array<{ id: string; source: unknown }>,
  keyword = '测试',
) {
  const results = await Promise.all(
    items.map(async ({ id, source }) => {
      try {
        const config = parseSource(source);
        const engine = new BookEngine(config);
        const hits = await engine.search(keyword);
        return {
          id,
          name: config.bookSourceName,
          success: hits.length > 0,
          count: hits.length,
        };
      } catch (e) {
        return {
          id,
          name: '未知书源',
          success: false,
          error: e instanceof Error ? e.message : '测试失败',
        };
      }
    }),
  );
  const passed = results.filter((r) => r.success).length;
  return { results, passed, failed: results.length - passed };
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
