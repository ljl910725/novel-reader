import { BadRequestException, Injectable } from '@nestjs/common';
import { BookEngine } from '@novel-reader/book-engine';
import { legadoImportSchema, legadoSourceSchema, type LegadoBookSource, type SearchResult } from '@novel-reader/shared';

@Injectable()
export class GuestService {
  async search(q: string, sources: unknown) {
    if (!q?.trim()) throw new BadRequestException('请输入搜索关键词');
    const parsed = legadoImportSchema.safeParse(sources);
    if (!parsed.success) {
      throw new BadRequestException('书源格式不正确');
    }

    const allResults: SearchResult[] = [];
    await Promise.all(
      parsed.data.map(async (config, index) => {
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

    return this.dedupe(allResults);
  }

  async getToc(source: unknown, bookUrl: string) {
    const config = this.parseSource(source);
    const engine = new BookEngine(config);
    const toc = await engine.getToc(bookUrl);
    return toc.map((c, index) => ({
      id: `guest-ch-${index}`,
      title: c.title,
      index: c.index,
      sourceChapterUrl: c.url,
    }));
  }

  async getContent(source: unknown, chapterUrl: string) {
    const config = this.parseSource(source);
    const engine = new BookEngine(config);
    const content = await engine.getContent(chapterUrl);
    return { content, chapterUrl };
  }

  async getBookInfo(source: unknown, bookUrl: string) {
    const config = this.parseSource(source);
    const engine = new BookEngine(config);
    return engine.getBookInfo(bookUrl);
  }

  validateSources(data: unknown): { valid: true; count: number } | { valid: false; errors: object } {
    const parsed = legadoImportSchema.safeParse(data);
    if (!parsed.success) {
      return { valid: false, errors: parsed.error.flatten() as object };
    }
    return { valid: true, count: parsed.data.length };
  }

  private parseSource(source: unknown): LegadoBookSource {
    return legadoSourceSchema.parse(source);
  }

  private dedupe(results: SearchResult[]) {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = `${r.name}-${r.author}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
