import { PERMISSION_LABELS, type UserPermissions } from '@novel-reader/shared';
import { useEffect, useState } from 'react';
import { api } from '../api';

type AdminUser = {
  id: string;
  email: string;
  nickname: string;
  role: string;
  emailVerified?: boolean;
  effectivePermissions: UserPermissions;
};

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [guestPerms, setGuestPerms] = useState<UserPermissions | null>(null);
  const [msg, setMsg] = useState('');
  const [passwordDraft, setPasswordDraft] = useState<Record<string, string>>({});
  const [nicknameDraft, setNicknameDraft] = useState<Record<string, string>>({});

  const load = async () => {
    const [u, g] = await Promise.all([api.adminUsers(), api.adminGuestPermissions()]);
    setUsers(u as AdminUser[]);
    setGuestPerms(g);
    const nicknames: Record<string, string> = {};
    for (const user of u as AdminUser[]) nicknames[user.id] = user.nickname;
    setNicknameDraft(nicknames);
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

  const saveNickname = async (userId: string) => {
    const nickname = nicknameDraft[userId]?.trim();
    if (!nickname) return;
    await api.adminUpdateUser(userId, { nickname });
    setMsg('昵称已更新');
    load();
  };

  const resetPassword = async (userId: string) => {
    const newPassword = passwordDraft[userId]?.trim();
    if (!newPassword || newPassword.length < 6) {
      setMsg('请输入至少 6 位新密码');
      return;
    }
    if (!window.confirm('确定重置该用户密码？')) return;
    await api.adminResetUserPassword(userId, newPassword);
    setPasswordDraft((prev) => ({ ...prev, [userId]: '' }));
    setMsg('密码已重置');
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
          <h2 className="font-semibold text-lg">用户管理（{users.length}）</h2>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      value={nicknameDraft[u.id] ?? u.nickname}
                      onChange={(e) => setNicknameDraft({ ...nicknameDraft, [u.id]: e.target.value })}
                      className="font-medium border rounded px-2 py-1"
                    />
                    <button type="button" onClick={() => saveNickname(u.id)} className="text-xs border px-2 py-1 rounded">
                      保存昵称
                    </button>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {u.email}
                    {u.emailVerified === false && <span className="text-amber-600 ml-2">未验证</span>}
                  </div>
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

              <div className="flex flex-wrap gap-2 items-center mb-3">
                <input
                  type="password"
                  placeholder="设置新密码（至少 6 位）"
                  value={passwordDraft[u.id] ?? ''}
                  onChange={(e) => setPasswordDraft({ ...passwordDraft, [u.id]: e.target.value })}
                  className="border rounded px-2 py-1 text-sm flex-1 min-w-[200px]"
                />
                <button type="button" onClick={() => resetPassword(u.id)} className="text-sm border px-3 py-1 rounded-lg text-red-600">
                  重置密码
                </button>
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
