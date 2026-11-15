import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { authOrResponse } from "@/lib/api";
import { mapBook, BOOK_COLUMNS, type BookRow } from "@/lib/books";
import { getPool } from "@/lib/db";
import { listQuerySchema, bookCreateSchema } from "@/lib/validators";

const SORT_COLUMNS = {
  title: "title",
  created_at: "created_at",
  rating: "rating",
  last_chapter: "last_chapter",
} as const;

export async function GET(request: Request) {
  const auth = await authOrResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { q, status, category, favorite, sort, order, page, limit } = parsed.data;

  const where = ["user_id = ?"];
  const params: unknown[] = [user.id];
  if (q) {
    where.push("(title LIKE ? OR author LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (category) {
    where.push("category = ?");
    params.push(category);
  }
  if (favorite) {
    where.push("is_favorite = ?");
    params.push(favorite === "true" ? 1 : 0);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const dir = order === "asc" ? "ASC" : "DESC";

  try {
    const pool = getPool();
    const [rows] = await pool.query<BookRow[]>(
      `SELECT ${BOOK_COLUMNS} FROM books ${whereSql}
       ORDER BY ${SORT_COLUMNS[sort]} ${dir}, id ${dir}
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit],
    );
    const [countRows] = await pool.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total FROM books ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    return NextResponse.json({
      data: rows.map(mapBook),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data buku" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authOrResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  const parsed = bookCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const b = parsed.data;
  const lastChapter = b.lastChapter ?? 0;
  const totalChapters = b.totalChapters ?? null;
  if (totalChapters !== null && lastChapter > totalChapters) {
    return NextResponse.json(
      { error: "Chapter terakhir tidak boleh melebihi total chapter" },
      { status: 400 },
    );
  }

  try {
    const [result] = await getPool().query(
      `INSERT INTO books
        (user_id, title, author, category, status, last_chapter, total_chapters, rating, review, cover_url, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        b.title,
        b.author ?? null,
        b.category,
        b.status,
        b.lastChapter ?? 0,
        b.totalChapters ?? null,
        b.rating ?? null,
        b.review ?? null,
        b.coverUrl ?? null,
        b.isFavorite ? 1 : 0,
      ],
    );
    const id = (result as { insertId: number }).insertId;
    const [rows] = await getPool().query<BookRow[]>(
      `SELECT ${BOOK_COLUMNS} FROM books WHERE id = ? AND user_id = ?`,
      [id, user.id],
    );
    return NextResponse.json({ data: mapBook(rows[0]) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan buku" }, { status: 500 });
  }
}
