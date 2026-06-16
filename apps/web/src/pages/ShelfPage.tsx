import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sort, setSort] = useState<'recentRead' | 'added' | 'name'>('recentRead');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      if (user) {
        api.shelfSorted(sort).then(setItems).catch(() => setItems([]));
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
            progress: guestStorage.getProgress(s.id),
          })),
        );
      }
    };
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [user, sort]);

  const sortedGuest = useMemo(() => {
    if (user) return items;
    const rows = [...items];
    if (sort === 'name') {
      rows.sort((a, b) =>
        String((a.book as any)?.title ?? '').localeCompare(String((b.book as any)?.title ?? ''), 'zh-Hans-CN'),
      );
      return rows;
    }
    if (sort === 'added') {
      rows.sort((a, b) => new Date(String(b.addedAt)).getTime() - new Date(String(a.addedAt)).getTime());
      return rows;
    }
    rows.sort((a, b) => {
      const ap = a.progress as any;
      const bp = b.progress as any;
      const at = ap?.updatedAt ? new Date(String(ap.updatedAt)).getTime() : 0;
      const bt = bp?.updatedAt ? new Date(String(bp.updatedAt)).getTime() : 0;
      if (at !== bt) return bt - at;
      return new Date(String(b.addedAt)).getTime() - new Date(String(a.addedAt)).getTime();
    });
    return rows;
  }, [items, sort, user]);

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

  const startReading = (item: Record<string, unknown>) => {
    const book = item.book as Record<string, unknown>;
    const bookId = String(book.id);
    if (item.isGuest) {
      navigate(`/read/guest/${encodeURIComponent(String(item.id))}`);
      return;
    }
    navigate(`/read/${encodeURIComponent(bookId)}`);
  };

  const removeFromShelf = async (item: Record<string, unknown>) => {
    const book = item.book as Record<string, unknown>;
    const bookId = String(book.id);
    if (item.isGuest) {
      if (!window.confirm('确定从书架移除该书？')) return;
      guestStorage.removeFromShelf(String(item.id));
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
          progress: guestStorage.getProgress(s.id),
        })),
      );
      setMenuOpenId(null);
      return;
    }
    if (!window.confirm('确定从书架移除该书？')) return;
    await api.removeFromShelf(bookId);
    setMenuOpenId(null);
    api.shelfSorted(sort).then(setItems).catch(() => setItems([]));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">我的书架</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">排序</span>
          <select
            className="text-sm border rounded-lg px-2 py-1 bg-white"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="recentRead">按最近阅读</option>
            <option value="added">按添加时间</option>
            <option value="name">按书名</option>
          </select>
        </div>
      </div>
      {!user && (
        <p className="text-sm text-slate-500 mb-4">本地书架，登录后可同步到云端</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(user ? items : sortedGuest).map((item) => {
          const book = item.book as Record<string, unknown>;
          const progress = item.progress as any;
          const progressPercent =
            typeof progress?.percent === 'number' ? Math.round(progress.percent) : null;
          const progressText =
            progress && (progress.chapterTitle || progress.chapterIndex != null)
              ? `${progress.chapterTitle ?? `第 ${Number(progress.chapterIndex ?? 0) + 1} 章`} · ${
                  progressPercent != null ? `${progressPercent}%` : ''
                }`
              : '';
          return (
            <div
              key={String(item.id)}
              className="bg-white border rounded-xl p-4 hover:shadow-md transition text-left flex gap-3 relative cursor-pointer"
              role="group"
              onClick={() => startReading(item)}
            >
              <CoverThumb
                coverUrl={book.coverUrl ? String(book.coverUrl) : undefined}
                title={String(book.title)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startReading(item);
                    }}
                    className="font-semibold truncate text-left flex-1 hover:text-indigo-600"
                    title="开始阅读"
                  >
                    {String(book.title)}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-slate-500 hover:text-slate-800 px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === String(item.id) ? null : String(item.id)));
                    }}
                    aria-label="更多操作"
                    title="更多"
                  >
                    ⋯
                  </button>
                </div>
                <div className="text-sm text-slate-500 truncate">{String(book.author)}</div>
                {progressText ? (
                  <div className="text-xs text-slate-500 mt-1 truncate">{progressText}</div>
                ) : (
                  <div className="text-xs text-slate-400 mt-1">{String(book.bookType)}</div>
                )}
              </div>

              {menuOpenId === String(item.id) && (
                <div
                  className="absolute right-3 top-12 z-20 w-40 bg-white border rounded-xl shadow-lg overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50"
                    onClick={() => openDetail(item).then(() => setMenuOpenId(null))}
                  >
                    查看详情
                  </button>
                  <div className="h-px bg-slate-100" />
                  <button
                    type="button"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50"
                    onClick={() => {
                      setSort('recentRead');
                      setMenuOpenId(null);
                    }}
                  >
                    排序：按最近阅读
                  </button>
                  <button
                    type="button"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50"
                    onClick={() => {
                      setSort('added');
                      setMenuOpenId(null);
                    }}
                  >
                    排序：按添加时间
                  </button>
                  <button
                    type="button"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50"
                    onClick={() => {
                      setSort('name');
                      setMenuOpenId(null);
                    }}
                  >
                    排序：按书名
                  </button>
                  <div className="h-px bg-slate-100" />
                  <button
                    type="button"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50 text-red-600"
                    onClick={() => removeFromShelf(item)}
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
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
