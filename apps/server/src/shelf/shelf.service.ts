import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from '../books/books.service';

@Injectable()
export class ShelfService {
  constructor(
    private prisma: PrismaService,
    private books: BooksService,
  ) {}

  async list(userId: string) {
    const items = await this.prisma.bookshelfItem.findMany({
      where: { userId },
      include: { book: true },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    return items;
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
