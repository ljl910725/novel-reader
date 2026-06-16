import type { ParsedBook } from '@novel-reader/shared';
import JSZip from 'jszip';

import type { FileBuffer } from './detect';

type ManifestItem = { href: string; mediaType: string };

export async function parseEpub(buffer: FileBuffer): Promise<ParsedBook> {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (b.length < 4 || b[0] !== 0x50 || b[1] !== 0x4b) {
    throw new Error('无效的 EPUB 文件（不是 ZIP 格式）');
  }

  const zip = await JSZip.loadAsync(b);
  const paths = listZipPaths(zip);
  if (paths.length === 0) {
    throw new Error('EPUB 压缩包为空');
  }

  const containerPath = findZipPath(paths, 'meta-inf/container.xml');
  if (!containerPath) {
    throw new Error('EPUB 缺少 META-INF/container.xml');
  }

  const containerXml = await readZipText(zip, containerPath);
  const opfRelative = extractAttr(containerXml, 'rootfile', 'full-path');
  if (!opfRelative) {
    throw new Error('EPUB container.xml 缺少 rootfile');
  }

  const opfPath = resolveZipPath(containerPath, opfRelative);
  const opfZipPath = findZipPath(paths, opfPath) ?? findZipPath(paths, opfRelative);
  if (!opfZipPath) {
    throw new Error(`EPUB 缺少内容描述文件 ${opfRelative}`);
  }

  const opfXml = await readZipText(zip, opfZipPath);
  const opfDir = opfZipPath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');

  const title =
    firstTagText(opfXml, 'dc:title') ??
    firstTagText(opfXml, 'title') ??
    '未知 EPUB';
  const author =
    firstTagText(opfXml, 'dc:creator') ??
    firstTagText(opfXml, 'creator') ??
    '未知';

  const manifest = parseManifest(opfXml);
  const spineIds = parseSpine(opfXml);
  const chapters: ParsedBook['chapters'] = [];

  const chapterIds = spineIds.length > 0 ? spineIds : [...manifest.keys()];
  for (let i = 0; i < chapterIds.length; i++) {
    const id = chapterIds[i];
    const item = manifest.get(id);
    if (!item) continue;

    const media = item.mediaType.toLowerCase();
    if (media && !isChapterMediaType(media)) continue;

    const chapterPath =
      findZipPath(paths, resolveZipPath(opfDir, item.href)) ??
      findZipPath(paths, item.href);
    if (!chapterPath) {
      chapters.push({
        index: chapters.length,
        title: `章节 ${chapters.length + 1}`,
        content: '',
      });
      continue;
    }

    const raw = await readZipText(zip, chapterPath);
    const chapterTitle = extractChapterTitle(raw) ?? `章节 ${chapters.length + 1}`;
    chapters.push({
      index: chapters.length,
      title: chapterTitle,
      content: sanitizeEpubHtml(raw),
    });
  }

  if (chapters.length === 0) {
    throw new Error('EPUB 未找到可读章节');
  }

  return {
    meta: { title: stripXmlText(title), author: stripXmlText(author) },
    chapters,
  };
}

function listZipPaths(zip: JSZip): string[] {
  return Object.keys(zip.files).filter((p) => !zip.files[p]!.dir);
}

function findZipPath(paths: string[], target: string): string | null {
  const norm = target.replace(/\\/g, '/').toLowerCase();
  for (const p of paths) {
    const n = p.replace(/\\/g, '/');
    if (n.toLowerCase() === norm || n.toLowerCase().endsWith(`/${norm}`)) {
      return p;
    }
  }
  return null;
}

function resolveZipPath(basePath: string, relative: string): string {
  const baseDir = basePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
  const parts = [...baseDir.split('/'), ...relative.replace(/\\/g, '/').split('/')];
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const entry = zip.file(path);
  if (!entry) throw new Error(`EPUB 内缺少文件 ${path}`);
  return entry.async('string');
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const tagRe = new RegExp(`<${tag}\\b[^>]*${attr}=["']([^"']+)["']`, 'i');
  const m = xml.match(tagRe);
  return m?.[1] ?? null;
}

function firstTagText(xml: string, tag: string): string | undefined {
  const local = tag.includes(':') ? tag.split(':').pop()! : tag;
  const patterns = [
    new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    new RegExp(`<${local}\\b[^>]*>([\\s\\S]*?)<\\/${local}>`, 'i'),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (m?.[1]) return stripXmlText(m[1]);
  }
  return undefined;
}

function stripXmlText(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function parseManifest(opf: string): Map<string, ManifestItem> {
  const map = new Map<string, ManifestItem>();
  const itemRe = /<item\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(opf))) {
    const attrs = m[1];
    const id = readAttr(attrs, 'id');
    const href = readAttr(attrs, 'href');
    const mediaType = readAttr(attrs, 'media-type') ?? readAttr(attrs, 'mediaType') ?? '';
    if (id && href) map.set(id, { href, mediaType });
  }
  return map;
}

function parseSpine(opf: string): string[] {
  const spineMatch = opf.match(/<spine\b[^>]*>([\s\S]*?)<\/spine>/i);
  if (!spineMatch) return [];
  const ids: string[] = [];
  const itemrefRe = /<itemref\b[^>]*\bidref=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = itemrefRe.exec(spineMatch[1]))) {
    ids.push(m[1]);
  }
  return ids;
}

function readAttr(attrs: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  return attrs.match(re)?.[1];
}

function isChapterMediaType(mediaType: string): boolean {
  return (
    mediaType.includes('html') ||
    mediaType.includes('xml') ||
    mediaType === 'text/x-oeb1-document'
  );
}

function extractChapterTitle(html: string): string | undefined {
  const title = firstTagText(html, 'title') ?? firstTagText(html, 'h1');
  return title ? stripXmlText(title) : undefined;
}

function sanitizeEpubHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
}
