import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookEngine } from '@novel-reader/book-engine';
import { parseLegadoImportPayload, type LegadoBookSource } from '@novel-reader/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface SourceTestOutcome {
  success: boolean;
  count?: number;
  sample?: unknown[];
  error?: string;
  suggestion?: string;
}

@Injectable()
export class SourcesService {
  constructor(private prisma: PrismaService) {}

  async importSources(userId: string, data: unknown) {
    const { sources, skipped } = parseLegadoImportPayload(data);
    if (sources.length === 0) {
      throw new BadRequestException({
        message: '书源 JSON 格式不正确',
        skipped,
      });
    }

    const created = [];
    for (const source of sources) {
      const row = await this.prisma.bookSource.create({
        data: {
          userId,
          name: source.bookSourceName,
          legadoConfig: source as object,
          group: source.bookSourceGroup ?? '默认',
        },
      });
      created.push(row);
    }
    return { created, imported: created.length, skipped };
  }

  async importFromUrl(userId: string, url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new BadRequestException('无法拉取书源订阅链接');
    const data = await res.json();
    return this.importSources(userId, data);
  }

  async list(userId: string) {
    return this.prisma.bookSource.findMany({
      where: { OR: [{ userId }, { isStore: true }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, data: { enabled?: boolean; group?: string; legadoConfig?: LegadoBookSource }) {
    const source = await this.prisma.bookSource.findFirst({
      where: { id, userId },
    });
    if (!source) throw new NotFoundException('书源不存在');

    return this.prisma.bookSource.update({
      where: { id },
      data: {
        enabled: data.enabled,
        group: data.group,
        legadoConfig: data.legadoConfig ? (data.legadoConfig as object) : undefined,
        name: data.legadoConfig?.bookSourceName,
      },
    });
  }

  async remove(userId: string, id: string) {
    const source = await this.prisma.bookSource.findFirst({ where: { id, userId } });
    if (!source) throw new NotFoundException('书源不存在');
    await this.prisma.bookSource.delete({ where: { id } });
    return { ok: true };
  }

  async removeBatch(userId: string, ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) throw new BadRequestException('请选择要删除的书源');
    const result = await this.prisma.bookSource.deleteMany({
      where: { id: { in: uniqueIds }, userId },
    });
    return { deleted: result.count };
  }

  async test(userId: string, id: string, keyword = '测试') {
    const source = await this.getUserSource(userId, id);
    const outcome = await this.runSearchTest(source.legadoConfig as unknown as LegadoBookSource, keyword);
    if (source.userId === userId) {
      await this.recordHealth(id, outcome.success);
    }
    return outcome;
  }

  async testBatch(userId: string, ids: string[], keyword = '测试') {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) throw new BadRequestException('请选择要测试的书源');

    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        const source = await this.prisma.bookSource.findFirst({
          where: { id, OR: [{ userId }, { isStore: true }] },
        });
        if (!source) {
          return { id, name: '未知书源', success: false, error: '书源不存在' };
        }
        const outcome = await this.runSearchTest(source.legadoConfig as unknown as LegadoBookSource, keyword);
        if (source.userId === userId) {
          await this.recordHealth(id, outcome.success);
        }
        return { id, name: source.name, ...outcome };
      }),
    );

    const passed = results.filter((r) => r.success).length;
    return { results, passed, failed: results.length - passed };
  }

  private async runSearchTest(config: LegadoBookSource, keyword: string): Promise<SourceTestOutcome> {
    const engine = new BookEngine(config);
    try {
      const results = await engine.search(keyword);
      return { success: results.length > 0, count: results.length, sample: results.slice(0, 3) };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : '测试失败',
        suggestion: '检查书源 URL 与搜索规则是否正确',
      };
    }
  }

  private async recordHealth(id: string, success: boolean) {
    await this.prisma.bookSource.update({
      where: { id },
      data: {
        lastChecked: new Date(),
        healthStatus: success ? 'healthy' : 'offline',
      },
    });
  }

  async debug(userId: string, id: string, keyword: string, bookUrl?: string, chapterUrl?: string) {
    const source = await this.getUserSource(userId, id);
    const engine = new BookEngine(source.legadoConfig as unknown as LegadoBookSource);
    return engine.debug(keyword, bookUrl, chapterUrl);
  }

  async getUserSource(userId: string, id: string) {
    const source = await this.prisma.bookSource.findFirst({
      where: { id, OR: [{ userId }, { isStore: true }] },
    });
    if (!source) throw new NotFoundException('书源不存在');
    return source;
  }
}
