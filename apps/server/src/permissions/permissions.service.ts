import { Injectable } from '@nestjs/common';
import {
  ADMIN_PERMISSIONS,
  DEFAULT_GUEST_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  mergePermissions,
  permissionsSchema,
  type UserPermissions,
} from '@novel-reader/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async getGuestPermissions(): Promise<UserPermissions> {
    const config = await this.prisma.systemConfig.findUnique({ where: { id: 'default' } });
    if (!config?.guestPermissions) return DEFAULT_GUEST_PERMISSIONS;
    return permissionsSchema.parse(config.guestPermissions);
  }

  async setGuestPermissions(perms: unknown) {
    const parsed = permissionsSchema.parse(perms);
    await this.prisma.systemConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', guestPermissions: parsed as object },
      update: { guestPermissions: parsed as object },
    });
    return parsed;
  }

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, permissions: true },
    });
    if (!user) return DEFAULT_USER_PERMISSIONS;
    if (user.role === 'ADMIN') return ADMIN_PERMISSIONS;
    const override = user.permissions ? permissionsSchema.partial().parse(user.permissions) : null;
    return mergePermissions(DEFAULT_USER_PERMISSIONS, override);
  }

  async setUserPermissions(userId: string, perms: unknown) {
    const parsed = permissionsSchema.partial().parse(perms);
    await this.prisma.user.update({
      where: { id: userId },
      data: { permissions: parsed as object },
    });
    return this.getUserPermissions(userId);
  }

  async can(userId: string | undefined, role: string | undefined, permission: keyof UserPermissions): Promise<boolean> {
    if (role === 'ADMIN') return true;
    const perms = userId ? await this.getUserPermissions(userId) : await this.getGuestPermissions();
    return perms[permission];
  }

  async getEffective(userId?: string, role?: string) {
    if (role === 'ADMIN') {
      return { permissions: ADMIN_PERMISSIONS, isGuest: false, role: 'ADMIN' as const };
    }
    if (userId) {
      return { permissions: await this.getUserPermissions(userId), isGuest: false, role: role ?? 'USER' };
    }
    return { permissions: await this.getGuestPermissions(), isGuest: true, role: 'GUEST' as const };
  }
}
