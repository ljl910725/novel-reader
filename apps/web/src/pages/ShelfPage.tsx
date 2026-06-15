import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { guestStorage } from '../lib/guestStorage';

interface Props {
  user: { id: string } | null;
}

export function ShelfPage({ user }: Props) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (user) {
      api.shelf().then(setItems);
    } else {
      setItems(
        guestStorage.getShelf().map((s) => ({
          id: s.id,
          book: { id: s.id, title: s.title, author: s.author, bookType: 'GUEST_ONLINE' },
          isGuest: true,
        })),
      );
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">我的书架</h1>
      {!user && (
        <p className="text-sm text-slate-500 mb-4">本地书架，登录后可同步到云端</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const book = item.book as Record<string, unknown>;
          const to = item.isGuest ? `/read/guest/${book.id}` : `/read/${book.id}`;
          return (
            <Link
              key={String(item.id)}
              to={to}
              className="bg-white border rounded-xl p-4 hover:shadow-md transition"
            >
              <div className="font-semibold">{String(book.title)}</div>
              <div className="text-sm text-slate-500">{String(book.author)}</div>
              <div className="text-xs text-slate-400 mt-1">{String(book.bookType)}</div>
            </Link>
          );
        })}
        {items.length === 0 && (
          <p className="text-slate-500 col-span-full">书架为空，去搜索或上传书籍吧</p>
        )}
      </div>
    </div>
  );
}
