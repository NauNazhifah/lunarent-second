"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookForm, type Book } from "@/components/book-form";
import { Modal } from "@/components/modal";

const CATEGORY_LABEL: Record<string, string> = {
  novel: "Novel",
  manhwa: "Manhwa",
  manga: "Manga",
  comic: "Comic",
};

const STATUS_LABEL: Record<string, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  completed: "Completed",
  dropped: "Dropped",
};

const STATUS_STYLE: Record<string, string> = {
  want_to_read: "bg-cream text-ink",
  reading: "bg-goldfinch text-bistre",
  completed: "bg-garnet text-parchment",
  dropped: "bg-ink/10 text-ink/70",
};

type Meta = { page: number; limit: number; total: number; totalPages: number };

type Filters = {
  q: string;
  status: string;
  category: string;
  favorite: string;
  sort: string;
};

export function LibraryClient() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    q: "",
    status: "",
    category: "",
    favorite: "",
    sort: "created_at",
  });
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [editor, setEditor] = useState<{ mode: "create" } | { mode: "edit"; book: Book } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const requestSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, q: search }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
    if (filters.favorite) params.set("favorite", filters.favorite);
    params.set("sort", filters.sort);
    params.set("page", String(page));
    params.set("limit", "12");

    try {
      const res = await fetch(`/api/books?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (seq !== requestSeq.current) return;
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Gagal memuat data buku");
        setBooks([]);
        return;
      }
      setBooks(json.data ?? []);
      setMeta(json.meta ?? { page: 1, limit: 12, total: 0, totalPages: 1 });
    } catch {
      if (seq === requestSeq.current) setError("Tidak bisa menghubungi server");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [filters, page, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch saat mount/perubahan filter: setState terjadi setelah request, bukan render berantai
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveBook(body: unknown) {
    const isEdit = editor?.mode === "edit";
    const url = isEdit ? `/api/books/${editor.book.id}` : "/api/books";
    try {
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login");
        return { ok: false, error: "Sesi berakhir. Silakan masuk lagi." };
      }
      if (!res.ok) {
        return {
          ok: false,
          error: json.error ?? "Gagal menyimpan buku",
          fieldErrors: json.fieldErrors ?? {},
        };
      }
      setEditor(null);
      setToast(isEdit ? "Buku diperbarui." : "Buku ditambahkan.");
      setReloadKey((k) => k + 1);
      return { ok: true };
    } catch {
      return { ok: false, error: "Tidak bisa menghubungi server" };
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyDelete(true);
    try {
      const res = await fetch(`/api/books/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setToast(json.error ?? "Gagal menghapus buku");
        return;
      }
      setDeleteTarget(null);
      setToast("Buku dihapus.");
      if (books.length === 1 && page > 1) setPage((p) => p - 1);
      else setReloadKey((k) => k + 1);
    } catch {
      setToast("Tidak bisa menghubungi server");
    } finally {
      setBusyDelete(false);
    }
  }

  const hasFilters = Boolean(filters.q || filters.status || filters.category || filters.favorite);

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-indian-red">
            My Library
          </p>
          <h1 className="display mt-1 text-3xl font-bold text-bistre sm:text-4xl">
            The shelf
            <span className="ml-2 align-middle text-base font-normal tracking-normal text-ink/55">
              {meta.total} bacaan
            </span>
          </h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditor({ mode: "create" })}>
          + Add book
        </button>
      </div>

      <div className="ticket mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="label" htmlFor="filter-search">
            Search
          </label>
          <input
            id="filter-search"
            className="field"
            placeholder="Judul atau penulis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="filter-status">
            Status
          </label>
          <select
            id="filter-status"
            className="field"
            value={filters.status}
            onChange={(e) => {
              setFilters((f) => ({ ...f, status: e.target.value }));
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            className="field"
            value={filters.category}
            onChange={(e) => {
              setFilters((f) => ({ ...f, category: e.target.value }));
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-sort">
            Sort
          </label>
          <select
            id="filter-sort"
            className="field"
            value={filters.sort}
            onChange={(e) => {
              setFilters((f) => ({ ...f, sort: e.target.value }));
              setPage(1);
            }}
          >
            <option value="created_at">Newest first</option>
            <option value="title">Title A–Z</option>
            <option value="rating">Highest rating</option>
            <option value="last_chapter">Latest chapter</option>
          </select>
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <label className="flex items-center gap-2 text-sm text-ink/75">
            <input
              type="checkbox"
              className="size-4 accent-garnet"
              checked={filters.favorite === "true"}
              onChange={(e) => {
                setFilters((f) => ({ ...f, favorite: e.target.checked ? "true" : "" }));
                setPage(1);
              }}
            />
            Favourites only
          </label>
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-3" aria-busy="true" aria-live="polite">
          <p className="text-sm text-ink/55">Memuat bacaan…</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-cream/70" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="ticket mt-6 border-garnet/40 p-5" role="alert">
          <p className="font-semibold text-garnet">{error}</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => setReloadKey((k) => k + 1)}>
            Coba lagi
          </button>
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <div className="ticket mt-6 p-8 text-center">
          <p className="display text-xl font-bold text-bistre">
            {hasFilters ? "No books match those filters" : "The shelf is still empty"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            {hasFilters
              ? "Coba longgarkan filter atau kata kunci pencarian."
              : "Tambahkan novel, manhwa, manga, atau komik pertamamu untuk mulai melacak progres."}
          </p>
          {!hasFilters && (
            <button type="button" className="btn btn-primary mt-5" onClick={() => setEditor({ mode: "create" })}>
              Add your first book
            </button>
          )}
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <>
          <div className="mt-6 hidden md:block">
            <table className="ticket w-full border-collapse text-left text-sm">
              <caption className="sr-only">Daftar bacaan pribadi</caption>
              <thead>
                <tr className="border-b border-ink/15 text-[0.65rem] uppercase tracking-[0.16em] text-indian-red">
                  <th scope="col" className="px-4 py-3">Title</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Progress</th>
                  <th scope="col" className="px-4 py-3">Rating</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id} className="border-b border-ink/8 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-bistre">
                        {b.isFavorite && <span className="mr-1 text-garnet" aria-label="Favourite">♥</span>}
                        {b.title}
                      </p>
                      <p className="text-xs text-ink/55">{b.author ?? "Tanpa penulis"}</p>
                    </td>
                    <td className="px-4 py-3 text-ink/75">{CATEGORY_LABEL[b.category]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${STATUS_STYLE[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/75">
                      {b.lastChapter}
                      {b.totalChapters ? ` / ${b.totalChapters}` : ""}
                    </td>
                    <td className="px-4 py-3 text-goldfinch">{b.rating ? "★".repeat(b.rating) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost px-3 text-xs"
                          onClick={() => setEditor({ mode: "edit", book: b })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost border-garnet/40 px-3 text-xs text-garnet"
                          onClick={() => setDeleteTarget(b)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {books.map((b) => (
              <li key={b.id} className="ticket p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-bistre">
                      {b.isFavorite && <span className="mr-1 text-garnet" aria-label="Favourite">♥</span>}
                      {b.title}
                    </p>
                    <p className="text-xs text-ink/55">{b.author ?? "Tanpa penulis"}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wider ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-ink/50">Category</dt>
                    <dd className="font-semibold text-ink/80">{CATEGORY_LABEL[b.category]}</dd>
                  </div>
                  <div>
                    <dt className="text-ink/50">Progress</dt>
                    <dd className="font-semibold text-ink/80">
                      {b.lastChapter}
                      {b.totalChapters ? ` / ${b.totalChapters}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink/50">Rating</dt>
                    <dd className="font-semibold text-goldfinch">{b.rating ? `${b.rating} ★` : "—"}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost flex-1 text-xs"
                    onClick={() => setEditor({ mode: "edit", book: b })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost flex-1 border-garnet/40 text-xs text-garnet"
                    onClick={() => setDeleteTarget(b)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/60">
              Halaman {meta.page} dari {meta.totalPages} · {meta.total} bacaan
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={editor !== null}
        title={editor?.mode === "edit" ? "Edit book" : "Add a book"}
        onClose={() => setEditor(null)}
      >
        {editor && (
          <BookForm
            initial={editor.mode === "edit" ? editor.book : undefined}
            onSubmit={saveBook}
            onCancel={() => setEditor(null)}
          />
        )}
      </Modal>

      <Modal open={deleteTarget !== null} title="Delete book" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-ink/75">
          Hapus <span className="font-semibold text-bistre">{deleteTarget?.title}</span> dari rak?
          Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirmDelete}
            disabled={busyDelete}
          >
            {busyDelete ? "Menghapus…" : "Yes, delete"}
          </button>
        </div>
      </Modal>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-sm border border-goldfinch/60 bg-bistre px-4 py-3 text-sm text-parchment shadow-lg sm:inset-x-auto sm:right-6"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
