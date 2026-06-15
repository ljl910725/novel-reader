import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookEngine } from '@novel-reader/book-engine';
import { validateLegadoSources, type LegadoBookSource } from '@novel-reader/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SourcesService {
  constructor(private prisma: PrismaService) {}

  async importSources(userId: string, data: unknown) {
    const result = validateLegadoSources(data);
    if (!result.success) {
      throw new BadRequestException({
        message: '书源 JSON 格式不正确',
        errors: result.error.flatten(),
      });
    }

    const created = [];
    for (const source of result.data) {
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
    return created;
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

  async test(userId: string, id: string, keyword = '测试') {
    const source = await this.getUserSource(userId, id);
    const config = source.legadoConfig as unknown as LegadoBookSource;
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
