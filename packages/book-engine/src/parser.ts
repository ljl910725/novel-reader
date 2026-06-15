import * as cheerio from 'cheerio';
import { JSONPath } from 'jsonpath-plus';

export function applyRegexClean(text: string, rule?: string): string {
  if (!rule || !rule.includes('##')) {
    return text;
  }
  const parts = rule.split('##').filter(Boolean);
  let result = text;
  for (let i = 0; i < parts.length - 1; i += 2) {
    try {
      const pattern = new RegExp(parts[i], 'g');
      result = result.replace(pattern, parts[i + 1] ?? '');
    } catch {
      // ignore invalid regex
    }
  }
  return result;
}

export function parseRule(
  content: string,
  rule: string,
  baseUrl?: string,
): string | string[] {
  if (!rule) return '';

  if (rule.startsWith('$.') || rule.startsWith('$[')) {
    try {
      const json = JSON.parse(content);
      const result = JSONPath({ path: rule, json });
      return Array.isArray(result) ? result.map(String) : String(result ?? '');
    } catch {
      return '';
    }
  }

  const $ = cheerio.load(content);
  const [selector, ...attrs] = rule.split('@');
  const elements = $(selector.trim());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extract = (el: cheerio.Cheerio<any>): string => {
    if (attrs.length === 0) return el.text().trim();
    const attr = attrs.join('@');
    if (attr === 'text') return applyRegexClean(el.text().trim(), rule.includes('##') ? rule.split('@').pop() : undefined);
    if (attr === 'html') return el.html() ?? '';
    const val = el.attr(attr) ?? el.prop(attr) ?? '';
    return String(val).trim();
  };

  if (elements.length === 1) {
    let val = extract(elements.first());
    if (baseUrl && attrs.includes('href')) {
      val = resolveUrl(baseUrl, val);
    }
    return applyRegexClean(val, rule);
  }

  const results: string[] = [];
  elements.each((_, el) => {
    let val = extract($(el));
    if (baseUrl && rule.includes('@href')) {
      val = resolveUrl(baseUrl, val);
    }
    results.push(applyRegexClean(val, rule));
  });
  return results;
}

export function resolveUrl(base: string, path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

export function sanitizeHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, iframe, object').remove();
  $('*').each((_, el) => {
    const attribs = (el as { attribs?: Record<string, string> }).attribs ?? {};
    for (const key of Object.keys(attribs)) {
      if (key.startsWith('on')) {
        $(el).removeAttr(key);
      }
    }
  });
  return $.html() ?? html;
}
