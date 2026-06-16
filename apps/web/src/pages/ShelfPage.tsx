import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BookDetailModal, type BookDetail } from '../components/BookDetailModal';
import { guestStorage } from '../lib/guestStorage';

interface Props {
  user: { id: string } | null;
}

function CoverThumb({ coverUrl, title }: { coverUrl?: string | null; title: string }) {
  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt=""
        className="w-16 h-22 object-cover rounded-md border bg-slate-100 shrink-0"
        style={{ height: '5.5rem' }}
      />
    );
  }
  return (
    <div
      className="w-16 rounded-md border bg-slate-100 flex items-center justify-center text-slate-400 text-xs text-center px-1 shrink-0"
      style={{ height: '5.5rem' }}
    >
      {title.slice(0, 4)}
    </div>
  );
}

export function ShelfPage({ user }: Props) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const load = () => {
      if (user) {
        api.shelf().then(setItems).catch(() => setItems([]));
      } else {
        setItems(
          guestStorage.getShelf().map((s) => ({
            id: s.id,
            book: {
              id: s.id,
              title: s.title,
              author: s.author,
              coverUrl: s.coverUrl,
              intro: s.intro,
              bookType: 'GUEST_ONLINE',
            },
            isGuest: true,
            addedAt: s.addedAt,
          })),
        );
      }
    };
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [user]);

  const openDetail = async (item: Record<string, unknown>) => {
    const book = item.book as Record<string, unknown>;
    const bookId = String(book.id);

    if (item.isGuest) {
      setDetail({
        id: bookId,
        title: String(book.title),
        author: String(book.author),
        coverUrl: book.coverUrl ? String(book.coverUrl) : undefined,
        intro: book.intro ? String(book.intro) : undefined,
        bookType: 'GUEST_ONLINE',
        isGuest: true,
        createdAt: item.addedAt ? String(item.addedAt) : undefined,
      });
      return;
    }

    setLoadingDetail(true);
    try {
      const data = await api.getBook(bookId);
      setDetail({
        id: bookId,
        title: String(data.title ?? book.title),
        author: String(data.author ?? book.author),
        intro: data.intro ? String(data.intro) : undefined,
        coverUrl: data.coverUrl ? String(data.coverUrl) : undefined,
        bookType: String(data.bookType ?? book.bookType),
        publisher: data.publisher ? String(data.publisher) : undefined,
        language: data.language ? String(data.language) : undefined,
        chapterCount: data.chapterCount != null ? Number(data.chapterCount) : undefined,
        createdAt: data.createdAt ? String(data.createdAt) : undefined,
        file: data.file as BookDetail['file'],
      });
    } catch {
      setDetail({
        id: bookId,
        title: String(book.title),
        author: String(book.author),
        coverUrl: book.coverUrl ? String(book.coverUrl) : undefined,
        bookType: String(book.bookType),
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">我的书架</h1>
      {!user && (
        <p className="text-sm text-slate-500 mb-4">本地书架，登录后可同步到云端</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const book = item.book as Record<string, unknown>;
          return (
            <button
              key={String(item.id)}
              type="button"
              onClick={() => openDetail(item)}
              className="bg-white border rounded-xl p-4 hover:shadow-md transition text-left flex gap-3"
            >
              <CoverThumb
                coverUrl={book.coverUrl ? String(book.coverUrl) : undefined}
                title={String(book.title)}
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{String(book.title)}</div>
                <div className="text-sm text-slate-500 truncate">{String(book.author)}</div>
                <div className="text-xs text-slate-400 mt-1">{String(book.bookType)}</div>
              </div>
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="text-slate-500 col-span-full">
            书架为空，去搜索或
            <Link to="/upload" className="text-indigo-600 mx-1">
              上传书籍
            </Link>
            吧
          </p>
        )}
      </div>

      {loadingDetail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-lg px-6 py-4 shadow-lg text-sm text-slate-600">加载中…</div>
        </div>
      )}
      <BookDetailModal book={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
