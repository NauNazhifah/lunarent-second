"use client";

import { useState } from "react";

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

type Payload = {
  title: string;
  author: string;
  category: string;
  status: string;
  lastChapter: string;
  totalChapters: string;
  rating: string;
  review: string;
  coverUrl: string;
  isFavorite: boolean;
};

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

function toPayload(book?: Book): Payload {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    category: book?.category ?? "novel",
    status: book?.status ?? "want_to_read",
    lastChapter: book ? String(book.lastChapter) : "0",
    totalChapters: book?.totalChapters != null ? String(book.totalChapters) : "",
    rating: book?.rating != null ? String(book.rating) : "",
    review: book?.review ?? "",
    coverUrl: book?.coverUrl ?? "",
    isFavorite: book?.isFavorite ?? false,
  };
}

export function BookForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Book;
  onSubmit: (body: unknown) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Payload>(toPayload(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function set<K extends keyof Payload>(key: K, value: Payload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body = {
      title: form.title,
      author: form.author,
      category: form.category,
      status: form.status,
      lastChapter: form.lastChapter === "" ? 0 : Number(form.lastChapter),
      totalChapters: form.totalChapters === "" ? null : Number(form.totalChapters),
      rating: form.rating === "" ? null : Number(form.rating),
      review: form.review,
      coverUrl: form.coverUrl,
      isFavorite: form.isFavorite,
    };

    const result = await onSubmit(body);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Gagal menyimpan");
      setFieldErrors(result.fieldErrors ?? {});
    }
  }

  const err = (name: string) => fieldErrors[name]?.[0];
  const errid = (name: string) => `book-${name}-error`;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="book-title">
          Title
        </label>
        <input
          id="book-title"
          className="field"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          aria-invalid={Boolean(err("title"))}
          aria-describedby={err("title") ? errid("title") : undefined}
        />
        {err("title") && (
          <p id={errid("title")} className="mt-1 text-sm text-garnet">
            {err("title")}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="book-author">
            Author
          </label>
          <input
            id="book-author"
            className="field"
            value={form.author}
            onChange={(e) => set("author", e.target.value)}
            aria-invalid={Boolean(err("author"))}
            aria-describedby={err("author") ? errid("author") : undefined}
          />
          {err("author") && (
            <p id={errid("author")} className="mt-1 text-sm text-garnet">
              {err("author")}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="book-category">
            Category
          </label>
          <select
            id="book-category"
            className="field"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="book-status">
            Status
          </label>
          <select
            id="book-status"
            className="field"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="book-rating">
            Rating (1–5)
          </label>
          <select
            id="book-rating"
            className="field"
            value={form.rating}
            onChange={(e) => set("rating", e.target.value)}
            aria-invalid={Boolean(err("rating"))}
            aria-describedby={err("rating") ? errid("rating") : undefined}
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </select>
          {err("rating") && (
            <p id={errid("rating")} className="mt-1 text-sm text-garnet">
              {err("rating")}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="book-last">
            Last chapter
          </label>
          <input
            id="book-last"
            type="number"
            min={0}
            className="field"
            value={form.lastChapter}
            onChange={(e) => set("lastChapter", e.target.value)}
            aria-invalid={Boolean(err("lastChapter"))}
            aria-describedby={err("lastChapter") ? errid("lastChapter") : undefined}
          />
          {err("lastChapter") && (
            <p id={errid("lastChapter")} className="mt-1 text-sm text-garnet">
              {err("lastChapter")}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="book-total">
            Total chapters
          </label>
          <input
            id="book-total"
            type="number"
            min={0}
            className="field"
            value={form.totalChapters}
            onChange={(e) => set("totalChapters", e.target.value)}
            aria-invalid={Boolean(err("totalChapters"))}
            aria-describedby={err("totalChapters") ? errid("totalChapters") : undefined}
          />
          {err("totalChapters") && (
            <p id={errid("totalChapters")} className="mt-1 text-sm text-garnet">
              {err("totalChapters")}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="book-cover">
          Cover URL
        </label>
        <input
          id="book-cover"
          className="field"
          placeholder="https://…"
          value={form.coverUrl}
          onChange={(e) => set("coverUrl", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="book-review">
          Personal review
        </label>
        <textarea
          id="book-review"
          className="field min-h-24"
          value={form.review}
          onChange={(e) => set("review", e.target.value)}
          aria-invalid={Boolean(err("review"))}
          aria-describedby={err("review") ? errid("review") : undefined}
        />
        {err("review") && (
          <p id={errid("review")} className="mt-1 text-sm text-garnet">
            {err("review")}
          </p>
        )}
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold text-bistre">
        <input
          type="checkbox"
          className="size-5 accent-garnet"
          checked={form.isFavorite}
          onChange={(e) => set("isFavorite", e.target.checked)}
        />
        Mark as favourite
      </label>

      {error && (
        <p role="alert" className="border border-garnet/40 bg-garnet/5 px-3 py-2 text-sm text-garnet">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Add to shelf"}
        </button>
      </div>
    </form>
  );
}
