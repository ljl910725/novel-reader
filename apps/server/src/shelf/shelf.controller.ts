import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RequireAnyPermission } from '../common/decorators/require-any-permission.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { ShelfService } from './shelf.service';

@Controller('shelf')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShelfController {
  constructor(private shelf: ShelfService) {}

  @Get()
  @RequireAnyPermission('cloudSync', 'cloudUpload', 'readOnline')
  list(@CurrentUser('sub') userId: string) {
    return this.shelf.list(userId);
  }

  @Post()
  @RequirePermission('cloudSync')
  add(@CurrentUser('sub') userId: string, @Body() body: Record<string, unknown>) {
    return this.shelf.add(userId, body as Parameters<ShelfService['add']>[1]);
  }

  @Delete(':bookId')
  remove(@CurrentUser('sub') userId: string, @Param('bookId') bookId: string) {
    return this.shelf.remove(userId, bookId);
  }

  @Patch(':bookId')
  update(
    @CurrentUser('sub') userId: string,
    @Param('bookId') bookId: string,
    @Body() body: { pinned?: boolean; tracking?: boolean; group?: string },
  ) {
    return this.shelf.update(userId, bookId, body);
  }
}
