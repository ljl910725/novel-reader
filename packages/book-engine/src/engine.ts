import type { LegadoBookSource, SearchResult } from '@novel-reader/shared';
import { applyTemplate, buildUrl, fetchPage } from './fetcher';
import { parseRule, resolveUrl, sanitizeHtml } from './parser';

export interface ChapterItem {
  title: string;
  url: string;
  index: number;
}

export class BookEngine {
  constructor(private source: LegadoBookSource) {}

  async search(keyword: string, page = 1): Promise<SearchResult[]> {
    const searchPath = applyTemplate(this.source.searchUrl, { key: keyword, page: String(page) });
    const url = buildUrl(this.source.bookSourceUrl, searchPath);
    const html = await fetchPage(url, this.parseFetchOptions(this.source.searchUrl));
    const bookListRule = this.source.ruleSearch.bookList;
    const names = parseRule(html, this.source.ruleSearch.name, url);
    const authors = this.source.ruleSearch.author
      ? parseRule(html, this.source.ruleSearch.author, url)
      : [];
    const bookUrls = parseRule(html, this.source.ruleSearch.bookUrl, url);

    const nameArr = Array.isArray(names) ? names : [names];
    const authorArr = Array.isArray(authors) ? authors : [authors];
    const urlArr = Array.isArray(bookUrls) ? bookUrls : [bookUrls];

    const $ = await import('cheerio').then((m) => m.load(html));
    const items = $(bookListRule);
    const results: SearchResult[] = [];

    items.each((i, el) => {
      const itemHtml = $.html(el);
      const name = String(parseRule(itemHtml, this.source.ruleSearch.name, url) || nameArr[i] || '');
      const author = this.source.ruleSearch.author
        ? String(parseRule(itemHtml, this.source.ruleSearch.author, url) || authorArr[i] || '')
        : '';
      const bookUrl = String(
        parseRule(itemHtml, this.source.ruleSearch.bookUrl, url) || urlArr[i] || '',
      );
      if (name && bookUrl) {
        results.push({
          name,
          author,
          bookUrl,
          sourceId: this.source.bookSourceUrl,
          sourceName: this.source.bookSourceName,
        });
      }
    });

    return results;
  }

  async getBookInfo(bookUrl: string) {
    const url = resolveUrl(this.source.bookSourceUrl, bookUrl);
    const html = await fetchPage(url);
    const rules = this.source.ruleBookInfo ?? {};
    return {
      name: rules.name ? String(parseRule(html, rules.name, url)) : '',
      author: rules.author ? String(parseRule(html, rules.author, url)) : '',
      intro: rules.intro ? String(parseRule(html, rules.intro, url)) : '',
      coverUrl: rules.coverUrl ? String(parseRule(html, rules.coverUrl, url)) : '',
      bookUrl: url,
    };
  }

  async getToc(bookUrl: string): Promise<ChapterItem[]> {
    const url = resolveUrl(this.source.bookSourceUrl, bookUrl);
    const html = await fetchPage(url);
    const listHtml = String(parseRule(html, this.source.ruleToc.chapterList, url));
    const $ = await import('cheerio').then((m) => m.load(listHtml.includes('<') ? listHtml : html));
    const container = listHtml.includes('<')
      ? $('body').children()
      : $(this.source.ruleToc.chapterList);

    const chapters: ChapterItem[] = [];
    container.each((i, el) => {
      const itemHtml = $.html(el);
      const title = String(parseRule(itemHtml, this.source.ruleToc.chapterName, url));
      const chapterUrl = String(parseRule(itemHtml, this.source.ruleToc.chapterUrl, url));
      if (title && chapterUrl) {
        chapters.push({ title, url: resolveUrl(url, chapterUrl), index: i });
      }
    });
    return chapters;
  }

  async getContent(chapterUrl: string): Promise<string> {
    const url = resolveUrl(this.source.bookSourceUrl, chapterUrl);
    const html = await fetchPage(url);
    let content = String(parseRule(html, this.source.ruleContent.content, url));
    if (this.source.ruleContent.replaceRegex) {
      content = content.replace(new RegExp(this.source.ruleContent.replaceRegex, 'g'), '');
    }
    return sanitizeHtml(content);
  }

  async debug(keyword: string, bookUrl?: string, chapterUrl?: string) {
    const steps = [];
    try {
      const searchUrl = buildUrl(
        this.source.bookSourceUrl,
        applyTemplate(this.source.searchUrl, { key: keyword, page: '1' }),
      );
      const searchHtml = await fetchPage(searchUrl);
      const searchResults = await this.search(keyword);
      steps.push({
        step: 'search' as const,
        success: searchResults.length > 0,
        requestUrl: searchUrl,
        htmlSnippet: searchHtml.slice(0, 500),
        parsed: searchResults.slice(0, 3),
        suggestion: searchResults.length === 0 ? '?? ruleSearch ? bookList?name?bookUrl ??' : undefined,
      });

      const targetBookUrl = bookUrl ?? searchResults[0]?.bookUrl;
      if (targetBookUrl) {
        const info = await this.getBookInfo(targetBookUrl);
        steps.push({
          step: 'bookInfo' as const,
          success: !!info.name,
          requestUrl: resolveUrl(this.source.bookSourceUrl, targetBookUrl),
          parsed: info,
          suggestion: !info.name ? '?? ruleBookInfo ??' : undefined,
        });

        const toc = await this.getToc(targetBookUrl);
        steps.push({
          step: 'toc' as const,
          success: toc.length > 0,
          parsed: toc.slice(0, 5),
          suggestion: toc.length === 0 ? '?? ruleToc ? chapterList?chapterName?chapterUrl' : undefined,
        });

        const targetChapter = chapterUrl ?? toc[0]?.url;
        if (targetChapter) {
          const content = await this.getContent(targetChapter);
          steps.push({
            step: 'content' as const,
            success: content.length > 50,
            requestUrl: resolveUrl(this.source.bookSourceUrl, targetChapter),
            htmlSnippet: content.slice(0, 300),
            parsed: { length: content.length },
            suggestion: content.length <= 50 ? '?? ruleContent ? content ???' : undefined,
          });
        }
      }
    } catch (e) {
      steps.push({
        step: 'search' as const,
        success: false,
        error: e instanceof Error ? e.message : '????',
        suggestion: '???? URL ????????????',
      });
    }
    return steps;
  }

  private parseFetchOptions(searchUrl: string) {
    if (!searchUrl.includes(',{')) return {};
    try {
      const jsonPart = searchUrl.slice(searchUrl.indexOf(',{') + 1);
      const opts = JSON.parse(jsonPart);
      return {
        method: opts.method,
        body: opts.body?.replace('{{key}}', '') as string | undefined,
        charset: opts.charset,
      };
    } catch {
      return {};
    }
  }
}
