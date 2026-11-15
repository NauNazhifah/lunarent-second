# PROGRESS — MyLunaList (lunarent-second)

Terakhir diperbarui: 2026-11-15

## Status fase

| Fase | Status | Bukti |
|---|---|---|
| 0. Intake | Selesai | Nama web MyLunaList, proyek lunarent-second; 2 tabel; 4 halaman; UI campuran EN/ID; tema vintage carnival |
| 1. Kredensial Aiven | Selesai | `SELECT 1 -> 1`, MySQL 8.4.11, database `web_mylunalist` dibuat |
| 2. Skema (approval) | Selesai | ACC user |
| 3. Eksekusi skema | Selesai | `SHOW TABLES -> books, users`; seed 1 user + 8 books |
| 4. Scaffold | Selesai | Next.js 16 App Router + TS + Tailwind 4 + mysql2 + zod |
| 5. CRUD | Selesai | books + auth endpoints, UI library (modal, filter, pagination) |
| 6. Verifikasi | Selesai | build/typecheck/lint 0 (0 warning); smoke test 18 cek PASS; screenshot 375/1440 sudah dicek visual |

## Bukti verifikasi terakhir

- `npm run lint` → exit 0, 0 error 0 warning
- `npm run typecheck` → exit 0
- `npm run build` → exit 0 (Next.js 16.4.6, 10 route)
- `node --env-file=.env.local scripts/smoke.mjs` → `SEMUA PASS` (18 cek): login 200/401, tanpa sesi 401, POST invalid 400, POST 201, list/search/sort, GET id 200, PATCH rating 9 → 400, PATCH 200, PUT 200, chapter > total 400, GET/DELETE id hilang 404, DELETE 200, GET setelah delete 404, plus cek langsung ke MySQL (baris muncul/berubah/hilang).
- Screenshot: `screenshots/landing-375.png`, `login-375.png`, `library-375.png`, `dashboard-375.png`, `landing-1440.png`, `library-1440.png`, `dashboard-1440.png`.

## Struktur penting

```
app/page.tsx                     Landing
app/login/page.tsx               Login / Register
app/(app)/layout.tsx             Shell + guard sesi
app/(app)/dashboard/page.tsx     Dashboard (server query)
app/(app)/library/page.tsx       My Library (client CRUD)
app/api/auth/{login,register,logout,me}/route.ts
app/api/books/route.ts           GET list (search/sort/pagination), POST
app/api/books/[id]/route.ts      GET, PUT/PATCH, DELETE
components/{auth-form,book-form,library-client,modal,logout-button}.tsx
lib/{db,auth,validators,books}.ts   lib/password.mjs
scripts/{check-db,init-db,smoke,shots}.mjs
```

## Cara menjalankan

1. Isi `.env.local` (jangan di-commit):
   ```
   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=web_mylunalist
   SESSION_SECRET=<random hex>
   ```
2. `npm install`
3. `npm run db:check` — tes koneksi Aiven
4. `npm run db:init` — DDL idempotent + seed (hanya jika `users` kosong)
5. `npm run dev` → http://localhost:3000

Akun demo: `demo@mylunalist.test` / `demo1234`

## Perintah verifikasi

```
npm run lint
npm run typecheck
npm run build
node --env-file=.env.local scripts/smoke.mjs   # server harus jalan
node scripts/shots.mjs                          # screenshot 375/1440
```

## Deployment produksi

- URL: https://lunarent-second.vercel.app
- Project Vercel: `nazhi/lunarent-second` (framework Next.js, region default)
- Env production/preview/development: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET` (mirip `.env.local`)
- Verifikasi prod: landing 200, login demo 200, `GET /api/books` 200 (total 8), `POST /api/books` 201, `DELETE` 200, `/dashboard` tanpa sesi menampilkan halaman login
- Auto-deploy GitHub belum aktif: hubungkan repo lewat Vercel Dashboard → Settings → Git, atau `vercel git connect`

## Catatan / hutang teknis

- Perbaikan bug: kegagalan query sesi ke MySQL dulu disamarkan menjadi 401 ("belum login"). Sekarang `SessionUnavailableError` → HTTP 503, dan 401 hanya untuk sesi yang benar-benar tidak valid. Pool diberi `enableKeepAlive` + `idleTimeout` agar koneksi idle ke Aiven tidak mati diam-diam.
- TLS ke Aiven memakai `rejectUnauthorized:false` (CA Aiven belum di-bundle). Lihat komentar `ponytail:` di `lib/db.ts` & `scripts/check-db.mjs`.
- `scripts/shots.mjs` hanya untuk verifikasi lokal (headless Edge/Chrome via CDP), bukan bagian runtime.
- Belum ada reset password / verifikasi email (di luar lingkup 4 halaman).
