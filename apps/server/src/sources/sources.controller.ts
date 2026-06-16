import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { SourcesService } from './sources.service';

@Controller('sources')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SourcesController {
  constructor(private sources: SourcesService) {}

  @Post('import')
  @RequirePermission('importSources')
  import(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    return this.sources.importSources(userId, body);
  }

  @Post('import-url')
  @RequirePermission('importSources')
  importUrl(@CurrentUser('sub') userId: string, @Body('url') url: string) {
    return this.sources.importFromUrl(userId, url);
  }

  @Get()
  @RequirePermission('importSources')
  list(@CurrentUser('sub') userId: string) {
    return this.sources.list(userId);
  }

  @Patch(':id')
  @RequirePermission('importSources')
  update(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.sources.update(userId, id, body as Parameters<SourcesService['update']>[2]);
  }

  @Post('test-batch')
  @RequirePermission('searchBooks')
  testBatch(@CurrentUser('sub') userId: string, @Body() body: { ids: string[]; q?: string }) {
    return this.sources.testBatch(userId, body.ids ?? [], body.q);
  }

  @Delete('batch')
  @RequirePermission('importSources')
  removeBatch(@CurrentUser('sub') userId: string, @Body() body: { ids: string[] }) {
    return this.sources.removeBatch(userId, body.ids ?? []);
  }

  @Delete(':id')
  @RequirePermission('importSources')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.sources.remove(userId, id);
  }

  @Post(':id/test')
  @RequirePermission('searchBooks')
  test(@CurrentUser('sub') userId: string, @Param('id') id: string, @Query('q') q?: string) {
    return this.sources.test(userId, id, q);
  }

  @Post(':id/debug')
  @RequirePermission('importSources')
  debug(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { keyword: string; bookUrl?: string; chapterUrl?: string },
  ) {
    return this.sources.debug(userId, id, body.keyword, body.bookUrl, body.chapterUrl);
  }
}
