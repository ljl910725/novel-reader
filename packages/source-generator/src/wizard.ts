import { fetchPage } from '@novel-reader/book-engine';
import type { LegadoBookSource, WizardAnalyzeResult, WizardProbeResult } from '@novel-reader/shared';
import * as cheerio from 'cheerio';

export async function probeSite(siteUrl: string): Promise<WizardProbeResult> {
  const normalized = siteUrl.replace(/\/$/, '');
  const html = await fetchPage(normalized);
  const $ = cheerio.load(html);

  const searchInput = $('input[type="search"], input[name*="search"], input[name*="key"], input#search, input.search').first();
  const searchForm = searchInput.closest('form');
  let suggestedSearchUrl: string | undefined;
  let searchInputSelector: string | undefined;

  if (searchInput.length) {
    const name = searchInput.attr('name') ?? 'q';
    searchInputSelector = getSelector($, searchInput.get(0)!);
    if (searchForm.length) {
      const action = searchForm.attr('action') ?? '/search';
      const method = (searchForm.attr('method') ?? 'get').toLowerCase();
      if (method === 'get') {
        suggestedSearchUrl = `${action}?${name}={{key}}`;
      } else {
        suggestedSearchUrl = `${action},{"method":"POST","body":"${name}={{key}}"}`;
      }
    } else {
      suggestedSearchUrl = `/search?${name}={{key}}`;
    }
  }

  return {
    siteUrl: normalized,
    hasSearch: searchInput.length > 0,
    suggestedSearchUrl,
    searchInputSelector,
    message: searchInput.length
      ? '已检测到搜索框，请继续分析搜索页'
      : '未检测到搜索框，请手动填写 searchUrl',
  };
}

export async function analyzeSearchPage(
  siteUrl: string,
  searchUrl: string,
  keyword: string,
): Promise<WizardAnalyzeResult> {
  const url = searchUrl
    .replace('{{key}}', encodeURIComponent(keyword))
    .replace('{{page}}', '1');
  const fullUrl = url.startsWith('http') ? url : `${siteUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  const html = await fetchPage(fullUrl);
  const $ = cheerio.load(html);
  const rules = recommendListRules($);

  const preview: unknown[] = [];
  if (rules.bookList) {
    $(rules.bookList).slice(0, 3).each((_, el) => {
      const item = $(el);
      preview.push({
        name: rules.name ? item.find(rules.name.split('@')[0]).text().trim() : '',
        url: rules.bookUrl ? item.find(rules.bookUrl.split('@')[0]).attr('href') : '',
      });
    });
  }

  return {
    rules,
    preview,
    message: preview.length ? `找到 ${preview.length} 条预览结果` : '未能识别列表，请手动调整选择器',
  };
}

export async function analyzeTocPage(tocUrl: string): Promise<WizardAnalyzeResult> {
  const html = await fetchPage(tocUrl);
  const $ = cheerio.load(html);
  const rules = recommendChapterRules($);
  const preview: unknown[] = [];
  if (rules.chapterList) {
    $(rules.chapterList).slice(0, 5).each((_, el) => {
      const item = $(el);
      preview.push({
        title: rules.chapterName ? item.find(rules.chapterName.split('@')[0]).text().trim() : item.text().trim(),
        url: rules.chapterUrl ? item.find(rules.chapterUrl.split('@')[0]).attr('href') : '',
      });
    });
  }
  return {
    rules,
    preview,
    message: preview.length ? `识别到 ${preview.length} 个章节预览` : '未能识别目录，请手动调整',
  };
}

export async function analyzeContentPage(contentUrl: string): Promise<WizardAnalyzeResult> {
  const html = await fetchPage(contentUrl);
  const $ = cheerio.load(html);
  const candidates = ['#content', '.content', '#chapter-content', '.chapter-content', 'article', 'main'];
  let content = '#content@html';
  for (const sel of candidates) {
    if ($(sel).length && $(sel).text().trim().length > 100) {
      content = `${sel}@html`;
      break;
    }
  }
  const text = $(content.split('@')[0]).text().trim().slice(0, 200);
  return {
    rules: { content },
    preview: [{ snippet: text }],
    message: text.length > 50 ? '正文区域识别成功' : '正文内容较短，请检查选择器',
  };
}

export function buildLegadoSource(
  siteUrl: string,
  name: string,
  searchUrl: string,
  ruleSearch: Record<string, string>,
  ruleToc: Record<string, string>,
  ruleContent: Record<string, string>,
): LegadoBookSource {
  return {
    bookSourceUrl: siteUrl.replace(/\/$/, ''),
    bookSourceName: name,
    bookSourceGroup: '自定义',
    enabled: true,
    searchUrl,
    ruleSearch: {
      bookList: ruleSearch.bookList ?? '.item',
      name: ruleSearch.name ?? '.title@text',
      author: ruleSearch.author ?? '',
      bookUrl: ruleSearch.bookUrl ?? 'a@href',
      kind: '',
      wordCount: '',
      lastChapter: '',
      intro: '',
      coverUrl: '',
    },
    ruleToc: {
      chapterList: ruleToc.chapterList ?? 'a',
      chapterName: ruleToc.chapterName ?? '@text',
      chapterUrl: ruleToc.chapterUrl ?? '@href',
    },
    ruleContent: {
      content: ruleContent.content ?? '#content@html',
    },
  };
}

function recommendListRules($: cheerio.CheerioAPI): Record<string, string> {
  const repeated = findRepeatedSelector($);
  return {
    bookList: repeated.list,
    name: `${repeated.item} a@text, ${repeated.item} .title@text`,
    author: `${repeated.item} .author@text`,
    bookUrl: `${repeated.item} a@href`,
  };
}

function recommendChapterRules($: cheerio.CheerioAPI): Record<string, string> {
  const linkContainers = ['#list dd', '#chapter-list a', '.chapter-list a', '#catalog a', 'ul li a'];
  for (const sel of linkContainers) {
    if ($(sel).length >= 3) {
      const parent = sel.includes(' ') ? sel.split(' ')[0] : 'body';
      return {
        chapterList: sel,
        chapterName: '@text',
        chapterUrl: '@href',
      };
    }
  }
  return { chapterList: 'a', chapterName: '@text', chapterUrl: '@href' };
}

function findRepeatedSelector($: cheerio.CheerioAPI) {
  const candidates = ['.book-item', '.item', '.book', 'li', '.result'];
  for (const sel of candidates) {
    if ($(sel).length >= 2) {
      return { list: sel, item: sel };
    }
  }
  return { list: 'div', item: 'div' };
}

function getSelector($: cheerio.CheerioAPI, el: Parameters<typeof $>[0]): string {
  const node = $(el);
  const tag = (el as { tagName?: string }).tagName ?? 'input';
  const id = node.attr('id');
  if (id) return `#${id}`;
  const cls = node.attr('class');
  if (cls) return `${tag}.${cls.split(' ')[0]}`;
  return tag;
}
