import mysql from "mysql2/promise";
import { hashPassword } from "../lib/password.mjs";

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
for (const k of ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
  if (!process.env[k]) {
    console.error(`Env ${k} kosong (cek .env.local)`);
    process.exit(1);
  }
}

const conn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  // ponytail: Aiven CA tidak di-bundle; verifikasi cert dimatikan.
  ssl: { rejectUnauthorized: false },
  connectTimeout: 15000,
  multipleStatements: false,
});

const ddl = [
  `CREATE TABLE IF NOT EXISTS users (
     id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
     email VARCHAR(191) NOT NULL,
     name VARCHAR(80) NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY uq_email (email)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS books (
     id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
     user_id BIGINT UNSIGNED NOT NULL,
     title VARCHAR(200) NOT NULL,
     author VARCHAR(120) NULL,
     category ENUM('novel','manhwa','manga','comic') NOT NULL DEFAULT 'novel',
     status ENUM('want_to_read','reading','completed','dropped') NOT NULL DEFAULT 'want_to_read',
     last_chapter INT UNSIGNED NOT NULL DEFAULT 0,
     total_chapters INT UNSIGNED NULL,
     rating TINYINT UNSIGNED NULL,
     review TEXT NULL,
     cover_url VARCHAR(500) NULL,
     is_favorite TINYINT(1) NOT NULL DEFAULT 0,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     KEY idx_user_status (user_id, status),
     KEY idx_user_category (user_id, category),
     KEY idx_user_favorite (user_id, is_favorite),
     CONSTRAINT fk_books_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
     CONSTRAINT chk_books_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

for (const sql of ddl) await conn.query(sql);
console.log("DDL idempotent: OK");

const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM users");
if (n === 0) {
  const [res] = await conn.query(
    "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
    ["demo@mylunalist.test", "Demo Reader", hashPassword("demo1234")],
  );
  const uid = res.insertId;
  const books = [
    ["The Night Circus", "Erin Morgenstern", "novel", "completed", 412, 412, 5, "Magical duel, warm prose. Comfort reread.", 1],
    ["Solo Leveling", "Chugong", "manhwa", "reading", 179, null, 4, "Fast pace, great art.", 1],
    ["Vagabond", "Takehiko Inoue", "manga", "reading", 122, 327, 5, "Ink work is unmatched.", 0],
    ["Paper Girls", "Brian K. Vaughan", "comic", "want_to_read", 0, 30, null, null, 0],
    ["Piranesi", "Susanna Clarke", "novel", "want_to_read", 0, 245, null, null, 0],
    ["Tower of God", "SIU", "manhwa", "dropped", 78, null, 3, "Lost steam after season one.", 0],
    ["Berserk", "Kentaro Miura", "manga", "completed", 364, 364, 5, "A landmark. Handle with care.", 1],
    ["Saga", "Brian K. Vaughan", "comic", "reading", 24, 66, 4, "Consistently bold.", 0],
  ];
  await conn.query(
    `INSERT INTO books (user_id,title,author,category,status,last_chapter,total_chapters,rating,review,is_favorite) VALUES ${books
      .map(() => "(?,?,?,?,?,?,?,?,?,?)")
      .join(",")}`,
    books.flatMap((b) => [uid, ...b]),
  );
  console.log(`Seed: 1 user + ${books.length} books`);
} else {
  console.log(`Seed dilewati (users sudah ${n} baris)`);
}

const [tables] = await conn.query("SHOW TABLES");
console.log("SHOW TABLES ->", tables.map((t) => Object.values(t)[0]).join(", "));
for (const t of ["users", "books"]) {
  const [cols] = await conn.query(`DESCRIBE \`${t}\``);
  console.log(`\nDESCRIBE ${t}:`);
  for (const c of cols) console.log(`  ${c.Field} | ${c.Type} | null=${c.Null} | default=${c.Default}`);
}
for (const t of ["users", "books"]) {
  const [[{ c }]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
  console.log(`COUNT ${t} -> ${c}`);
}

await conn.end();
