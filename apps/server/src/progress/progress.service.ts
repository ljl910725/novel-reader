import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string, bookId: string) {
    return this.prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
      include: { chapter: true },
    });
  }

  async save(
    userId: string,
    bookId: string,
    data: { chapterId?: string; chapterIndex?: number; percent?: number; scrollOffset?: number },
  ) {
    return this.prisma.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: {
        userId,
        bookId,
        chapterId: data.chapterId,
        chapterIndex: data.chapterIndex ?? 0,
        percent: data.percent ?? 0,
        scrollOffset: data.scrollOffset ?? 0,
      },
      update: {
        chapterId: data.chapterId,
        chapterIndex: data.chapterIndex,
        percent: data.percent,
        scrollOffset: data.scrollOffset,
      },
    });
  }
}
