import iconv from 'iconv-lite';

export interface FetchOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  charset?: string;
  timeout?: number;
}

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function fetchPage(url: string, options: FetchOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 15000);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'text/html,application/json,*/*',
        ...options.headers,
      },
      body: options.body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const charset = options.charset?.toLowerCase() ?? 'utf-8';

    if (charset === 'gbk' || charset === 'gb2312') {
      return iconv.decode(buffer, 'gbk');
    }
    return buffer.toString('utf-8');
  } finally {
    clearTimeout(timeout);
  }
}

export function buildUrl(base: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
  return new URL(path.replace(/^\//, ''), baseUrl).toString();
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => encodeURIComponent(vars[key] ?? ''));
}
