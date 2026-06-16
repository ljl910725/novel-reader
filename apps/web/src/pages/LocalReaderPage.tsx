import { DEFAULT_READER_THEME, type ReaderTheme } from '@novel-reader/shared';
import { Reader, ThemePanel } from '@novel-reader/ui';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { getLocalChapterContent, getLocalTxtBook } from '../lib/localTxtStore';

export function LocalReaderPage() {
  const book = getLocalTxtBook();
  const [chapterIndex, setChapterIndex] = useState(0);
  const [content, setContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [theme, setTheme] = useState<ReaderTheme>(DEFAULT_READER_THEME);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.getReaderSettings().then((t) => setTheme(t as unknown as ReaderTheme)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!book) return;
    const slice = book.slices[chapterIndex];
    if (!slice) return;
    const { title, content: body } = getLocalChapterContent(slice);
    setChapterTitle(title);
    setContent(body);
  }, [book, chapterIndex]);

  if (!book) {
    return <Navigate to="/upload" replace />;
  }

  const saveTheme = async (t: ReaderTheme) => {
    setTheme(t);
    try {
      await api.saveReaderSettings(t);
    } catch {
      // guest / offline — theme kept in memory for this session
    }
  };

  const isHtml = content.includes('<') && content.includes('>');
  const slices = book.slices;

  return (
    <div className="flex gap-4">
      <aside className="w-48 shrink-0">
        <p className="text-xs text-slate-500 mb-2 truncate" title={book.title}>
          {book.title}
        </p>
        <button type="button" onClick={() => setShowSettings(!showSettings)} className="mb-4 text-sm text-indigo-600">
          {showSettings ? '关闭设置' : '阅读设置'}
        </button>
        <div className="max-h-[70vh] overflow-auto text-sm">
          {slices.map((s, i) => (
            <button
              key={s.index}
              type="button"
              onClick={() => setChapterIndex(i)}
              className={`block w-full text-left px-2 py-1 rounded ${i === chapterIndex ? 'bg-indigo-100' : ''}`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 rounded-xl overflow-hidden border">
        {showSettings ? (
          <div className="p-4 bg-white">
            <ThemePanel theme={theme} onChange={saveTheme} />
          </div>
        ) : (
          <Reader
            theme={theme}
            title={chapterTitle || book.title}
            content={content}
            isHtml={isHtml}
            onPrev={chapterIndex > 0 ? () => setChapterIndex(chapterIndex - 1) : undefined}
            onNext={chapterIndex < slices.length - 1 ? () => setChapterIndex(chapterIndex + 1) : undefined}
          />
        )}
      </div>
    </div>
  );
}
