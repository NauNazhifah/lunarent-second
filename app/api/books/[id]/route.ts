import { NextResponse } from "next/server";
import { authOrResponse } from "@/lib/api";
import { mapBook, BOOK_COLUMNS, type BookRow } from "@/lib/books";
import { getPool } from "@/lib/db";
import { bookUpdateSchema } from "@/lib/validators";

const FIELD_MAP: Record<string, string> = {
  title: "title",
  author: "author",
  category: "category",
  status: "status",
  lastChapter: "last_chapter",
  totalChapters: "total_chapters",
  rating: "rating",
  review: "review",
  coverUrl: "cover_url",
  isFavorite: "is_favorite",
};

type Ctx = { params: Promise<{ id: string }> };

async function findBook(id: number, userId: number) {
  const [rows] = await getPool().query<BookRow[]>(
    `SELECT ${BOOK_COLUMNS} FROM books WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId],
  );
  return rows[0] ?? null;
}

function parseId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await authOrResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  try {
    const row = await findBook(id, user.id);
    if (!row) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: mapBook(row) });
  } catch {
    return NextResponse.json({ error: "Gagal memuat buku" }, { status: 500 });
  }
}

async function update(request: Request, { params }: Ctx) {
  const auth = await authOrResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  const parsed = bookUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const entries = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
  if (!entries.length) {
    return NextResponse.json({ error: "Tidak ada field untuk diubah" }, { status: 400 });
  }

  try {
    const existing = await findBook(id, user.id);
    if (!existing) return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });

    const next = mapBook(existing);
    const merged = { ...next, ...parsed.data } as typeof next;
    if (
      merged.totalChapters !== null &&
      merged.lastChapter !== null &&
      merged.lastChapter > merged.totalChapters
    ) {
      return NextResponse.json(
        { error: "Chapter terakhir tidak boleh melebihi total chapter" },
        { status: 400 },
      );
    }

    const sets = entries.map(([k]) => `${FIELD_MAP[k]} = ?`);
    const values = entries.map(([k, v]) =>
      k === "isFavorite" ? (v ? 1 : 0) : v === "" ? null : v,
    );

    await getPool().query(
      `UPDATE books SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      [...values, id, user.id],
    );
    const row = await findBook(id, user.id);
    return NextResponse.json({ data: mapBook(row!) });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui buku" }, { status: 500 });
  }
}

export const PUT = update;
export const PATCH = update;

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await authOrResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  try {
    const [result] = await getPool().query(
      "DELETE FROM books WHERE id = ? AND user_id = ?",
      [id, user.id],
    );
    if (!(result as { affectedRows: number }).affectedRows) {
      return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus buku" }, { status: 500 });
  }
}
