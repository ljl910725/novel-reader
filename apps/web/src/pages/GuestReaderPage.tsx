import { DEFAULT_READER_THEME, type ReaderTheme } from '@novel-reader/shared';
import { Reader, ThemePanel } from '@novel-reader/ui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { guestStorage } from '../lib/guestStorage';

export function GuestReaderPage() {
  const { shelfItemId } = useParams<{ shelfItemId: string }>();
  const [shelfItem, setShelfItem] = useState(
    guestStorage.getShelf().find((s) => s.id === shelfItemId) ?? null,
  );
  const [chapters, setChapters] = useState<
    Array<{ id: string; title: string; index: number; sourceChapterUrl?: string }>
  >([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState<ReaderTheme>(guestStorage.getTheme() ?? DEFAULT_READER_THEME);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shelfItem) return;
    const source = guestStorage.getSourceById(shelfItem.sourceId);
    if (!source) {
      setError('书源不存在，请重新导入书源');
      return;
    }
    api.guestToc(source.legadoConfig, shelfItem.bookUrl).then(setChapters).catch((e) => {
      setError(e instanceof Error ? e.message : '加载目录失败');
    });
    const p = guestStorage.getProgress(shelfItem.id);
    if (p) setChapterIndex(p.chapterIndex);
  }, [shelfItem]);

  useEffect(() => {
    if (!shelfItem || !chapters[chapterIndex]) return;
    const source = guestStorage.getSourceById(shelfItem.sourceId);
    const ch = chapters[chapterIndex];
    if (!source?.legadoConfig || !ch.sourceChapterUrl) return;
    api.guestContent(source.legadoConfig, ch.sourceChapterUrl).then((r) => setContent(r.content));
    const percent = chapters.length > 0 ? ((chapterIndex + 1) / chapters.length) * 100 : 0;
    guestStorage.saveProgress(shelfItem.id, chapterIndex, 0, { percent, chapterTitle: ch.title });
  }, [chapters, chapterIndex, shelfItem]);

  const saveTheme = (t: ReaderTheme) => {
    setTheme(t);
    guestStorage.saveTheme(t);
  };

  if (!shelfItem) {
    return <p className="text-red-600">书籍不存在</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  const isHtml = content.includes('<') && content.includes('>');

  return (
    <div className="flex gap-4">
      <aside className="w-48 shrink-0">
        <button type="button" onClick={() => setShowSettings(!showSettings)} className="mb-4 text-sm text-indigo-600">
          {showSettings ? '关闭设置' : '阅读设置'}
        </button>
        <div className="max-h-[70vh] overflow-auto text-sm">
          {chapters.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChapterIndex(i)}
              className={`block w-full text-left px-2 py-1 rounded ${i === chapterIndex ? 'bg-indigo-100' : ''}`}
            >
              {c.title}
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
            title={chapters[chapterIndex]?.title ?? shelfItem.title}
            content={content}
            isHtml={isHtml}
            onPrev={chapterIndex > 0 ? () => setChapterIndex(chapterIndex - 1) : undefined}
            onNext={chapterIndex < chapters.length - 1 ? () => setChapterIndex(chapterIndex + 1) : undefined}
          />
        )}
      </div>
    </div>
  );
}
