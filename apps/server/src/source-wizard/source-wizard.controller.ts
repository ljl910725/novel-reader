import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { SourceWizardService } from './source-wizard.service';

@Controller('source-wizard')
export class SourceWizardController {
  constructor(private wizard: SourceWizardService) {}

  @Post('probe')
  @UseGuards(PermissionGuard)
  @RequirePermission('sourceWizard')
  probe(@Body('siteUrl') siteUrl: string) {
    return this.wizard.probe(siteUrl);
  }

  @Post('analyze-search')
  @UseGuards(PermissionGuard)
  @RequirePermission('sourceWizard')
  analyzeSearch(@Body() body: { siteUrl: string; searchUrl: string; keyword: string }) {
    return this.wizard.analyzeSearch(body.siteUrl, body.searchUrl, body.keyword);
  }

  @Post('analyze-toc')
  @UseGuards(PermissionGuard)
  @RequirePermission('sourceWizard')
  analyzeToc(@Body('tocUrl') tocUrl: string) {
    return this.wizard.analyzeToc(tocUrl);
  }

  @Post('analyze-content')
  @UseGuards(PermissionGuard)
  @RequirePermission('sourceWizard')
  analyzeContent(@Body('contentUrl') contentUrl: string) {
    return this.wizard.analyzeContent(contentUrl);
  }

  @Post('save')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('importSources')
  save(@CurrentUser('sub') userId: string, @Body() body: Record<string, unknown>) {
    return this.wizard.save(userId, body as Parameters<SourceWizardService['save']>[1]);
  }
}
