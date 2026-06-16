import { scoreCjkText } from '@novel-reader/shared';

const BROWSER_ENCODINGS = ['utf-8', 'gb18030', 'gbk'] as const;

function stripUtf8Bom(buffer: Uint8Array): Uint8Array {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3);
  }
  return buffer;
}

function decodeWithEncoding(buffer: Uint8Array, encoding: string): string {
  const data = encoding === 'utf-8' ? stripUtf8Bom(buffer) : buffer;
  return new TextDecoder(encoding).decode(data);
}

/** Browser-side TXT decode with multi-encoding scoring (UTF-8 / GB18030 / GBK). */
export function decodeTxtBytes(buffer: Uint8Array): string {
  let best = '';
  let bestScore = -Infinity;

  for (const encoding of BROWSER_ENCODINGS) {
    try {
      const text = decodeWithEncoding(buffer, encoding);
      const score = scoreCjkText(text);
      if (score > bestScore) {
        bestScore = score;
        best = text;
      }
    } catch {
      // encoding not supported in this browser
    }
  }

  if (!best) {
    best = new TextDecoder().decode(buffer);
  }

  return best.replace(/\r\n/g, '\n').trim();
}
