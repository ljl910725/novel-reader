import { useState } from 'react';
import { parseTxtBrowser } from '../lib/parseTxtBrowser';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Props {
  user: { id: string } | null;
  canUpload: boolean;
  canLocal: boolean;
}

export function UploadPage({ user, canUpload, canLocal }: Props) {
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const uploadCloud = async (file: File) => {
    if (!user) {
      setMsg('云端上传需要登录');
      return;
    }
    if (!canUpload) {
      setMsg('当前账号无云端上传权限');
      return;
    }
    const r = await api.uploadFile(file);
    setMsg(`上传成功，解析中... (${r.fileId})`);
    const poll = setInterval(async () => {
      const status = await api.fileStatus(r.fileId);
      if (status.parseStatus === 'DONE' && status.book) {
        clearInterval(poll);
        setMsg('解析完成，已加入书架');
        navigate(`/read/${(status.book as { id: string }).id}`);
      } else if (status.parseStatus === 'FAILED') {
        clearInterval(poll);
        setMsg(`解析失败: ${status.parseError}`);
      }
    }, 2000);
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
    <div className="max-w-xl grid gap-6">
      <h1 className="text-2xl font-bold">上传 / 打开书籍</h1>
      {msg && <p className="text-indigo-600">{msg}</p>}

      <section className="bg-white border rounded-xl p-4 grid gap-3">
        <h2 className="font-semibold">上传到云端（跨设备同步）</h2>
        <p className="text-sm text-slate-500">支持 TXT / EPUB，上限 50MB，需登录</p>
        <input type="file" accept=".txt,.epub" disabled={!user || !canUpload} onChange={(e) => e.target.files?.[0] && uploadCloud(e.target.files[0])} />
      </section>

      <section className="bg-white border rounded-xl p-4 grid gap-3">
        <h2 className="font-semibold">浏览器本地打开（不上传）</h2>
        <p className="text-sm text-slate-500">文件不离开本机，刷新后需重新选择</p>
        <input type="file" accept=".txt,.epub" onChange={(e) => e.target.files?.[0] && openLocal(e.target.files[0])} />
      </section>
    </div>
  );
}
