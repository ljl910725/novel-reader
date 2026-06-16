import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseEpub } from './epub-parser';

async function buildEpub(files: Record<string, string | Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const baseOpf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>测试书名</dc:title>
    <dc:creator>测试作者</dc:creator>
  </metadata>
  <manifest>
    <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`;

describe('parseEpub', () => {
  it('parses EPUB from buffer without temp files', async () => {
    const buffer = await buildEpub({
      mimetype: 'application/epub+zip',
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'content.opf': baseOpf,
      'ch1.xhtml':
        '<?xml version="1.0"?><html><head><title>第一章</title></head><body><p>第一段</p></body></html>',
      'ch2.xhtml':
        '<?xml version="1.0"?><html><head><title>第二章</title></head><body><p>第二段</p></body></html>',
    });

    const result = await parseEpub(buffer);
    expect(result.meta.title).toBe('测试书名');
    expect(result.meta.author).toBe('测试作者');
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]?.title).toBe('第一章');
    expect(result.chapters[0]?.content).toContain('第一段');
  });

  it('supports OEBPS subdirectory layout', async () => {
    const buffer = await buildEpub({
      mimetype: 'application/epub+zip',
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'OEBPS/content.opf': baseOpf.replace('ch1.xhtml', 'Text/ch1.xhtml').replace('ch2.xhtml', 'Text/ch2.xhtml'),
      'OEBPS/Text/ch1.xhtml':
        '<?xml version="1.0"?><html><head><title>序章</title></head><body><p>内容</p></body></html>',
      'OEBPS/Text/ch2.xhtml':
        '<?xml version="1.0"?><html><head><title>正文</title></head><body><p>更多</p></body></html>',
    });

    const result = await parseEpub(buffer);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]?.title).toBe('序章');
  });

  it('rejects invalid zip buffers', async () => {
    await expect(parseEpub(Buffer.from('not-a-zip', 'utf-8'))).rejects.toThrow(/ZIP/);
  });

  it('rejects HTML disguised as EPUB with a clear message', async () => {
    const html = Buffer.from('<!DOCTYPE html><html><body>章节</body></html>', 'utf-8');
    await expect(parseEpub(html)).rejects.toThrow(/HTML/);
  });

  it('rejects empty buffers', async () => {
    await expect(parseEpub(Buffer.alloc(0))).rejects.toThrow(/空/);
  });

  it('accepts minimal valid EPUB zip buffer (PK\\x03\\x04)', async () => {
    const buffer = await buildEpub({
      mimetype: 'application/epub+zip',
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'content.opf': baseOpf,
      'ch1.xhtml':
        '<?xml version="1.0"?><html><head><title>第一章</title></head><body><p>第一段</p></body></html>',
      'ch2.xhtml':
        '<?xml version="1.0"?><html><head><title>第二章</title></head><body><p>第二段</p></body></html>',
    });

    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer[2]).toBe(0x03);
    expect(buffer[3]).toBe(0x04);

    const result = await parseEpub(buffer);
    expect(result.chapters).toHaveLength(2);
  });

  it('rejects DRM-encrypted EPUB', async () => {
    const buffer = await buildEpub({
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'META-INF/encryption.xml': '<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"/>',
      'content.opf': baseOpf,
      'ch1.xhtml': '<html><body><p>x</p></body></html>',
      'ch2.xhtml': '<html><body><p>y</p></body></html>',
    });

    await expect(parseEpub(buffer)).rejects.toThrow(/DRM/);
  });

  it('embeds relative images as base64 data URLs', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buffer = await buildEpub({
      mimetype: 'application/epub+zip',
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'content.opf': baseOpf.replace(
        '</manifest>',
        '<item id="img1" href="images/pixel.png" media-type="image/png"/></manifest>',
      ),
      'ch1.xhtml': `<?xml version="1.0"?><html><body><p>插图</p><img src="images/pixel.png" alt="pixel"/></body></html>`,
      'ch2.xhtml': '<?xml version="1.0"?><html><body><p>第二段</p></body></html>',
      'images/pixel.png': Buffer.from(pngBase64, 'base64'),
    });

    const result = await parseEpub(buffer);
    expect(result.chapters[0]?.content).toContain('data:image/png;base64,');
    expect(result.chapters[0]?.content).toContain(pngBase64);
  });

  it('embeds images referenced with xlink:href', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buffer = await buildEpub({
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'content.opf': baseOpf.replace(
        '</manifest>',
        '<item id="img1" href="images/pixel.png" media-type="image/png"/></manifest>',
      ),
      'ch1.xhtml': `<?xml version="1.0"?><html xmlns:xlink="http://www.w3.org/1999/xlink"><body><image xlink:href="images/pixel.png"/></body></html>`,
      'ch2.xhtml': '<?xml version="1.0"?><html><body><p>第二段</p></body></html>',
      'images/pixel.png': Buffer.from(pngBase64, 'base64'),
    });

    const result = await parseEpub(buffer);
    expect(result.chapters[0]?.content).toContain('data:image/png;base64,');
  });

  it('resolves absolute image paths from epub root', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buffer = await buildEpub({
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'OEBPS/content.opf': baseOpf
        .replace('ch1.xhtml', 'Text/ch1.xhtml')
        .replace('ch2.xhtml', 'Text/ch2.xhtml')
        .replace(
          '</manifest>',
          '<item id="img1" href="Images/pixel.png" media-type="image/png"/></manifest>',
        ),
      'OEBPS/Text/ch1.xhtml': `<?xml version="1.0"?><html><body><img src="/OEBPS/Images/pixel.png"/></body></html>`,
      'OEBPS/Text/ch2.xhtml': '<?xml version="1.0"?><html><body><p>y</p></body></html>',
      'OEBPS/Images/pixel.png': Buffer.from(pngBase64, 'base64'),
    });

    const result = await parseEpub(buffer);
    expect(result.chapters[0]?.content).toContain('data:image/png;base64,');
  });

  it('extracts cover and metadata from opf', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>封面书</dc:title>
    <dc:creator>作者甲</dc:creator>
    <dc:description>这是一本测试书的简介。</dc:description>
    <dc:publisher>测试出版社</dc:publisher>
    <dc:language>zh-CN</dc:language>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="cover-img" href="cover.png" media-type="image/png"/>
    <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c1"/></spine>
</package>`;
    const buffer = await buildEpub({
      'META-INF/container.xml': `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'content.opf': opf,
      'ch1.xhtml': '<?xml version="1.0"?><html><body><p>正文</p></body></html>',
      'cover.png': Buffer.from(pngBase64, 'base64'),
    });

    const result = await parseEpub(buffer);
    expect(result.meta.title).toBe('封面书');
    expect(result.meta.intro).toBe('这是一本测试书的简介。');
    expect(result.meta.coverUrl).toContain('data:image/png;base64,');
    expect(result.meta.metadata?.publisher).toBe('测试出版社');
    expect(result.meta.metadata?.language).toBe('zh-CN');
  });
});
