import type { ParsedBook } from '@novel-reader/shared';
import JSZip from 'jszip';

import { isZipArchive, type FileBuffer } from './detect';

type ManifestItem = { href: string; mediaType: string };

export async function parseEpub(buffer: FileBuffer): Promise<ParsedBook> {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  assertEpubZipBuffer(b);

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(b);
  } catch {
    throw new Error('EPUB 压缩包损坏或无法解压，请检查文件完整性后重新上传');
  }

  const paths = listZipPaths(zip);
  if (paths.length === 0) {
    throw new Error('EPUB 压缩包为空');
  }

  if (findZipPath(paths, 'meta-inf/encryption.xml')) {
    throw new Error(
      '该 EPUB 受 DRM 加密保护，无法解析。请使用无加密的 EPUB，或转为 TXT 后上传',
    );
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
  const intro =
    firstTagText(opfXml, 'dc:description') ?? firstTagText(opfXml, 'description');
  const publisher =
    firstTagText(opfXml, 'dc:publisher') ?? firstTagText(opfXml, 'publisher');
  const language =
    firstTagText(opfXml, 'dc:language') ?? firstTagText(opfXml, 'language');

  const manifest = parseManifest(opfXml);
  const spineIds = parseSpine(opfXml);
  const coverUrl = await extractCoverUrl(opfXml, manifest, zip, paths, opfDir);
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
    const sanitized = sanitizeEpubHtml(raw);
    const withImages = await embedEpubAssets(sanitized, zip, chapterPath, opfDir, paths);
    chapters.push({
      index: chapters.length,
      title: chapterTitle,
      content: withImages,
    });
  }

  if (chapters.length === 0) {
    throw new Error('EPUB 未找到可读章节');
  }

  const metadata =
    publisher || language
      ? {
          ...(publisher ? { publisher: stripXmlText(publisher) } : {}),
          ...(language ? { language: stripXmlText(language) } : {}),
        }
      : undefined;

  return {
    meta: {
      title: stripXmlText(title),
      author: stripXmlText(author),
      intro: intro ? stripXmlText(intro) : undefined,
      coverUrl,
      metadata,
    },
    chapters,
  };
}

function assertEpubZipBuffer(b: Buffer): void {
  if (b.length === 0) {
    throw new Error('EPUB 文件为空或上传不完整，请重新上传');
  }

  if (!isZipArchive(b)) {
    const head = b
      .slice(0, Math.min(b.length, 64))
      .toString('utf8')
      .trimStart()
      .toLowerCase();

    if (
      head.startsWith('<!doctype') ||
      head.startsWith('<html') ||
      head.startsWith('<?xml')
    ) {
      throw new Error(
        '该文件内容是 HTML/网页而非 EPUB 压缩包。请改存为 .txt 上传，或从正规渠道下载标准 EPUB',
      );
    }

    if (b[0] === 0x50 && b[1] === 0x4b) {
      throw new Error(
        '无效的 EPUB 文件（ZIP 文件头异常）。文件可能已损坏，请重新下载后上传',
      );
    }

    throw new Error(
      '无效的 EPUB 文件（不是 ZIP 格式）。文件可能损坏、未下载完整，或实为文本/HTML 却使用了 .epub 扩展名',
    );
  }
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
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
};

function guessImageMime(path: string): string {
  const ext = path.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  return IMAGE_MIME[ext] ?? 'image/jpeg';
}

function normalizeAssetPath(src: string): string {
  const trimmed = src.trim();
  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

function resolveAssetZipPath(
  src: string,
  chapterZipPath: string,
  opfDir: string,
  paths: string[],
): string | null {
  const norm = normalizeAssetPath(src);
  const candidates = [
    resolveZipPath(chapterZipPath, norm),
    resolveZipPath(`${opfDir}/placeholder`, norm),
    norm.replace(/^\//, ''),
    norm,
  ];
  for (const candidate of candidates) {
    const found = findZipPath(paths, candidate);
    if (found) return found;
  }
  return null;
}

function extractAssetSrc(attrs: string): string | null {
  const patterns = [
    /\bsrc\s*=\s*(["'])([^"']+)\1/i,
    /\bsrc\s*=\s*([^\s>]+)/i,
    /\bxlink:href\s*=\s*(["'])([^"']+)\1/i,
    /\bhref\s*=\s*(["'])([^"']+)\1/i,
    /\bsrcset\s*=\s*(["'])([^\s"']+)/i,
  ];
  for (const re of patterns) {
    const m = attrs.match(re);
    if (!m) continue;
    const value = m[m.length - 1];
    if (value) return value.split(',')[0]?.trim().split(/\s+/)[0] ?? value;
  }
  return null;
}

async function zipEntryToDataUrl(zip: JSZip, zipPath: string): Promise<string | null> {
  const entry = zip.file(zipPath);
  if (!entry) return null;
  try {
    const base64 = await entry.async('base64');
    const mime = guessImageMime(zipPath);
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

async function embedEpubAssets(
  html: string,
  zip: JSZip,
  chapterZipPath: string,
  opfDir: string,
  paths: string[],
): Promise<string> {
  let result = html;

  const tagPatterns = [
    /<img\b([^>]*?)>/gi,
    /<image\b([^>]*?)>/gi,
  ];

  for (const tagRe of tagPatterns) {
    const tags = [...result.matchAll(tagRe)];
    for (const match of tags) {
      const fullTag = match[0];
      const attrs = match[1] ?? '';
      const src = extractAssetSrc(attrs);
      if (!src || /^(data:|https?:|blob:)/i.test(src)) continue;

      const resolved = resolveAssetZipPath(src, chapterZipPath, opfDir, paths);
      if (!resolved) continue;

      const dataUrl = await zipEntryToDataUrl(zip, resolved);
      if (!dataUrl) continue;

      let newTag = fullTag;
      if (/\bsrc\s*=/i.test(attrs)) {
        newTag = fullTag.replace(/\bsrc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `src="${dataUrl}"`);
      } else if (/\bxlink:href\s*=/i.test(attrs)) {
        newTag = fullTag.replace(
          /\bxlink:href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
          `src="${dataUrl}"`,
        );
      } else if (/\bhref\s*=/i.test(attrs)) {
        newTag = fullTag.replace(/\bhref\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `src="${dataUrl}"`);
      }
      result = result.includes(fullTag) ? result.replace(fullTag, newTag) : result;
    }
  }

  const urlInStyleRe = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
  const styleMatches = [...result.matchAll(urlInStyleRe)];
  for (const match of styleMatches) {
    const full = match[0];
    const src = match[2]?.trim();
    if (!src || /^(data:|https?:|blob:)/i.test(src)) continue;

    const resolved = resolveAssetZipPath(src, chapterZipPath, opfDir, paths);
    if (!resolved) continue;

    const dataUrl = await zipEntryToDataUrl(zip, resolved);
    if (!dataUrl) continue;

    result = result.replace(full, `url("${dataUrl}")`);
  }

  return result;
}

async function extractCoverUrl(
  opfXml: string,
  manifest: Map<string, ManifestItem>,
  zip: JSZip,
  paths: string[],
  opfDir: string,
): Promise<string | undefined> {
  const coverId = findCoverManifestId(opfXml);

  let href: string | undefined;
  if (coverId) {
    const item = manifest.get(coverId);
    href = item?.href;
  }

  if (!href) {
    href = findCoverHrefFromGuide(opfXml) ?? findFirstImageHref(manifest);
  }

  if (!href) return undefined;

  const resolved =
    findZipPath(paths, resolveZipPath(opfDir, href)) ??
    findZipPath(paths, href.replace(/^\//, ''));
  if (!resolved) return undefined;

  return (await zipEntryToDataUrl(zip, resolved)) ?? undefined;
}

function findCoverManifestId(opfXml: string): string | null {
  const metaRe = /<meta\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(opfXml))) {
    const attrs = m[1];
    const name = readAttr(attrs, 'name')?.toLowerCase();
    if (name === 'cover') {
      return readAttr(attrs, 'content') ?? null;
    }
  }

  const itemRe = /<item\b([^>]*)\/?>/gi;
  while ((m = itemRe.exec(opfXml))) {
    const attrs = m[1];
    const props = readAttr(attrs, 'properties') ?? '';
    if (props.includes('cover-image')) {
      return readAttr(attrs, 'id') ?? null;
    }
  }

  return null;
}

function findCoverHrefFromGuide(opfXml: string): string | undefined {
  const guideMatch = opfXml.match(/<guide\b[^>]*>([\s\S]*?)<\/guide>/i);
  if (!guideMatch) return undefined;
  const refRe = /<reference\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = refRe.exec(guideMatch[1]))) {
    const attrs = m[1];
    const type = readAttr(attrs, 'type')?.toLowerCase();
    if (type === 'cover' || type === 'other.ms-coverimage-standard') {
      return readAttr(attrs, 'href');
    }
  }
  return undefined;
}

function findFirstImageHref(manifest: Map<string, ManifestItem>): string | undefined {
  for (const item of manifest.values()) {
    if (item.mediaType.toLowerCase().startsWith('image/')) {
      return item.href;
    }
  }
  return undefined;
}
