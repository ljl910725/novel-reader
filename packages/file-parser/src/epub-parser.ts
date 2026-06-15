import type { ParsedBook } from '@novel-reader/shared';
import EPub from 'epub2';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { FileBuffer } from './detect';

export async function parseEpub(buffer: FileBuffer): Promise<ParsedBook> {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const dir = await mkdtemp(join(tmpdir(), 'novel-epub-'));
  const tempPath = join(dir, 'book.epub');
  await writeFile(tempPath, b);
  const epub = new EPub(tempPath);
  const parse = promisify(epub.parse.bind(epub));
  await parse();

  const title = epub.metadata.title ?? '??? EPUB';
  const author = epub.metadata.creator ?? '????';
  const chapters: ParsedBook['chapters'] = [];

  const flow = epub.flow ?? [];
  for (let i = 0; i < flow.length; i++) {
    const item = flow[i];
    if (!item.id) continue;
    const getChapter = promisify(epub.getChapter.bind(epub, item.id));
    try {
      const content = (await getChapter()) as string;
      chapters.push({
        index: i,
        title: item.title ?? `?? ${i + 1}`,
        content: sanitizeEpubHtml(content),
      });
    } catch {
      chapters.push({
        index: i,
        title: item.title ?? `?? ${i + 1}`,
        content: '',
      });
    }
  }

  return {
    meta: { title, author },
    chapters,
  };
}

function sanitizeEpubHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
}
