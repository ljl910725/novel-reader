import { Link } from 'react-router-dom';

export type BookDetail = {
  id: string;
  title: string;
  author: string;
  intro?: string | null;
  coverUrl?: string | null;
  bookType?: string;
  publisher?: string;
  language?: string;
  chapterCount?: number;
  createdAt?: string;
  file?: {
    filename: string;
    format: string;
    fileSize: number;
    uploadedAt: string;
  };
  isGuest?: boolean;
  readPath?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN');
}

function bookTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    SOURCE: '在线书源',
    LOCAL_TXT: '本地 TXT',
    LOCAL_EPUB: '本地 EPUB',
    SERVER_TXT: '云端 TXT',
    SERVER_EPUB: '云端 EPUB',
    GUEST_ONLINE: '访客在线',
  };
  return type ? (map[type] ?? type) : '—';
}

interface Props {
  book: BookDetail | null;
  onClose: () => void;
}

export function BookDetailModal({ book, onClose }: Props) {
  if (!book) return null;

  const readTo = book.readPath ?? (book.isGuest ? `/read/guest/${book.id}` : `/read/${book.id}`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-detail-title"
      >
        <div className="p-6">
          <div className="flex gap-4">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt=""
                className="w-28 h-40 object-cover rounded-lg border shrink-0 bg-slate-100"
              />
            ) : (
              <div className="w-28 h-40 rounded-lg border bg-slate-100 flex items-center justify-center text-slate-400 text-sm shrink-0">
                无封面
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 id="book-detail-title" className="text-xl font-bold leading-snug">
                {book.title}
              </h2>
              <p className="text-slate-600 mt-1">{book.author}</p>
              <p className="text-xs text-slate-400 mt-2">{bookTypeLabel(book.bookType)}</p>
            </div>
          </div>

          {book.intro && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">简介</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{book.intro}</p>
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {book.publisher && (
              <>
                <dt className="text-slate-500">出版社</dt>
                <dd>{book.publisher}</dd>
              </>
            )}
            {book.language && (
              <>
                <dt className="text-slate-500">语言</dt>
                <dd>{book.language}</dd>
              </>
            )}
            {book.chapterCount != null && (
              <>
                <dt className="text-slate-500">章节数</dt>
                <dd>{book.chapterCount}</dd>
              </>
            )}
            {book.file && (
              <>
                <dt className="text-slate-500">文件格式</dt>
                <dd>{book.file.format}</dd>
                <dt className="text-slate-500">文件大小</dt>
                <dd>{formatBytes(book.file.fileSize)}</dd>
                <dt className="text-slate-500">上传时间</dt>
                <dd>{formatDate(book.file.uploadedAt)}</dd>
                <dt className="text-slate-500">文件名</dt>
                <dd className="truncate" title={book.file.filename}>
                  {book.file.filename}
                </dd>
              </>
            )}
            {!book.file && book.createdAt && (
              <>
                <dt className="text-slate-500">加入时间</dt>
                <dd>{formatDate(book.createdAt)}</dd>
              </>
            )}
          </dl>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
            >
              关闭
            </button>
            <Link
              to={readTo}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              开始阅读
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
