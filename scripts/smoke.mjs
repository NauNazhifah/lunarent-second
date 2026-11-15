import mysql from "mysql2/promise";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

let cookie = "";
let failures = 0;

async function call(method, path, body, { auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth && cookie) headers.cookie = cookie;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = raw;
  }
  if (auth) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const pair = c.split(";")[0];
      if (pair.startsWith("ml_session=")) cookie = pair;
    }
  }
  return { status: res.status, json };
}

function check(name, cond, detail) {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name} :: ${JSON.stringify(detail)}`);
  }
}

const title = `Smoke Test ${Date.now()}`;
let id;

const login = await call("POST", "/api/auth/login", {
  email: "demo@mylunalist.test",
  password: "demo1234",
});
console.log("login ->", login.status, JSON.stringify(login.json));
check("login valid = 200", login.status === 200, login);

const badLogin = await call("POST", "/api/auth/login", {
  email: "demo@mylunalist.test",
  password: "salah-banget",
});
console.log("login salah ->", badLogin.status);
check("login salah = 401", badLogin.status === 401, badLogin);

const noAuth = await call("GET", "/api/books", undefined, { auth: false });
console.log("GET /api/books tanpa cookie ->", noAuth.status);
check("tanpa sesi = 401", noAuth.status === 401, noAuth);

const bad = await call("POST", "/api/books", {});
console.log("POST invalid ->", bad.status, JSON.stringify(bad.json));
check("POST invalid = 400", bad.status === 400, bad);

const created = await call("POST", "/api/books", {
  title,
  author: "Smoke Bot",
  category: "novel",
  status: "reading",
  lastChapter: 3,
  totalChapters: 20,
  rating: 4,
  review: "dibuat oleh smoke test",
});
console.log("POST valid ->", created.status, JSON.stringify(created.json));
check("POST valid = 201", created.status === 201, created);
id = created.json?.data?.id;
check("POST mengembalikan id", typeof id === "number", created.json);

const [dbNew] = await db.query("SELECT title, status, rating FROM books WHERE id = ?", [id]);
console.log("DB setelah POST ->", JSON.stringify(dbNew));
check("DB berisi baris baru", dbNew.length === 1 && dbNew[0].title === title, dbNew);

const list = await call(
  "GET",
  `/api/books?q=${encodeURIComponent("Smoke Test")}&sort=title&order=asc&page=1&limit=5`,
);
console.log("GET list ->", list.status, "total:", list.json?.meta?.total);
check(
  "GET list memuat buku baru",
  list.status === 200 && (list.json?.data ?? []).some((b) => b.id === id),
  list.json,
);

const byId = await call("GET", `/api/books/${id}`);
console.log("GET by id ->", byId.status, JSON.stringify(byId.json?.data?.title));
check("GET by id = 200", byId.status === 200 && byId.json?.data?.id === id, byId.json);

const badPatch = await call("PATCH", `/api/books/${id}`, { rating: 9 });
console.log("PATCH rating 9 ->", badPatch.status, JSON.stringify(badPatch.json));
check("PATCH rating invalid = 400", badPatch.status === 400, badPatch);

const patched = await call("PATCH", `/api/books/${id}`, { status: "completed", rating: 5 });
console.log("PATCH valid ->", patched.status, JSON.stringify(patched.json?.data));
check(
  "PATCH valid = 200 & berubah",
  patched.status === 200 && patched.json?.data?.status === "completed" && patched.json?.data?.rating === 5,
  patched.json,
);

const put = await call("PUT", `/api/books/${id}`, { isFavorite: true, lastChapter: 20 });
console.log("PUT valid ->", put.status, JSON.stringify(put.json?.data));
check(
  "PUT valid = 200 & favorit",
  put.status === 200 && put.json?.data?.isFavorite === true && put.json?.data?.lastChapter === 20,
  put.json,
);

const [dbPatched] = await db.query("SELECT status, rating, last_chapter FROM books WHERE id = ?", [id]);
console.log("DB setelah PATCH/PUT ->", JSON.stringify(dbPatched));
check(
  "DB mencerminkan perubahan",
  dbPatched.length === 1 && dbPatched[0].status === "completed" && Number(dbPatched[0].last_chapter) === 20,
  dbPatched,
);

const tooMany = await call("PUT", `/api/books/${id}`, { lastChapter: 99 });
console.log("PUT chapter > total ->", tooMany.status, JSON.stringify(tooMany.json));
check("chapter > total = 400", tooMany.status === 400, tooMany);

const missing = await call("GET", "/api/books/99999999");
console.log("GET id tidak ada ->", missing.status);
check("GET id tidak ada = 404", missing.status === 404, missing);

const delMissing = await call("DELETE", "/api/books/99999999");
console.log("DELETE id tidak ada ->", delMissing.status);
check("DELETE id tidak ada = 404", delMissing.status === 404, delMissing);

const del = await call("DELETE", `/api/books/${id}`);
console.log("DELETE valid ->", del.status, JSON.stringify(del.json));
check("DELETE = 200", del.status === 200, del);

const gone = await call("GET", `/api/books/${id}`);
console.log("GET setelah delete ->", gone.status);
check("GET setelah delete = 404", gone.status === 404, gone);

const [dbGone] = await db.query("SELECT COUNT(*) AS n FROM books WHERE id = ?", [id]);
console.log("DB setelah DELETE ->", JSON.stringify(dbGone));
check("DB sudah tidak berisi baris", Number(dbGone[0].n) === 0, dbGone);

await db.end();

console.log(`\n${failures === 0 ? "SEMUA PASS" : `${failures} GAGAL`}`);
process.exit(failures === 0 ? 0 : 1);
