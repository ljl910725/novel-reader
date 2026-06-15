import { DEFAULT_DESKTOP_WINDOW, DEFAULT_READER_THEME, type ReaderTheme } from '@novel-reader/shared';
import { Reader, ThemePanel } from '@novel-reader/ui';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? '/api';

export default function DesktopApp() {
  const [token, setToken] = useState(localStorage.getItem('accessToken') ?? '');
  const [email, setEmail] = useState('demo@novel.local');
  const [password, setPassword] = useState('demo123');
  const [view, setView] = useState<'login' | 'shelf' | 'reader' | 'settings'>('login');
  const [shelf, setShelf] = useState<Array<Record<string, unknown>>>([]);
  const [theme, setTheme] = useState<ReaderTheme>(DEFAULT_READER_THEME);
  const [opacity, setOpacity] = useState(DEFAULT_DESKTOP_WINDOW.opacity);
  const [alwaysOnTop, setAlwaysOnTop] = useState(DEFAULT_DESKTOP_WINDOW.alwaysOnTop);
  const [localChapters, setLocalChapters] = useState<Array<{ title: string; content: string }>>([]);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [readerTitle, setReaderTitle] = useState('');
  const [cloudContent, setCloudContent] = useState('');
  const [currentBookId, setCurrentBookId] = useState('');

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const login = async () => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('accessToken', data.accessToken);
    setToken(data.accessToken);
    setView('shelf');
    loadShelf(data.accessToken);
    loadSettings(data.accessToken);
  };

  const loadShelf = async (t = token) => {
    const headers = { Authorization: `Bearer ${t}` };
    const res = await fetch(`${API}/shelf`, { headers });
    if (res.ok) setShelf(await res.json());
  };

  const loadSettings = async (t = token) => {
    const headers = { Authorization: `Bearer ${t}` };
    const [reader, desktop] = await Promise.all([
      fetch(`${API}/settings/reader`, { headers }).then((r) => r.json()),
      fetch(`${API}/settings/desktop`, { headers }).then((r) => r.json()),
    ]);
    setTheme(reader);
    setOpacity(desktop.opacity);
    setAlwaysOnTop(desktop.alwaysOnTop);
    applyWindowSettings(desktop);
  };

  const applyWindowSettings = async (s: { opacity: number; alwaysOnTop: boolean }) => {
    try {
      await invoke('set_window_opacity', { opacity: s.opacity });
      await invoke('set_always_on_top', { alwaysOnTop: s.alwaysOnTop });
    } catch {
      // not in tauri shell
    }
  };

  const openLocalFile = async () => {
    const { parseEpub, parseTxt } = await import('@novel-reader/file-parser');
    const selected = await open({ multiple: false, filters: [{ name: 'Books', extensions: ['txt', 'epub'] }] });
    if (!selected || typeof selected !== 'string') return;
    const data = await readFile(selected);
    const buf = new Uint8Array(data);
    const isEpub = selected.endsWith('.epub');
    const parsed = isEpub ? await parseEpub(buf) : parseTxt(buf);
    setLocalChapters(parsed.chapters.map((c) => ({ title: c.title, content: c.content ?? '' })));
    setReaderTitle(parsed.meta.title);
    setCloudContent('');
    setChapterIdx(0);
    setView('reader');
  };

  const openCloudBook = async (bookId: string, title: string) => {
    setCurrentBookId(bookId);
    setReaderTitle(title);
    setLocalChapters([]);
    const chapters = await apiFetch(`/books/${bookId}/chapters`);
    if (chapters[0]) {
      const content = await apiFetch(`/chapters/${chapters[0].id}/content`);
      setCloudContent(content.content);
    }
    setView('reader');
  };

  const saveDesktopSettings = async () => {
    const size = await getCurrentWindow().innerSize();
    const pos = await getCurrentWindow().outerPosition();
    await apiFetch('/settings/desktop', {
      method: 'PUT',
      body: JSON.stringify({
        width: size.width,
        height: size.height,
        x: pos.x,
        y: pos.y,
        opacity,
        alwaysOnTop,
      }),
    });
    await applyWindowSettings({ opacity, alwaysOnTop });
  };

  useEffect(() => {
    if (token) {
      setView('shelf');
      loadShelf();
      loadSettings();
    }
  }, []);

  if (view === 'login') {
    return (
      <div className="app-shell">
        <div className="drag-bar"><span>NovelReader 悬浮窗</span></div>
        <div className="content" style={{ display: 'grid', gap: 8 }}>
          <h3>登录同步书架</h3>
          <label>邮箱<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button type="button" onClick={login}>登录</button>
          <button type="button" onClick={openLocalFile} style={{ background: '#374151' }}>跳过登录，打开本地书籍</button>
        </div>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="app-shell">
        <div className="drag-bar">
          <span>窗口设置</span>
          <button type="button" onClick={() => setView('shelf')}>返回</button>
        </div>
        <div className="content">
          <label>透明度 {opacity}
            <input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
          </label>
          <label>
            <input type="checkbox" checked={alwaysOnTop} onChange={(e) => setAlwaysOnTop(e.target.checked)} /> 总在最前
          </label>
          <ThemePanel theme={theme} onChange={async (t) => { setTheme(t); await apiFetch('/settings/reader', { method: 'PUT', body: JSON.stringify(t) }); }} />
          <button type="button" onClick={saveDesktopSettings}>保存并应用</button>
        </div>
      </div>
    );
  }

  if (view === 'reader') {
    const content = localChapters.length ? localChapters[chapterIdx]?.content ?? '' : cloudContent;
    return (
      <div className="app-shell">
        <div className="drag-bar">
          <span>{readerTitle}</span>
          <button type="button" onClick={() => setView('shelf')}>书架</button>
        </div>
        <div className="content" style={{ padding: 0 }}>
          <Reader
            theme={theme}
            title={localChapters[chapterIdx]?.title ?? readerTitle}
            content={content}
            isHtml={content.includes('<')}
            onPrev={chapterIdx > 0 ? () => setChapterIdx(chapterIdx - 1) : undefined}
            onNext={chapterIdx < localChapters.length - 1 ? () => setChapterIdx(chapterIdx + 1) : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="drag-bar">
        <span>书架</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={openLocalFile}>本地打开</button>
          <button type="button" onClick={() => setView('settings')}>设置</button>
        </div>
      </div>
      <div className="content">
        {shelf.map((item) => {
          const book = item.book as Record<string, unknown>;
          return (
            <button
              key={String(item.id)}
              type="button"
              style={{ display: 'block', width: '100%', marginBottom: 8, textAlign: 'left', background: '#2a2a3e' }}
              onClick={() => openCloudBook(String(book.id), String(book.title))}
            >
              {String(book.title)} — {String(book.author)}
            </button>
          );
        })}
        {shelf.length === 0 && <p>书架为空，请先在网页端添加书籍</p>}
      </div>
    </div>
  );
}
