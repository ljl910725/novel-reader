import type { ChapterSlice } from '@novel-reader/shared';

export interface LocalTxtBook {
  title: string;
  author: string;
  text: string;
  slices: ChapterSlice[];
}

let book: LocalTxtBook | null = null;

export function setLocalTxtBook(next: LocalTxtBook): void {
  book = next;
}

export function getLocalTxtBook(): LocalTxtBook | null {
  return book;
}

export function getLocalChapterContent(slice: ChapterSlice): { title: string; content: string } {
  if (!book) return { title: slice.title, content: '' };
  const chunk = book.text.slice(slice.start, slice.end).trim();
  const content = chunk.slice(slice.title.length).trim();
  return { title: slice.title, content: content || chunk };
}
