import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, type PermissionKey } from '../decorators/require-permission.decorator';
import { PermissionsService } from '../../permissions/permissions.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<PermissionKey | undefined>(PERMISSION_KEY, context.getHandler());
    if (!permission) return true;

    const req = context.switchToHttp().getRequest<{ user?: { sub: string; role: string } }>();
    const userId = req.user?.sub;
    const role = req.user?.role;

    const allowed = await this.permissions.can(userId, role, permission);
    if (!allowed) {
      throw new ForbiddenException(`无权限：${permission}`);
    }
    return true;
  }
}
