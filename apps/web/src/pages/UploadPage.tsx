import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { parseTxtBrowser } from '../lib/parseTxtBrowser';
import { api, type UploadedFileRecord } from '../api';

interface Props {
  user: { id: string } | null;
  canUpload: boolean;
  canLocal: boolean;
}

const STATUS_LABEL: Record<UploadedFileRecord['parseStatus'], string> = {
  PENDING: '等待中',
  PARSING: '解析中',
  DONE: '已完成',
  FAILED: '失败',
};

function statusClass(status: UploadedFileRecord['parseStatus']) {
  if (status === 'DONE') return 'text-emerald-600 bg-emerald-50';
  if (status === 'FAILED') return 'text-red-600 bg-red-50';
  if (status === 'PARSING') return 'text-amber-600 bg-amber-50';
  return 'text-slate-500 bg-slate-100';
}

function displayFilename(name: string): string {
  return name.replace(/[\x00-\x1f\x7f]/g, '').replace(/[\\/:*?"<>|]/g, '_').trim() || '未知文件';
}

export function UploadPage({ user, canUpload, canLocal }: Props) {
  const [msg, setMsg] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [history, setHistory] = useState<UploadedFileRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigate = useNavigate();
  const historyRef = useRef<UploadedFileRecord[]>([]);
  historyRef.current = history;

  const loadHistory = useCallback(async (): Promise<UploadedFileRecord[] | null> => {
    if (!user || !canUpload) return [];
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const rows = await api.listFiles();
      setHistory(rows);
      return rows;
    } catch (e) {
      const text = e instanceof Error ? e.message : '加载上传记录失败';
      setHistoryError(text);
      return null;
    } finally {
      setLoadingHistory(false);
    }
  }, [user, canUpload]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!user || !canUpload) return;

    const interval = setInterval(async () => {
      const pending = historyRef.current.filter(
        (f) => f.parseStatus === 'PARSING' || f.parseStatus === 'PENDING',
      );
      if (pending.length === 0) return;

      try {
        const updates = await Promise.all(pending.map((f) => api.fileStatus(f.id)));
        setHistory((prev) => {
          const map = new Map(updates.map((u) => [u.id, u]));
          return prev.map((item) => map.get(item.id) ?? item);
        });
      } catch {
        // 忽略单次轮询失败
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, canUpload]);

  const uploadCloud = async (file: File) => {
    if (!user) {
      setMsg('云端上传需要登录');
      return;
    }
    if (!canUpload) {
      setMsg('当前账号无云端上传权限');
      return;
    }
    try {
      const r = await api.uploadFile(file);
      const rows = await loadHistory();
      if (r.duplicate) {
        if (rows === null || rows.length === 0) {
          setMsg(
            '该文件此前已上传（服务器有记录），但上传记录未能加载。请点「刷新」；若仍失败，请更新 NAS 上的 API 镜像后重试。',
          );
        } else {
          setMsg('该文件此前已上传，可在下方记录中查看状态');
        }
      } else {
        setMsg(`「${file.name}」上传成功，正在解析…`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '上传失败');
    }
  };

  const removeFile = async (id: string) => {
    if (!window.confirm('确定删除该上传记录？若已加入书架，关联书籍也会删除。')) return;
    try {
      await api.deleteFile(id);
      setMsg('已删除');
      loadHistory();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '删除失败');
    }
  };

  const openLocal = async (file: File) => {
    if (!canLocal) {
      setMsg('当前无本地阅读权限');
      return;
    }
    if (file.name.endsWith('.epub')) {
      setMsg('浏览器本地打开暂仅支持 TXT，EPUB 请使用「上传到云端」');
      return;
    }
    const buffer = await file.arrayBuffer();
    const buf = new Uint8Array(buffer);
    const parsed = parseTxtBrowser(buf, { title: file.name.replace(/\.[^.]+$/, '') });

    sessionStorage.setItem('localBook', JSON.stringify(parsed));
    setMsg(`本地解析完成：${parsed.meta.title}，共 ${parsed.chapters.length} 章（仅本次会话）`);
    navigate('/read/local');
  };

  return (
    <div className="max-w-3xl grid gap-6">
      <h1 className="text-2xl font-bold">上传 / 打开书籍</h1>
      {msg && <p className="text-indigo-600">{msg}</p>}

      <section className="bg-white border rounded-xl p-4 grid gap-3">
        <h2 className="font-semibold">上传到云端（跨设备同步）</h2>
        <p className="text-sm text-slate-500">支持 TXT / EPUB，上限 50MB，需登录。解析完成后自动加入书架。</p>
        <input type="file" accept=".txt,.epub" disabled={!user || !canUpload} onChange={(e) => e.target.files?.[0] && uploadCloud(e.target.files[0])} />
      </section>

      <section className="bg-white border rounded-xl p-4 grid gap-3">
        <h2 className="font-semibold">浏览器本地打开（不上传）</h2>
        <p className="text-sm text-slate-500">文件不离开本机，刷新后需重新选择</p>
        <input type="file" accept=".txt,.epub" onChange={(e) => e.target.files?.[0] && openLocal(e.target.files[0])} />
      </section>

      {user && canUpload && (
        <section className="bg-white border rounded-xl p-4 grid gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">上传记录</h2>
            <button type="button" onClick={loadHistory} className="text-sm border px-2 py-1 rounded-lg">
              刷新
            </button>
          </div>
          <p className="text-sm text-slate-500">离开本页后解析仍在后台进行，可随时回来查看状态。</p>

          {historyError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {historyError}
            </p>
          )}

          {loadingHistory && history.length === 0 && !historyError && (
            <p className="text-slate-500 text-sm">加载中…</p>
          )}

          <div className="grid gap-2">
            {history.map((file) => (
              <div key={file.id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-3 items-center">
                <div className="min-w-0">
                  <div className="font-medium truncate">{displayFilename(file.filename)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB · {file.format} ·{' '}
                    {new Date(file.createdAt).toLocaleString()}
                  </div>
                  {file.parseError && <p className="text-xs text-red-500 mt-1">{file.parseError}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass(file.parseStatus)}`}>
                    {STATUS_LABEL[file.parseStatus]}
                  </span>
                  {file.parseStatus === 'DONE' && file.book && (
                    <>
                      <Link to={`/read/${file.book.id}`} className="text-sm text-indigo-600">
                        阅读
                      </Link>
                      <Link to="/shelf" className="text-sm text-slate-600">
                        书架
                      </Link>
                    </>
                  )}
                  <button type="button" onClick={() => removeFile(file.id)} className="text-sm text-red-600">
                    删除
                  </button>
                </div>
              </div>
            ))}
            {!loadingHistory && history.length === 0 && (
              <p className="text-slate-500 text-sm">暂无上传记录</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
