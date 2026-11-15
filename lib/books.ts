import type { RowDataPacket } from "mysql2";

export const BOOK_COLUMNS = `id, user_id, title, author, category, status, last_chapter,
  total_chapters, rating, review, cover_url, is_favorite, created_at, updated_at`;

type BookRow = RowDataPacket & {
  id: number;
  user_id: number;
  title: string;
  author: string | null;
  category: string;
  status: string;
  last_chapter: number;
  total_chapters: number | null;
  rating: number | null;
  review: string | null;
  cover_url: string | null;
  is_favorite: number;
  created_at: Date;
  updated_at: Date;
};

export type Book = {
  id: number;
  title: string;
  author: string | null;
  category: string;
  status: string;
  lastChapter: number;
  totalChapters: number | null;
  rating: number | null;
  review: string | null;
  coverUrl: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapBook(row: BookRow): Book {
  return {
    id: Number(row.id),
    title: row.title,
    author: row.author,
    category: row.category,
    status: row.status,
    lastChapter: Number(row.last_chapter),
    totalChapters: row.total_chapters === null ? null : Number(row.total_chapters),
    rating: row.rating === null ? null : Number(row.rating),
    review: row.review,
    coverUrl: row.cover_url,
    isFavorite: Boolean(row.is_favorite),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export type { BookRow };
