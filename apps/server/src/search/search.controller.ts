import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @RequirePermission('searchBooks')
  searchBooks(
    @CurrentUser('sub') userId: string,
    @Query('q') q: string,
    @Query('sourceIds') sourceIds?: string,
  ) {
    const ids = sourceIds?.split(',').filter(Boolean);
    return this.searchService.search(userId, q, ids);
  }
}
