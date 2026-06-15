import { Injectable, NotFoundException } from '@nestjs/common';
import { DEMO_STORE_SOURCES } from '@novel-reader/book-engine';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SourceStoreService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const store = await this.prisma.bookSource.findMany({
      where: { isStore: true },
      orderBy: { name: 'asc' },
    });
    if (store.length === 0) {
      return DEMO_STORE_SOURCES.map((s) => ({
        id: s.id,
        name: s.bookSourceName,
        url: s.bookSourceUrl,
        description: s.description,
        status: 'healthy' as const,
        group: s.bookSourceGroup,
        isBuiltin: true,
        legadoConfig: s,
      }));
    }
    return store.map((s) => ({
      id: s.id,
      name: s.name,
      url: (s.legadoConfig as { bookSourceUrl: string }).bookSourceUrl,
      description: (s.legadoConfig as { bookSourceComment?: string }).bookSourceComment,
      status: (s.storeStatus as 'healthy' | 'degraded' | 'offline') ?? 'healthy',
      lastCheckedAt: s.lastChecked?.toISOString(),
      group: s.group,
      isBuiltin: false,
    }));
  }

  async importToUser(userId: string, storeId: string) {
    const builtin = DEMO_STORE_SOURCES.find((s) => s.id === storeId);
    if (builtin) {
      const { id: _id, description: _d, ...config } = builtin;
      const existing = await this.prisma.bookSource.findFirst({
        where: {
          userId,
          name: config.bookSourceName,
        },
      });
      if (existing) return existing;
      return this.prisma.bookSource.create({
        data: {
          userId,
          name: config.bookSourceName,
          legadoConfig: config as object,
          group: config.bookSourceGroup ?? '书源商店',
        },
      });
    }

    const storeSource = await this.prisma.bookSource.findFirst({
      where: { id: storeId, isStore: true },
    });
    if (!storeSource) throw new NotFoundException('书源商店条目不存在');

    return this.prisma.bookSource.create({
      data: {
        userId,
        name: storeSource.name,
        legadoConfig: storeSource.legadoConfig as object,
        group: '书源商店',
      },
    });
  }
}
