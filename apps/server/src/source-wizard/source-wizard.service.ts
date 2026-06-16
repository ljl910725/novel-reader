import { Injectable } from '@nestjs/common';
import {
  analyzeContentPage,
  analyzeSearchPage,
  analyzeTocPage,
  buildLegadoSource,
  probeSite,
} from '@novel-reader/source-generator';
import { SourcesService } from '../sources/sources.service';

@Injectable()
export class SourceWizardService {
  constructor(private sources: SourcesService) {}

  probe(siteUrl: string) {
    return probeSite(siteUrl);
  }

  analyzeSearch(siteUrl: string, searchUrl: string, keyword: string) {
    return analyzeSearchPage(siteUrl, searchUrl, keyword);
  }

  analyzeToc(tocUrl: string) {
    return analyzeTocPage(tocUrl);
  }

  analyzeContent(contentUrl: string) {
    return analyzeContentPage(contentUrl);
  }

  async save(
    userId: string,
    payload: {
      siteUrl: string;
      name: string;
      searchUrl: string;
      ruleSearch: Record<string, string>;
      ruleToc: Record<string, string>;
      ruleContent: Record<string, string>;
    },
  ) {
    const source = buildLegadoSource(
      payload.siteUrl,
      payload.name,
      payload.searchUrl,
      payload.ruleSearch,
      payload.ruleToc,
      payload.ruleContent,
    );
    const { created } = await this.sources.importSources(userId, [source]);
    return created[0];
  }
}
