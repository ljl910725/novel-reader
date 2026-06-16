import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseEpub } from './epub-parser';

async function buildEpub(files: Record<string, string>): Promise<Buffer> {
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
});
