import { DEFAULT_GUEST_PERMISSIONS, type UserPermissions } from '@novel-reader/shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

export function usePermissions(user: { permissions?: UserPermissions; role?: string } | null) {
  const [guestPermissions, setGuestPermissions] = useState<UserPermissions>(DEFAULT_GUEST_PERMISSIONS);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getGuestPermissionsConfig();
      setGuestPermissions(data.guest);
    } catch {
      setGuestPermissions(DEFAULT_GUEST_PERMISSIONS);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const permissions = user
    ? user.role === 'ADMIN'
      ? ({
          importSources: true,
          searchBooks: true,
          readOnline: true,
          localBooks: true,
          cloudUpload: true,
          cloudSync: true,
          sourceStore: true,
          sourceWizard: true,
          aiTools: true,
          adminPanel: true,
        } satisfies UserPermissions)
      : (user.permissions ?? DEFAULT_GUEST_PERMISSIONS)
    : guestPermissions;

  const can = (key: keyof UserPermissions) => permissions[key];

  return { permissions, can, refreshGuestPermissions: refresh };
}
