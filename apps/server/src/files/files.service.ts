import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { detectFormat, decodeMulterFilename, parseEpub, parseTxt, sanitizeDisplayFilename } from '@novel-reader/file-parser';
import { MAX_UPLOAD_SIZE } from '@novel-reader/shared';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

function safeFileSize(size: bigint | number | null | undefined): number {
  if (size == null) return 0;
  try {
    return typeof size === 'bigint' ? Number(size) : Number(size) || 0;
  } catch {
    return 0;
  }
}

function safeIsoDate(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return new Date(0).toISOString();
  }
  return value.toISOString();
}

function displayFilename(filename: string | null | undefined): string {
  return sanitizeDisplayFilename(decodeMulterFilename(filename ?? '未知文件'));
}

function serializeBook(
  book: { id: string; title: string; author: string; bookType: string } | null | undefined,
) {
  if (!book?.id) return null;
  return {
    id: book.id,
    title: book.title ?? '未知书名',
    author: book.author ?? '未知',
    bookType: book.bookType ?? 'SERVER_TXT',
  };
}

function serializeUploadedFile(
  file: {
    id: string;
    filename: string;
    format: string;
    fileSize: bigint | number;
    parseStatus: string;
    parseError: string | null;
    createdAt: Date;
    book?: { id: string; title: string; author: string; bookType: string } | null;
  },
) {
  try {
    return {
      id: file.id,
      filename: displayFilename(file.filename),
      format: file.format ?? 'TXT',
      fileSize: safeFileSize(file.fileSize),
      parseStatus: file.parseStatus ?? 'FAILED',
      parseError: file.parseError ?? null,
      createdAt: safeIsoDate(file.createdAt),
      book: serializeBook(file.book),
    };
  } catch {
    return {
      id: file.id ?? 'unknown',
      filename: displayFilename(file.filename),
      format: 'TXT',
      fileSize: 0,
      parseStatus: 'FAILED' as const,
      parseError: '记录数据异常，无法完整展示',
      createdAt: new Date(0).toISOString(),
      book: null,
    };
  }
}

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

    const originalname = displayFilename(file.originalname);
    const buffer = file.buffer;
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const format = detectFormat(originalname, buffer);

    const dup = await this.prisma.uploadedFile.findFirst({
      where: { userId, fileHash },
    });
    if (dup) {
      return { fileId: dup.id, parseStatus: dup.parseStatus, duplicate: true };
    }

    const dir = join(this.uploadDir, userId);
    await mkdir(dir, { recursive: true });

    const uploaded = await this.prisma.uploadedFile.create({
      data: {
        userId,
        filename: originalname,
        format,
        storagePath: '',
        fileHash,
        fileSize: BigInt(file.size),
        parseStatus: 'PARSING',
      },
    });

    const ext = extname(originalname).toLowerCase() || (format === 'EPUB' ? '.epub' : '.txt');
    const storagePath = join(dir, `${uploaded.id}${ext}`);
    await writeFile(storagePath, buffer);

    await this.prisma.uploadedFile.update({
      where: { id: uploaded.id },
      data: { storagePath },
    });

    this.parseAsync(uploaded.id, buffer, format, userId, originalname).catch(() => {});

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
          intro: parsed.meta.intro,
          coverUrl: parsed.meta.coverUrl,
          metadata: parsed.meta.metadata ? (parsed.meta.metadata as object) : undefined,
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
    const rows = await this.prisma.uploadedFile.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeUploadedFile);
  }

  async status(userId: string, fileId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, userId },
      include: { book: true },
    });
    if (!file) throw new NotFoundException('文件不存在');
    return serializeUploadedFile(file);
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
    return { buffer, filename: displayFilename(file.filename) };
  }
}
