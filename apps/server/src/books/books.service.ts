import { Injectable, NotFoundException } from '@nestjs/common';
import { BookEngine } from '@novel-reader/book-engine';
import type { LegadoBookSource } from '@novel-reader/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SourcesService } from '../sources/sources.service';

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private sources: SourcesService,
  ) {}

  async getOrCreateFromSource(
    userId: string,
    sourceId: string,
    bookUrl: string,
    meta?: { title?: string; author?: string; coverUrl?: string; intro?: string },
  ) {
    let book = await this.prisma.book.findFirst({
      where: { sourceId, sourceBookUrl: bookUrl, userId },
    });
    if (book) {
      const patch: { coverUrl?: string; intro?: string } = {};
      if (!book.coverUrl && meta?.coverUrl) patch.coverUrl = meta.coverUrl;
      if (!book.intro && meta?.intro) patch.intro = meta.intro;
      if (Object.keys(patch).length > 0) {
        book = await this.prisma.book.update({ where: { id: book.id }, data: patch });
      }
      return book;
    }

    const source = await this.sources.getUserSource(userId, sourceId);
    const engine = new BookEngine(source.legadoConfig as unknown as LegadoBookSource);
    const info = await engine.getBookInfo(bookUrl);

    book = await this.prisma.book.create({
      data: {
        title: meta?.title ?? info.name ?? '未知书名',
        author: meta?.author ?? info.author ?? '未知',
        intro: meta?.intro ?? info.intro,
        coverUrl: meta?.coverUrl ?? info.coverUrl,
        bookType: 'SOURCE',
        sourceBookUrl: bookUrl,
        sourceId,
        userId,
      },
    });
    return book;
  }

  private async requireBook(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('书籍不存在');
    return book;
  }

  async getBook(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        uploadedFile: {
          select: {
            id: true,
            filename: true,
            format: true,
            fileSize: true,
            createdAt: true,
          },
        },
        _count: { select: { chapters: true } },
      },
    });
    if (!book) throw new NotFoundException('书籍不存在');

    const metadata = (book.metadata ?? {}) as Record<string, unknown>;
    const file = book.uploadedFile;

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      intro: book.intro,
      coverUrl: book.coverUrl,
      bookType: book.bookType,
      publisher: typeof metadata.publisher === 'string' ? metadata.publisher : undefined,
      language: typeof metadata.language === 'string' ? metadata.language : undefined,
      chapterCount: book._count.chapters,
      createdAt: book.createdAt.toISOString(),
      file: file
        ? {
            id: file.id,
            filename: file.filename,
            format: file.format,
            fileSize: Number(file.fileSize),
            uploadedAt: file.createdAt.toISOString(),
          }
        : undefined,
    };
  }

  async getChapters(bookId: string) {
    const book = await this.requireBook(bookId);
    const existing = await this.prisma.chapter.findMany({
      where: { bookId },
      orderBy: { index: 'asc' },
      select: { id: true, title: true, index: true, sourceChapterUrl: true },
    });
    if (existing.length > 0) return existing;

    if (book.bookType === 'SOURCE' && book.sourceId && book.sourceBookUrl) {
      const source = await this.prisma.bookSource.findUnique({ where: { id: book.sourceId } });
      if (source) {
        const engine = new BookEngine(source.legadoConfig as unknown as LegadoBookSource);
        const toc = await engine.getToc(book.sourceBookUrl);
        const chapters = await Promise.all(
          toc.map((c) =>
            this.prisma.chapter.create({
              data: {
                bookId,
                title: c.title,
                sourceChapterUrl: c.url,
                index: c.index,
              },
            }),
          ),
        );
        return chapters.map(({ id, title, index, sourceChapterUrl }) => ({
          id,
          title,
          index,
          sourceChapterUrl,
        }));
      }
    }

    return existing;
  }

  async getChapterContent(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true },
    });
    if (!chapter) throw new NotFoundException('章节不存在');

    if (chapter.cachedContent) {
      return { content: chapter.cachedContent, chapterId: chapter.id };
    }

    if (chapter.book.bookType === 'SOURCE' && chapter.sourceChapterUrl && chapter.book.sourceId) {
      const source = await this.prisma.bookSource.findUnique({
        where: { id: chapter.book.sourceId },
      });
      if (source) {
        const engine = new BookEngine(source.legadoConfig as unknown as LegadoBookSource);
        const content = await engine.getContent(chapter.sourceChapterUrl);
        await this.prisma.chapter.update({
          where: { id: chapterId },
          data: { cachedContent: content },
        });
        return { content, chapterId: chapter.id };
      }
    }

    return { content: chapter.cachedContent ?? '', chapterId: chapter.id };
  }

  async registerLocalBook(
    userId: string,
    data: {
      title: string;
      author: string;
      bookType: 'LOCAL_TXT' | 'LOCAL_EPUB';
      localFilePath: string;
      fileHash: string;
      chapters: Array<{ title: string; index: number; content?: string }>;
    },
  ) {
    const book = await this.prisma.book.create({
      data: {
        title: data.title,
        author: data.author,
        bookType: data.bookType,
        localFilePath: data.localFilePath,
        fileHash: data.fileHash,
        userId,
        chapters: {
          create: data.chapters.map((c) => ({
            title: c.title,
            index: c.index,
            cachedContent: c.content,
          })),
        },
      },
      include: { chapters: true },
    });
    return book;
  }

  async relinkLocalBook(userId: string, bookId: string, localFilePath: string, fileHash: string) {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, userId, bookType: { in: ['LOCAL_TXT', 'LOCAL_EPUB'] } },
    });
    if (!book) throw new NotFoundException('本地书籍不存在');
    return this.prisma.book.update({
      where: { id: bookId },
      data: { localFilePath, fileHash },
    });
  }
}
