import type { LegadoBookSource } from '@novel-reader/shared';
import { SourceEditor } from '@novel-reader/ui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export function SourceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [source, setSource] = useState<LegadoBookSource | null>(null);
  const [debugResult, setDebugResult] = useState<unknown[]>([]);
  const [keyword, setKeyword] = useState('测试');

  useEffect(() => {
    api.sources().then((list) => {
      const s = list.find((x) => x.id === id);
      if (s) setSource(s.legadoConfig as LegadoBookSource);
    });
  }, [id]);

  const save = async () => {
    if (!source || !id) return;
    await api.updateSource(id, { legadoConfig: source });
    alert('已保存');
  };

  const debug = async () => {
    if (!id) return;
    const r = await api.debugSource(id, { keyword });
    setDebugResult(r as unknown[]);
  };

  const exportJson = () => {
    if (!source) return;
    const blob = new Blob([JSON.stringify([source], null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${source.bookSourceName}.json`;
    a.click();
  };

  if (!source) return <p>加载中...</p>;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">书源编辑器 & 调试沙箱</h1>
      <SourceEditor source={source} onChange={setSource} onExport={exportJson} />
      <div className="flex gap-2">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <button type="button" onClick={debug} className="px-4 py-2 border rounded-lg">调试</button>
        <button type="button" onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">保存</button>
      </div>
      {debugResult.length > 0 && (
        <pre className="bg-slate-100 p-4 rounded text-xs overflow-auto">{JSON.stringify(debugResult, null, 2)}</pre>
      )}
    </div>
  );
}
