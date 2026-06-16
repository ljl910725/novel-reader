/**
 * Multer/busboy decode multipart filenames as latin1; browsers send UTF-8 bytes.
 */
export function decodeMulterFilename(name: string): string {
  if (!name) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  if (decoded.includes('\uFFFD')) return name;
  return decoded;
}

export function sanitizeDisplayFilename(name: string): string {
  const cleaned = name
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
  return cleaned || '未知文件';
}
