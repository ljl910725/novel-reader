import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LegadoBookSource } from '@novel-reader/shared';
import { parseLegadoImportPayload } from '@novel-reader/shared';
import { api } from '../api';
import { guestStorage } from '../lib/guestStorage';

interface Props {
  user: { id: string } | null;
  canImport: boolean;
}

type TestResult = {
  success: boolean;
  count?: number;
  error?: string;
};

function formatImportMessage(
  imported: number,
  skipped?: Array<{ name: string; reason: string }>,
) {
  if (!skipped?.length) return `导入成功，共 ${imported} 个书源`;
  return `导入成功 ${imported} 个，跳过 ${skipped.length} 个不兼容书源`;
}

function isManageable(source: Record<string, unknown>, user: Props['user']) {
  if (user) return Boolean(source.userId);
  return Boolean(source.isLocal);
}

function healthLabel(source: Record<string, unknown>, testResults: Record<string, TestResult>) {
  const id = String(source.id);
  const live = testResults[id];
  if (live) return live.success ? '可用' : '不可用';
  const status = source.healthStatus as string | undefined;
  if (status === 'healthy') return '可用';
  if (status === 'offline') return '不可用';
  return '未测试';
}

function healthClass(source: Record<string, unknown>, testResults: Record<string, TestResult>) {
  const label = healthLabel(source, testResults);
  if (label === '可用') return 'text-emerald-600 bg-emerald-50';
  if (label === '不可用') return 'text-red-600 bg-red-50';
  return 'text-slate-500 bg-slate-100';
}

export function SourcesPage({ user, canImport }: Props) {
  const [sources, setSources] = useState<Array<Record<string, unknown>>>([]);
  const [json, setJson] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState(false);
  const [testKeyword, setTestKeyword] = useState('测试');

  const manageableSources = useMemo(
    () => sources.filter((s) => isManageable(s, user)),
    [sources, user],
  );

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
          healthStatus: s.healthStatus,
          lastChecked: s.lastChecked,
          isLocal: true,
        })),
      );
    }
    setSelected(new Set());
  };

  useEffect(() => {
    load();
  }, [user]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(manageableSources.map((s) => String(s.id))));

  const clearSelection = () => setSelected(new Set());

  const selectFailed = () => {
    const failed = manageableSources
      .filter((s) => healthLabel(s, testResults) === '不可用')
      .map((s) => String(s.id));
    setSelected(new Set(failed));
  };

  const applyTestResults = (
    results: Array<{ id: string; success: boolean; count?: number; error?: string }>,
  ) => {
    setTestResults((prev) => {
      const next = { ...prev };
      for (const r of results) {
        next[r.id] = { success: r.success, count: r.count, error: r.error };
      }
      return next;
    });
    if (!user) {
      for (const r of results) {
        guestStorage.updateHealth(r.id, r.success ? 'healthy' : 'offline');
      }
    }
  };

  const runTests = async (ids: string[]) => {
    if (ids.length === 0) {
      setMsg('请先选择要测试的书源');
      return;
    }
    setTesting(true);
    setMsg(`正在测试 ${ids.length} 个书源…`);
    try {
      if (user) {
        const batch = await api.testSourcesBatch(ids, testKeyword);
        applyTestResults(batch.results);
        setMsg(`测试完成：可用 ${batch.passed} 个，不可用 ${batch.failed} 个`);
      } else {
        const items = ids
          .map((id) => {
            const src = guestStorage.getSourceById(id);
            return src ? { id, source: src.legadoConfig } : null;
          })
          .filter(Boolean) as Array<{ id: string; source: LegadoBookSource }>;
        const batch = await api.guestTestSources(items, testKeyword);
        applyTestResults(batch.results);
        setMsg(`测试完成：可用 ${batch.passed} 个，不可用 ${batch.failed} 个`);
        load();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '测试失败');
    } finally {
      setTesting(false);
    }
  };

  const testOne = async (id: string) => {
    setTesting(true);
    try {
      if (user) {
        const r = await api.testSource(id, testKeyword);
        applyTestResults([{ id, ...r }]);
        setMsg(r.success ? '测试通过' : `测试失败: ${r.error ?? ''}`);
      } else {
        const src = guestStorage.getSourceById(id);
        if (!src) return;
        const batch = await api.guestTestSources([{ id, source: src.legadoConfig }], testKeyword);
        applyTestResults(batch.results);
        const r = batch.results[0];
        setMsg(r?.success ? '测试通过' : `测试失败: ${r?.error ?? ''}`);
        load();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '测试失败');
    } finally {
      setTesting(false);
    }
  };

  const deleteIds = async (ids: string[]) => {
    if (ids.length === 0) {
      setMsg('请先选择要删除的书源');
      return;
    }
    if (!window.confirm(`确定删除 ${ids.length} 个书源？`)) return;
    try {
      if (user) {
        const { deleted } = await api.deleteSourcesBatch(ids);
        setMsg(`已删除 ${deleted} 个书源`);
      } else {
        guestStorage.removeSources(ids);
        setMsg(`已删除 ${ids.length} 个书源`);
      }
      setTestResults((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '删除失败');
    }
  };

  const importJson = async () => {
    if (!canImport) {
      setMsg('当前无导入书源权限');
      return;
    }
    try {
      const data = JSON.parse(json) as LegadoBookSource | LegadoBookSource[];
      const { sources, skipped } = parseLegadoImportPayload(data);
      if (sources.length === 0) {
        setMsg('书源 JSON 格式不正确');
        return;
      }
      if (user) {
        const result = await api.importSources(sources);
        setMsg(formatImportMessage(result.imported ?? sources.length, result.skipped ?? skipped));
      } else {
        guestStorage.importSources(sources as LegadoBookSource[]);
        setMsg(formatImportMessage(sources.length, skipped));
      }
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
        const result = await api.importSourceUrl(subUrl);
        setMsg(formatImportMessage(result.imported, result.skipped));
      } else {
        const res = await fetch(subUrl);
        const data = await res.json();
        const { sources, skipped } = parseLegadoImportPayload(data);
        if (sources.length === 0) {
          setMsg('书源 JSON 格式不正确');
          return;
        }
        guestStorage.importSources(sources as LegadoBookSource[]);
        setMsg(formatImportMessage(sources.length, skipped));
      }
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

  const selectedIds = [...selected];

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">我的书源</h1>
      <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        {user
          ? '登录用户的书源保存在云端，可批量测试连通性并删除不可用书源。'
          : '书源保存在本机浏览器（localStorage）。Android APK 使用手机本地存储，互不共享。'}
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold">已导入书源 ({sources.length})</h2>
          {manageableSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="border rounded px-2 py-1 text-sm w-24"
                value={testKeyword}
                onChange={(e) => setTestKeyword(e.target.value)}
                placeholder="测试词"
                title="搜索测试关键词"
              />
              <button type="button" className="text-sm px-2 py-1 border rounded" onClick={selectAll} disabled={testing}>
                全选
              </button>
              <button type="button" className="text-sm px-2 py-1 border rounded" onClick={clearSelection} disabled={testing}>
                取消
              </button>
              <button type="button" className="text-sm px-2 py-1 border rounded" onClick={selectFailed} disabled={testing}>
                选中不可用
              </button>
              <button
                type="button"
                className="text-sm px-2 py-1 border rounded bg-indigo-50"
                onClick={() => runTests(selectedIds)}
                disabled={testing}
              >
                测试选中
              </button>
              <button
                type="button"
                className="text-sm px-2 py-1 border rounded bg-indigo-50"
                onClick={() => runTests(manageableSources.map((s) => String(s.id)))}
                disabled={testing}
              >
                测试全部
              </button>
              <button
                type="button"
                className="text-sm px-2 py-1 border rounded text-red-600"
                onClick={() => deleteIds(selectedIds)}
                disabled={testing}
              >
                删除选中
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          {sources.map((s) => {
            const id = String(s.id);
            const manageable = isManageable(s, user);
            const checked = selected.has(id);
            const label = healthLabel(s, testResults);
            return (
              <div key={id} className="bg-white border rounded-lg p-3 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {manageable ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleSelect(id, e.target.checked)}
                      disabled={testing}
                    />
                  ) : (
                    <span className="w-4" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{String(s.name)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${healthClass(s, testResults)}`}>
                        {label}
                      </span>
                      {Boolean(s.isStore) && (
                        <span className="text-xs text-slate-400">商店</span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">{String(s.group)}</span>
                    {testResults[id]?.error && (
                      <p className="text-xs text-red-500 truncate" title={testResults[id].error}>
                        {testResults[id].error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  {!user && manageable && (
                    <label className="text-sm flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={Boolean(s.enabled)}
                        onChange={(e) => toggleGuest(id, e.target.checked)}
                      />
                      启用
                    </label>
                  )}
                  {manageable && (
                    <>
                      {user && (
                        <Link to={`/source-editor/${id}`} className="text-indigo-600 text-sm">
                          编辑
                        </Link>
                      )}
                      <button
                        type="button"
                        className="text-sm"
                        disabled={testing}
                        onClick={() => testOne(id)}
                      >
                        测试
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600"
                        disabled={testing}
                        onClick={() => deleteIds([id])}
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {sources.length === 0 && <p className="text-slate-500">暂无书源，请从书源商店或 JSON 导入</p>}
        </div>
      </section>
    </div>
  );
}
