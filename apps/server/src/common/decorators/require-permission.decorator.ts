import { SetMetadata } from '@nestjs/common';
import type { UserPermissions } from '@novel-reader/shared';

export const PERMISSION_KEY = 'permission';

export type PermissionKey = keyof UserPermissions;

export const RequirePermission = (permission: PermissionKey) => SetMetadata(PERMISSION_KEY, permission);
