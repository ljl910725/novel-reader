import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { UserPermissions } from '@novel-reader/shared';

const nav = [
  { to: '/shelf', label: '书架', perm: null },
  { to: '/search', label: '搜索', perm: 'searchBooks' as const },
  { to: '/source-store', label: '书源商店', perm: 'sourceStore' as const },
  { to: '/sources', label: '我的书源', perm: 'importSources' as const },
  { to: '/source-wizard', label: '生成书源', perm: 'sourceWizard' as const },
  { to: '/upload', label: '上传书籍', perm: 'localBooks' as const },
  { to: '/settings', label: '设置', perm: null },
];

interface LayoutProps {
  user: { nickname: string; role: string } | null;
  onLogout: () => void;
  can: (key: keyof UserPermissions) => boolean;
  children: ReactNode;
}

export function Layout({ user, onLogout, can, children }: LayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 text-white p-4 flex flex-col gap-2 shrink-0">
        <div className="text-lg font-bold mb-4">NovelReader</div>
        {nav.map((item) => {
          if (item.perm && !can(item.perm)) return null;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-2 rounded-lg ${pathname.startsWith(item.to) ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
            >
              {item.label}
            </Link>
          );
        })}
        {user?.role === 'ADMIN' && can('adminPanel') && (
          <Link to="/admin" className="px-3 py-2 rounded-lg hover:bg-slate-800">
            管理后台
          </Link>
        )}
        <div className="mt-auto pt-4 border-t border-slate-700 text-sm">
          {user ? (
            <>
              <div>{user.nickname}</div>
              <button type="button" onClick={onLogout} className="text-slate-400 hover:text-white mt-1">
                退出登录
              </button>
            </>
          ) : (
            <>
              <div className="text-slate-400">游客模式</div>
              <Link to="/login" className="text-indigo-300 hover:text-white mt-1 inline-block">
                登录 / 注册
              </Link>
            </>
          )}
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
