import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  @Get('sources')
  listSources() {
    return this.admin.listSources();
  }

  @Get('permissions/guest')
  getGuestPermissions() {
    return this.admin.getGuestPermissions();
  }

  @Patch('permissions/guest')
  updateGuestPermissions(@Body() body: unknown) {
    return this.admin.updateGuestPermissions(body);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { role?: 'USER' | 'ADMIN'; permissions?: unknown }) {
    return this.admin.updateUser(id, body);
  }

  @Post('source-store/seed')
  seedStore() {
    return this.admin.seedStore();
  }

  @Patch('sources/:id')
  updateSource(@Param('id') id: string, @Body() body: { enabled?: boolean; storeStatus?: string }) {
    return this.admin.updateStoreSource(id, body);
  }
}
