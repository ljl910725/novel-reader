import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from '../books/books.service';

@Injectable()
export class ShelfService {
  constructor(
    private prisma: PrismaService,
    private books: BooksService,
  ) {}

  async list(userId: string, sort?: string) {
    const items = await this.prisma.bookshelfItem.findMany({
      where: { userId },
      include: {
        book: {
          include: { _count: { select: { chapters: true } } },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    const bookIds = items.map((i) => i.bookId);
    const progressRows = await this.prisma.readingProgress.findMany({
      where: { userId, bookId: { in: bookIds } },
      include: { chapter: { select: { id: true, title: true, index: true } } },
    });
    const progressMap = new Map(progressRows.map((p) => [p.bookId, p]));

    const rows = items.map((item) => {
      const p = progressMap.get(item.bookId);
      const chapterCount = item.book?._count?.chapters ?? 0;
      const fallbackPercent =
        chapterCount > 0 ? Math.min(100, Math.max(0, ((p?.chapterIndex ?? 0) / chapterCount) * 100)) : 0;
      return {
        ...item,
        progress: p
          ? {
              chapterIndex: p.chapterIndex ?? 0,
              percent: typeof p.percent === 'number' ? p.percent : fallbackPercent,
              updatedAt: p.updatedAt?.toISOString?.() ? p.updatedAt.toISOString() : null,
              chapter: p.chapter
                ? { id: p.chapter.id, title: p.chapter.title, index: p.chapter.index }
                : null,
            }
          : null,
      };
    });

    const sortKey = (sort ?? '').toLowerCase();
    if (sortKey === 'name') {
      rows.sort((a, b) => String(a.book.title ?? '').localeCompare(String(b.book.title ?? ''), 'zh-Hans-CN'));
      return rows;
    }
    if (sortKey === 'added') {
      rows.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime();
      });
      return rows;
    }

    // 默认：最近阅读（ReadingProgress.updatedAt desc），无进度的放后面，再按 addedAt
    rows.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const at = a.progress?.updatedAt ? new Date(a.progress.updatedAt).getTime() : 0;
      const bt = b.progress?.updatedAt ? new Date(b.progress.updatedAt).getTime() : 0;
      if (at !== bt) return bt - at;
      const aAdded = new Date(String(a.createdAt)).getTime();
      const bAdded = new Date(String(b.createdAt)).getTime();
      return bAdded - aAdded;
    });
    return rows;
  }

  async add(
    userId: string,
    data: {
      sourceId?: string;
      bookUrl?: string;
      bookId?: string;
      title?: string;
      author?: string;
      coverUrl?: string;
      intro?: string;
      group?: string;
    },
  ) {
    let bookId = data.bookId;
    if (!bookId && data.sourceId && data.bookUrl) {
      const book = await this.books.getOrCreateFromSource(
        userId,
        data.sourceId,
        data.bookUrl,
        {
          title: data.title,
          author: data.author,
          coverUrl: data.coverUrl,
          intro: data.intro,
        },
      );
      bookId = book.id;
    }
    if (!bookId) throw new NotFoundException('无法添加书籍');

    return this.prisma.bookshelfItem.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId, group: data.group ?? '默认' },
      update: { group: data.group },
      include: { book: true },
    });
  }

  async remove(userId: string, bookId: string) {
    await this.prisma.bookshelfItem.deleteMany({ where: { userId, bookId } });
    return { ok: true };
  }

  async update(userId: string, bookId: string, data: { pinned?: boolean; tracking?: boolean; group?: string }) {
    return this.prisma.bookshelfItem.update({
      where: { userId_bookId: { userId, bookId } },
      data,
      include: { book: true },
    });
  }
}
