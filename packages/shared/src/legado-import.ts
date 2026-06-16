import { legadoSourceSchema } from './schemas';
import type { LegadoBookSource } from './types';
import type { z } from 'zod';

type ParsedSource = z.infer<typeof legadoSourceSchema>;

export interface LegadoImportSkipped {
  name: string;
  reason: string;
}

export interface LegadoImportResult {
  sources: ParsedSource[];
  skipped: LegadoImportSkipped[];
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function inferBookSourceUrl(source: Record<string, unknown>): string | undefined {
  const hay = [source.bookUrlPattern, source.searchUrl, source.exploreUrl, source.header]
    .filter((v): v is string => typeof v === 'string')
    .join(' ');
  const match = hay.match(/https?:\/\/[^\s"'`]+/i);
  if (!match) return undefined;
  try {
    const u = new URL(match[0]);
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}

function normalizeRuleRecord(rule: unknown): Record<string, string> | undefined {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(rule as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'string' ? value : String(value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 兼容 Legado 社区书源包中的常见非标准字段 */
export function normalizeLegadoSource(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const source = { ...(raw as Record<string, unknown>) };

  for (const key of ['ruleExplore', 'ruleReview', 'ruleBookInfo'] as const) {
    if (Array.isArray(source[key])) delete source[key];
  }

  if (typeof source.bookSourceUrl === 'string' && !isHttpUrl(source.bookSourceUrl)) {
    const inferred = inferBookSourceUrl(source);
    if (inferred) source.bookSourceUrl = inferred;
  }

  for (const key of ['ruleSearch', 'ruleToc', 'ruleContent', 'ruleBookInfo', 'ruleExplore', 'ruleReview'] as const) {
    if (source[key] !== undefined) {
      const normalized = normalizeRuleRecord(source[key]);
      if (normalized) source[key] = normalized;
      else delete source[key];
    }
  }

  return source;
}

export function parseLegadoImportPayload(data: unknown): LegadoImportResult {
  const list = Array.isArray(data) ? data : data && typeof data === 'object' ? [data] : [];
  const sources: ParsedSource[] = [];
  const skipped: LegadoImportSkipped[] = [];

  for (const item of list) {
    const normalized = normalizeLegadoSource(item);
    const name =
      normalized && typeof normalized === 'object' && 'bookSourceName' in normalized
        ? String((normalized as LegadoBookSource).bookSourceName)
        : '未知书源';
    const result = legadoSourceSchema.safeParse(normalized);
    if (result.success) {
      sources.push(result.data);
    } else {
      skipped.push({
        name,
        reason: result.error.issues[0]?.message ?? '格式错误',
      });
    }
  }

  return { sources, skipped };
}
