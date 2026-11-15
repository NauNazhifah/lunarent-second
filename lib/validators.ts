import { z } from "zod";

export const CATEGORIES = ["novel", "manhwa", "manga", "comic"] as const;
export const STATUSES = ["want_to_read", "reading", "completed", "dropped"] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80, "Nama maksimal 80 karakter"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid").max(191),
  password: z.string().min(8, "Password minimal 8 karakter").max(72, "Password maksimal 72 karakter"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

// Semua field opsional: nilai `undefined` berarti "tidak diubah" (penting untuk PATCH).
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .transform((v) => (v === "" ? null : v))
    .optional();

const chapter = z
  .union([z.literal(""), z.null(), z.coerce.number().int().min(0, "Tidak boleh negatif").max(100000)])
  .transform((v) => (v === "" || v === null ? 0 : v))
  .optional();

const nullableChapter = z
  .union([z.literal(""), z.null(), z.coerce.number().int().min(0, "Tidak boleh negatif").max(100000)])
  .transform((v) => (v === "" || v === null ? null : v))
  .optional();

const rating = z
  .union([
    z.literal(""),
    z.null(),
    z.coerce.number().int("Rating harus bilangan bulat").min(1, "Rating 1–5").max(5, "Rating 1–5"),
  ])
  .transform((v) => (v === "" || v === null ? null : v))
  .optional();

const favorite = z
  .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal(0), z.literal(1)])
  .transform((v) => v === true || v === "true" || v === 1)
  .optional();

const bookFields = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
  author: text(120),
  category: z.enum(CATEGORIES, { message: "Kategori tidak dikenal" }),
  status: z.enum(STATUSES, { message: "Status tidak dikenal" }),
  lastChapter: chapter,
  totalChapters: nullableChapter,
  rating,
  review: text(2000),
  coverUrl: text(500),
  isFavorite: favorite,
});

export const bookCreateSchema = bookFields.extend({
  category: z.enum(CATEGORIES, { message: "Kategori tidak dikenal" }).default("novel"),
  status: z.enum(STATUSES, { message: "Status tidak dikenal" }).default("want_to_read"),
});

export const bookUpdateSchema = bookFields.partial();

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  favorite: z.enum(["true", "false"]).optional(),
  sort: z.enum(["title", "created_at", "rating", "last_chapter"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type BookInput = z.infer<typeof bookCreateSchema>;
