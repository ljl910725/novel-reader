import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('config')
export class ConfigController {
  constructor(private permissions: PermissionsService) {}

  @Get('permissions')
  async getPublicPermissions() {
    const guest = await this.permissions.getGuestPermissions();
    return { guest };
  }
}
