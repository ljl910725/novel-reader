import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProgressController {
  constructor(private progress: ProgressService) {}

  @Get(':bookId')
  @RequirePermission('cloudSync')
  get(@CurrentUser('sub') userId: string, @Param('bookId') bookId: string) {
    return this.progress.get(userId, bookId);
  }

  @Put(':bookId')
  @RequirePermission('cloudSync')
  save(
    @CurrentUser('sub') userId: string,
    @Param('bookId') bookId: string,
    @Body() body: { chapterId?: string; chapterIndex?: number; percent?: number; scrollOffset?: number },
  ) {
    return this.progress.save(userId, bookId, body);
  }
}
