import { useEffect, useState } from 'react';
import type { LegadoBookSource } from '@novel-reader/shared';
import { api } from '../api';
import { guestStorage } from '../lib/guestStorage';

interface Props {
  user: { id: string } | null;
  canImport: boolean;
}

export function SourceStorePage({ user, canImport }: Props) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.sourceStore().then(setItems);
  }, []);

  const importSource = async (item: Record<string, unknown>) => {
    if (!canImport) {
      setMsg('当前无导入书源权限');
      return;
    }
    try {
      if (user) {
        await api.importStoreSource(String(item.id));
      } else {
        const config = item.legadoConfig as LegadoBookSource | undefined;
        if (!config) throw new Error('该书源无配置数据');
        guestStorage.importSources([config]);
      }
      setMsg('导入成功！可在「我的书源」中查看');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '导入失败');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">书源商店</h1>
      <p className="text-slate-600 mb-6">新手推荐：一键导入已验证书源，无需懂 JSON</p>
      {msg && <p className="mb-4 text-indigo-600">{msg}</p>}
      <div className="grid gap-4">
        {items.map((item) => (
          <div key={String(item.id)} className="bg-white border rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold">{String(item.name)}</div>
              <div className="text-sm text-slate-500">{String(item.description ?? item.url)}</div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${item.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {item.status === 'healthy' ? '正常' : '异常'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => importSource(item)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              导入到我的书源
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
