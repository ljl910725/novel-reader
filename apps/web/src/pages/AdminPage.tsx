import { PERMISSION_LABELS, type UserPermissions } from '@novel-reader/shared';
import { useEffect, useState } from 'react';
import { api } from '../api';

type AdminUser = {
  id: string;
  email: string;
  nickname: string;
  role: string;
  effectivePermissions: UserPermissions;
};

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [guestPerms, setGuestPerms] = useState<UserPermissions | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [u, g] = await Promise.all([api.adminUsers(), api.adminGuestPermissions()]);
    setUsers(u as AdminUser[]);
    setGuestPerms(g);
  };

  useEffect(() => {
    load();
  }, []);

  const saveGuest = async () => {
    if (!guestPerms) return;
    await api.adminUpdateGuestPermissions(guestPerms);
    setMsg('游客权限已保存');
  };

  const saveUserPerms = async (userId: string, permissions: Partial<UserPermissions>) => {
    await api.adminUpdateUser(userId, { permissions });
    setMsg('用户权限已更新');
    load();
  };

  const setUserRole = async (userId: string, role: 'USER' | 'ADMIN') => {
    await api.adminUpdateUser(userId, { role });
    setMsg('用户角色已更新');
    load();
  };

  return (
    <div className="max-w-5xl grid gap-8">
      <h1 className="text-2xl font-bold">管理后台</h1>
      {msg && <p className="text-indigo-600">{msg}</p>}

      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">游客权限（未登录可用功能）</h2>
        <p className="text-sm text-slate-500 mb-4">控制所有未登录用户能使用的功能</p>
        {guestPerms && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {(Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={guestPerms[key]}
                  onChange={(e) => setGuestPerms({ ...guestPerms, [key]: e.target.checked })}
                />
                {PERMISSION_LABELS[key]}
              </label>
            ))}
          </div>
        )}
        <button type="button" onClick={saveGuest} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
          保存游客权限
        </button>
      </section>

      <section className="bg-white border rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">用户权限管理</h2>
          <button
            type="button"
            onClick={() => api.adminSeedStore().then(() => setMsg('书源商店种子数据已刷新'))}
            className="text-sm border px-3 py-1 rounded-lg"
          >
            刷新书源商店
          </button>
        </div>
        <div className="grid gap-4">
          {users.map((u) => (
            <div key={u.id} className="border rounded-lg p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <div className="font-medium">{u.nickname}</div>
                  <div className="text-sm text-slate-500">{u.email}</div>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => setUserRole(u.id, e.target.value as 'USER' | 'ADMIN')}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="USER">普通用户</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </div>
              {u.role !== 'ADMIN' && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {(Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>)
                    .filter((k) => k !== 'adminPanel')
                    .map((key) => (
                      <label key={key} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={u.effectivePermissions[key]}
                          onChange={(e) => saveUserPerms(u.id, { [key]: e.target.checked })}
                        />
                        {PERMISSION_LABELS[key]}
                      </label>
                    ))}
                </div>
              )}
              {u.role === 'ADMIN' && <p className="text-xs text-slate-500">管理员拥有全部权限</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
