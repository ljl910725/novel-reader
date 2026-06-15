import { Injectable } from '@nestjs/common';
import { DEMO_STORE_SOURCES } from '@novel-reader/book-engine';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private permissions: PermissionsService,
  ) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      users.map(async (u) => ({
        ...u,
        effectivePermissions: await this.permissions.getUserPermissions(u.id),
      })),
    );
  }

  async listSources() {
    return this.prisma.bookSource.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getGuestPermissions() {
    return this.permissions.getGuestPermissions();
  }

  async updateGuestPermissions(perms: unknown) {
    return this.permissions.setGuestPermissions(perms);
  }

  async updateUser(userId: string, data: { role?: 'USER' | 'ADMIN'; permissions?: unknown }) {
    const update: { role?: 'USER' | 'ADMIN'; permissions?: object } = {};
    if (data.role) update.role = data.role;
    if (data.permissions !== undefined) {
      await this.permissions.setUserPermissions(userId, data.permissions);
    }
    if (Object.keys(update).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: update });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nickname: true, role: true, permissions: true },
    });
    return {
      ...user,
      effectivePermissions: await this.permissions.getUserPermissions(userId),
    };
  }

  async seedStore() {
    for (const source of DEMO_STORE_SOURCES) {
      const { id: _id, description, ...config } = source;
      const exists = await this.prisma.bookSource.findFirst({
        where: { isStore: true, name: config.bookSourceName },
      });
      if (!exists) {
        await this.prisma.bookSource.create({
          data: {
            name: config.bookSourceName,
            legadoConfig: { ...config, bookSourceComment: description } as object,
            isStore: true,
            storeStatus: 'healthy',
            lastChecked: new Date(),
            group: '书源商店',
          },
        });
      }
    }
    return { ok: true };
  }

  async updateStoreSource(id: string, data: { enabled?: boolean; storeStatus?: string }) {
    return this.prisma.bookSource.update({
      where: { id },
      data: {
        enabled: data.enabled,
        storeStatus: data.storeStatus,
        lastChecked: new Date(),
      },
    });
  }
}
