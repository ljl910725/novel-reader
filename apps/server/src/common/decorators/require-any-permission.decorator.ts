import { SetMetadata } from '@nestjs/common';
import type { UserPermissions } from '@novel-reader/shared';
import type { PermissionKey } from './require-permission.decorator';

export const PERMISSIONS_ANY_KEY = 'permissions_any';

/** 满足任一权限即可访问 */
export const RequireAnyPermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);

export type { UserPermissions };
