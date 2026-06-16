import { describe, expect, it } from 'vitest';
import { decodeMulterFilename, sanitizeDisplayFilename } from './filename';

describe('decodeMulterFilename', () => {
  it('decodes UTF-8 Chinese filenames from latin1 multer encoding', () => {
    const utf8Name = '修仙小说.epub';
    const latin1 = Buffer.from(utf8Name, 'utf-8').toString('latin1');
    expect(decodeMulterFilename(latin1)).toBe(utf8Name);
  });

  it('leaves ASCII filenames unchanged', () => {
    expect(decodeMulterFilename('book.epub')).toBe('book.epub');
  });
});

describe('sanitizeDisplayFilename', () => {
  it('strips path separators and control characters', () => {
    expect(sanitizeDisplayFilename('bad\\name:.epub')).toBe('bad_name_.epub');
  });

  it('falls back for empty names', () => {
    expect(sanitizeDisplayFilename('   ')).toBe('未知文件');
  });
});
