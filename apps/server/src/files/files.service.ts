import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { detectFormat, parseEpub, parseTxt } from '@novel-reader/file-parser';
import { MAX_UPLOAD_SIZE } from '@novel-reader/shared';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  private uploadDir: string;

  constructor(
    private prisma: PrismaService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.uploadDir = config.get('UPLOAD_DIR', './uploads');
  }

  async upload(userId: string, file: Express.Multer.File) {
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new BadRequestException('文件超过 50MB 上限');
    }

    const buffer = file.buffer;
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const format = detectFormat(file.originalname, buffer);

    const dup = await this.prisma.uploadedFile.findFirst({
      where: { userId, fileHash },
    });
    if (dup) {
      throw new BadRequestException('该文件已存在，无需重复上传');
    }

    const dir = join(this.uploadDir, userId);
    await mkdir(dir, { recursive: true });

    const uploaded = await this.prisma.uploadedFile.create({
      data: {
        userId,
        filename: file.originalname,
        format,
        storagePath: '',
        fileHash,
        fileSize: BigInt(file.size),
        parseStatus: 'PARSING',
      },
    });

    const storagePath = join(dir, `${uploaded.id}-${file.originalname}`);
    await writeFile(storagePath, buffer);

    await this.prisma.uploadedFile.update({
      where: { id: uploaded.id },
      data: { storagePath },
    });

    this.parseAsync(uploaded.id, buffer, format, userId, file.originalname).catch(() => {});

    return { fileId: uploaded.id, parseStatus: 'PARSING' };
  }

  private async parseAsync(
    fileId: string,
    buffer: Buffer,
    format: 'TXT' | 'EPUB',
    userId: string,
    filename: string,
  ) {
    try {
      const parsed =
        format === 'TXT'
          ? parseTxt(buffer, { title: filename.replace(/\.[^.]+$/, '') })
          : await parseEpub(buffer);

      const bookType = format === 'TXT' ? 'SERVER_TXT' : 'SERVER_EPUB';

      const book = await this.prisma.book.create({
        data: {
          title: parsed.meta.title,
          author: parsed.meta.author,
          bookType,
          userId,
          uploadedFileId: fileId,
          chapters: {
            create: parsed.chapters.map((c) => ({
              title: c.title,
              index: c.index,
              cachedContent: c.content,
            })),
          },
        },
      });

      await this.prisma.uploadedFile.update({
        where: { id: fileId },
        data: { parseStatus: 'DONE' },
      });

      await this.prisma.bookshelfItem.upsert({
        where: { userId_bookId: { userId, bookId: book.id } },
        create: { userId, bookId: book.id, group: '云端' },
        update: {},
      });
    } catch (e) {
      await this.prisma.uploadedFile.update({
        where: { id: fileId },
        data: {
          parseStatus: 'FAILED',
          parseError: e instanceof Error ? e.message : '解析失败',
        },
      });
    }
  }

  async list(userId: string) {
    return this.prisma.uploadedFile.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async status(userId: string, fileId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, userId },
      include: { book: true },
    });
    if (!file) throw new NotFoundException('文件不存在');
    return file;
  }

  async remove(userId: string, fileId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, userId },
      include: { book: true },
    });
    if (!file) throw new NotFoundException('文件不存在');
    if (file.book) {
      await this.prisma.book.delete({ where: { id: file.book.id } });
    }
    await this.prisma.uploadedFile.delete({ where: { id: fileId } });
    return { ok: true };
  }

  async download(userId: string, fileId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, userId },
    });
    if (!file) throw new NotFoundException('文件不存在');
    const buffer = await readFile(file.storagePath);
    return { buffer, filename: file.filename };
  }
}
