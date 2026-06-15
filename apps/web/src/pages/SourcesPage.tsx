import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LegadoBookSource } from '@novel-reader/shared';
import { api } from '../api';
import { guestStorage } from '../lib/guestStorage';

interface Props {
  user: { id: string } | null;
  canImport: boolean;
}

export function SourcesPage({ user, canImport }: Props) {
  const [sources, setSources] = useState<Array<Record<string, unknown>>>([]);
  const [json, setJson] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    if (user) {
      setSources(await api.sources());
    } else {
      setSources(
        guestStorage.getSources().map((s) => ({
          id: s.id,
          name: s.name,
          group: s.group,
          enabled: s.enabled,
          isLocal: true,
        })),
      );
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const importJson = async () => {
    if (!canImport) {
      setMsg('当前无导入书源权限');
      return;
    }
    try {
      const data = JSON.parse(json) as LegadoBookSource | LegadoBookSource[];
      const list = Array.isArray(data) ? data : [data];
      if (user) {
        await api.importSources(list);
      } else {
        guestStorage.importSources(list);
      }
      setMsg('导入成功');
      setJson('');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'JSON 格式错误');
    }
  };

  const importUrl = async () => {
    if (!canImport) {
      setMsg('当前无导入书源权限');
      return;
    }
    try {
      if (user) {
        await api.importSourceUrl(subUrl);
      } else {
        const res = await fetch(subUrl);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [data];
        guestStorage.importSources(list);
      }
      setMsg('订阅导入成功');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '导入失败');
    }
  };

  const toggleGuest = (id: string, enabled: boolean) => {
    const all = guestStorage.getSources();
    guestStorage.saveSources(all.map((s) => (s.id === id ? { ...s, enabled } : s)));
    load();
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">我的书源</h1>
      <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        书源保存在本机浏览器（localStorage）。Android APK 使用手机本地存储，互不共享。
      </p>
      {msg && <p className="text-indigo-600">{msg}</p>}

      {canImport && (
        <>
          <section className="bg-white border rounded-xl p-4 grid gap-3">
            <h2 className="font-semibold">粘贴 Legado JSON 导入</h2>
            <textarea rows={6} value={json} onChange={(e) => setJson(e.target.value)} placeholder='[{"bookSourceName":"..."}]' />
            <button type="button" onClick={importJson} className="px-4 py-2 bg-indigo-600 text-white rounded-lg w-fit">
              导入
            </button>
          </section>

          <section className="bg-white border rounded-xl p-4 grid gap-3">
            <h2 className="font-semibold">书源订阅链接导入</h2>
            <input value={subUrl} onChange={(e) => setSubUrl(e.target.value)} placeholder="https://..." />
            <button type="button" onClick={importUrl} className="px-4 py-2 border rounded-lg w-fit">
              从 URL 导入
            </button>
          </section>
        </>
      )}

      <section>
        <h2 className="font-semibold mb-3">已导入书源 ({sources.length})</h2>
        <div className="grid gap-2">
          {sources.map((s) => (
            <div key={String(s.id)} className="bg-white border rounded-lg p-3 flex justify-between items-center">
              <div>
                <span className="font-medium">{String(s.name)}</span>
                <span className="text-sm text-slate-500 ml-2">{String(s.group)}</span>
              </div>
              <div className="flex gap-2 items-center">
                {!user && (
                  <label className="text-sm flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={Boolean(s.enabled)}
                      onChange={(e) => toggleGuest(String(s.id), e.target.checked)}
                    />
                    启用
                  </label>
                )}
                {user && (
                  <>
                    <Link to={`/source-editor/${s.id}`} className="text-indigo-600 text-sm">
                      编辑
                    </Link>
                    <button
                      type="button"
                      className="text-sm"
                      onClick={async () => {
                        const r = (await api.testSource(String(s.id))) as { success?: boolean; error?: string };
                        setMsg(r.success ? '测试通过' : `测试失败: ${r.error ?? ''}`);
                      }}
                    >
                      测试
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {sources.length === 0 && <p className="text-slate-500">暂无书源，请从书源商店或 JSON 导入</p>}
        </div>
      </section>
    </div>
  );
}
