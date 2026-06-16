import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { detectFormat, isZipArchive } from './detect';

async function minimalEpubBuffer(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );
  zip.file(
    'content.opf',
    `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">t</dc:title></metadata>
  <manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest>
  <spine><itemref idref="c1"/></spine>
</package>`,
  );
  zip.file('ch1.xhtml', '<html><body><p>x</p></body></html>');
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

describe('isZipArchive', () => {
  it('accepts PK\\x03\\x04 local file header', () => {
    expect(isZipArchive(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe(true);
  });

  it('rejects PK without valid third/fourth bytes', async () => {
    const epub = await minimalEpubBuffer();
    const fake = Buffer.concat([Buffer.from([0x50, 0x4b, 0x00, 0x00]), epub.slice(4)]);
    expect(isZipArchive(fake)).toBe(false);
  });

  it('rejects plain text', () => {
    expect(isZipArchive(Buffer.from('第一章 正文', 'utf-8'))).toBe(false);
  });
});

describe('detectFormat', () => {
  it('detects real EPUB zip by magic bytes', async () => {
    const buffer = await minimalEpubBuffer();
    expect(detectFormat('book.epub', buffer)).toBe('EPUB');
    expect(detectFormat('renamed.zip', buffer)).toBe('EPUB');
  });

  it('detects TXT by extension', () => {
    expect(detectFormat('novel.txt', Buffer.from('第一章\n内容'))).toBe('TXT');
  });

  it('treats HTML saved as .epub as TXT', () => {
    const html = Buffer.from('<!DOCTYPE html><html><body>章节</body></html>', 'utf-8');
    expect(detectFormat('fake.epub', html)).toBe('TXT');
  });

  it('keeps corrupt .epub on EPUB path for a clear parse error', () => {
    const corrupt = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectFormat('broken.epub', corrupt)).toBe('EPUB');
  });

  it('defaults unknown extension to TXT', () => {
    expect(detectFormat('novel', Buffer.from('正文'))).toBe('TXT');
  });
});
