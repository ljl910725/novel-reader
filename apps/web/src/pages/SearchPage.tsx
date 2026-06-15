import { useState } from 'react';
import { api } from '../api';
import { guestStorage } from '../lib/guestStorage';

interface Props {
  user: { id: string } | null;
  canSearch: boolean;
}

export function SearchPage({ user, canSearch }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  const search = async () => {
    if (!canSearch) {
      setMsg('当前无搜索权限');
      return;
    }
    if (!q.trim()) return;

    let r: Array<Record<string, unknown>>;
    if (user) {
      r = await api.search(q);
    } else {
      const sources = guestStorage.getEnabledConfigs();
      if (sources.length === 0) {
        setMsg('请先导入并启用书源');
        return;
      }
      const raw = await api.guestSearch(q, sources);
      const enabled = guestStorage.getSources().filter((s) => s.enabled);
      r = raw.map((item) => {
        const idx = Number(String(item.sourceId).replace('guest-', ''));
        return { ...item, sourceId: enabled[idx]?.id ?? item.sourceId };
      });
    }
    setResults(r);
    setMsg(r.length === 0 ? '未找到结果，请检查书源或换关键词' : '');
  };

  const addShelf = async (item: Record<string, unknown>) => {
    if (user) {
      await api.addToShelf({
        sourceId: item.sourceId,
        bookUrl: item.bookUrl,
        title: item.name,
        author: item.author,
      });
      setMsg(`已加入云端书架：${item.name}`);
      return;
    }

    guestStorage.addToShelf({
      title: String(item.name),
      author: String(item.author),
      sourceId: String(item.sourceId),
      bookUrl: String(item.bookUrl),
      coverUrl: item.coverUrl ? String(item.coverUrl) : undefined,
    });
    setMsg(`已加入本地书架：${item.name}（登录后可同步云端）`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">搜索小说</h1>
      {!user && (
        <p className="text-sm text-slate-500 mb-3">使用本机书源搜索，结果可加入本地书架</p>
      )}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="输入书名或作者"
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button type="button" onClick={search} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
          搜索
        </button>
      </div>
      {msg && <p className="text-indigo-600 mb-4">{msg}</p>}
      <div className="grid gap-3">
        {results.map((r, i) => (
          <div key={i} className="bg-white border rounded-xl p-4 flex justify-between">
            <div>
              <div className="font-semibold">{String(r.name)}</div>
              <div className="text-sm text-slate-500">
                {String(r.author)} · {String(r.sourceName)}
              </div>
            </div>
            <button type="button" onClick={() => addShelf(r)} className="px-4 py-2 border rounded-lg">
              加入书架
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
