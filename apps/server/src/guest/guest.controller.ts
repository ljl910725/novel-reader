import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { GuestService } from './guest.service';

@Controller('guest')
@UseGuards(PermissionGuard)
export class GuestController {
  constructor(private guest: GuestService) {}

  @Post('search')
  @RequirePermission('searchBooks')
  search(@Body() body: { q: string; sources: unknown }) {
    return this.guest.search(body.q, body.sources);
  }

  @Post('toc')
  @RequirePermission('readOnline')
  toc(@Body() body: { source: unknown; bookUrl: string }) {
    return this.guest.getToc(body.source, body.bookUrl);
  }

  @Post('content')
  @RequirePermission('readOnline')
  content(@Body() body: { source: unknown; chapterUrl: string }) {
    return this.guest.getContent(body.source, body.chapterUrl);
  }

  @Post('book-info')
  @RequirePermission('readOnline')
  bookInfo(@Body() body: { source: unknown; bookUrl: string }) {
    return this.guest.getBookInfo(body.source, body.bookUrl);
  }

  @Post('sources/validate')
  @RequirePermission('importSources')
  validate(@Body() body: { data: unknown }) {
    return this.guest.validateSources(body.data);
  }

  @Post('sources/test')
  @RequirePermission('searchBooks')
  testSources(@Body() body: { items: Array<{ id: string; source: unknown }>; q?: string }) {
    return this.guest.testSources(body.items ?? [], body.q);
  }
}
