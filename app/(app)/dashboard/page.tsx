import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { requireUser } from "@/lib/auth";
import { getPool } from "@/lib/db";

type StatRow = RowDataPacket & { status: string; total: number };
type BookLite = RowDataPacket & {
  id: number;
  title: string;
  author: string | null;
  status: string;
  category: string;
  last_chapter: number;
  total_chapters: number | null;
  rating: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  completed: "Completed",
  dropped: "Dropped",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const pool = getPool();

  const [stats] = await pool.query<StatRow[]>(
    "SELECT status, COUNT(*) AS total FROM books WHERE user_id = ? GROUP BY status",
    [user.id],
  );
  const [recent] = await pool.query<BookLite[]>(
    "SELECT id, title, author, status, category, last_chapter, total_chapters, rating FROM books WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5",
    [user.id],
  );
  const [[fav]] = await pool.query<(RowDataPacket & { total: number })[]>(
    "SELECT COUNT(*) AS total FROM books WHERE user_id = ? AND is_favorite = 1",
    [user.id],
  );
  const [[avg]] = await pool.query<(RowDataPacket & { avg: number | null })[]>(
    "SELECT AVG(rating) AS avg FROM books WHERE user_id = ?",
    [user.id],
  );

  const counts = Object.fromEntries(stats.map((s) => [s.status, Number(s.total)]));
  const total = stats.reduce((sum, s) => sum + Number(s.total), 0);

  const cards = [
    { label: "On the shelf", value: total, note: "semua bacaan" },
    { label: "Reading", value: counts.reading ?? 0, note: "sedang berjalan" },
    { label: "Completed", value: counts.completed ?? 0, note: "sudah tamat" },
    { label: "Favourites", value: Number(fav?.total ?? 0), note: "ditandai" },
  ];

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-indian-red">
            Dashboard
          </p>
          <h1 className="display mt-1 text-3xl font-bold text-bistre sm:text-4xl">
            Good to see you, {user.name.split(" ")[0]}.
          </h1>
        </div>
        <Link href="/library" className="btn btn-primary">
          Manage library
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="ticket p-4 sm:p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-indian-red">
              {c.label}
            </p>
            <p className="display mt-2 text-3xl font-bold text-bistre">{c.value}</p>
            <p className="mt-1 text-xs text-ink/55">{c.note}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="ticket p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="display text-xl font-bold text-bistre">Recently touched</h2>
            <Link href="/library" className="text-sm text-indian-red underline-offset-4 hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">
              Belum ada bacaan. Tambahkan buku pertamamu di My Library.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {recent.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-bistre">{b.title}</p>
                    <p className="truncate text-xs text-ink/55">
                      {b.author ?? "Tanpa penulis"} · {b.category}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-indian-red">
                      {STATUS_LABEL[b.status]}
                    </p>
                    <p className="text-xs text-ink/55">
                      ch. {b.last_chapter}
                      {b.total_chapters ? ` / ${b.total_chapters}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ticket p-5 sm:p-6 lg:self-start">
          <div>
            <h2 className="display text-xl font-bold text-bistre">Average score</h2>
            <p className="mt-3 text-5xl font-bold text-garnet">
              {avg?.avg ? Number(avg.avg).toFixed(1) : "—"}
            </p>
            <p className="text-sm text-ink/55">dari rating yang sudah kamu beri</p>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            {(["want_to_read", "reading", "completed", "dropped"] as const).map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-ink/70">{STATUS_LABEL[s]}</span>
                <span className="h-2 flex-1 bg-cream">
                  <span
                    className="block h-2 bg-goldfinch"
                    style={{ width: total ? `${((counts[s] ?? 0) / total) * 100}%` : "0%" }}
                  />
                </span>
                <span className="w-6 text-right font-semibold text-bistre">{counts[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
