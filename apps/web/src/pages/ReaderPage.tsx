import { DEFAULT_READER_THEME, type ReaderTheme } from '@novel-reader/shared';
import { Reader, ThemePanel } from '@novel-reader/ui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Record<string, unknown> | null>(null);
  const [chapters, setChapters] = useState<Array<{ id: string; title: string; index: number }>>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState<ReaderTheme>(DEFAULT_READER_THEME);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    api.getBook(bookId).then(setBook);
    api.getChapters(bookId).then(setChapters);
    api.getReaderSettings().then((t) => setTheme(t as unknown as ReaderTheme));
    api.getProgress(bookId).then((p) => {
      if (p?.chapterIndex != null) setChapterIndex(Number(p.chapterIndex));
    });
  }, [bookId]);

  useEffect(() => {
    const ch = chapters[chapterIndex];
    if (!ch) return;
    api.getChapterContent(ch.id).then((r) => setContent(r.content));
    if (bookId) {
      const percent = chapters.length > 0 ? ((chapterIndex + 1) / chapters.length) * 100 : 0;
      api.saveProgress(bookId, { chapterId: ch.id, chapterIndex, percent, scrollOffset: 0 });
    }
  }, [chapters, chapterIndex, bookId]);

  const saveTheme = async (t: ReaderTheme) => {
    setTheme(t);
    await api.saveReaderSettings(t);
  };

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
          <div className="p-4 bg-white"><ThemePanel theme={theme} onChange={saveTheme} /></div>
        ) : (
          <Reader
            theme={theme}
            title={chapters[chapterIndex]?.title ?? String(book?.title ?? '')}
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
