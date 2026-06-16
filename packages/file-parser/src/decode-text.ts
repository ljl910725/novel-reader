import { scoreCjkText } from '@novel-reader/shared';
import iconv from 'iconv-lite';
import type { FileBuffer } from './detect';

export { scoreCjkText };

const TXT_ENCODINGS = ['utf-8', 'gb18030', 'gbk', 'big5'] as const;

function toBuffer(buffer: FileBuffer): Buffer {
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function decodeWithEncoding(raw: Buffer, encoding: (typeof TXT_ENCODINGS)[number]): string {
  if (encoding === 'utf-8') {
    return raw.toString('utf-8');
  }
  return iconv.decode(raw, encoding);
}

/**
 * Decode TXT bytes with UTF-8 / GB18030 / GBK / Big5 detection for Chinese novels.
 */
export function decodeTxtBuffer(buffer: FileBuffer): string {
  const b = toBuffer(buffer);
  let start = 0;
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    start = 3;
  }
  const raw = start > 0 ? b.subarray(start) : b;

  let best = '';
  let bestScore = -Infinity;

  for (const encoding of TXT_ENCODINGS) {
    try {
      const text = decodeWithEncoding(raw, encoding);
      const score = scoreCjkText(text);
      if (score > bestScore) {
        bestScore = score;
        best = text;
      }
    } catch {
      // try next encoding
    }
  }

  if (!best) {
    best = raw.toString('utf-8');
  }

  return best.replace(/\r\n/g, '\n').trim();
}
