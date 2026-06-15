import { Injectable } from '@nestjs/common';
import { BookEngine } from '@novel-reader/book-engine';
import type { LegadoBookSource, SearchResult } from '@novel-reader/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(userId: string, q: string, sourceIds?: string[]) {
    const sources = await this.prisma.bookSource.findMany({
      where: {
        enabled: true,
        OR: [{ userId }, { isStore: true }],
        ...(sourceIds?.length ? { id: { in: sourceIds } } : {}),
      },
    });

    const allResults: SearchResult[] = [];
    await Promise.all(
      sources.map(async (source) => {
        try {
          const engine = new BookEngine(source.legadoConfig as unknown as LegadoBookSource);
          const results = await engine.search(q);
          allResults.push(
            ...results.map((r) => ({
              ...r,
              sourceId: source.id,
              sourceName: source.name,
            })),
          );
        } catch {
          // skip failed sources
        }
      }),
    );

    return this.dedupe(allResults);
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
