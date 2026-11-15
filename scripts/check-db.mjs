import mysql from "mysql2/promise";

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const missing = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter(
  (k) => !process.env[k],
);
if (missing.length) {
  console.error(`Env belum lengkap: ${missing.join(", ")} (cek .env.local)`);
  process.exit(1);
}

const base = {
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  // ponytail: Aiven CA tidak di-bundle; verifikasi cert dimatikan.
  // Upgrade: ssl: { ca: fs.readFileSync("certs/aiven-ca.pem") }
  ssl: { rejectUnauthorized: false },
  connectTimeout: 15000,
};

let conn;
try {
  conn = await mysql.createConnection(base);
  const [[one]] = await conn.query("SELECT 1 AS ok");
  const [[ver]] = await conn.query("SELECT VERSION() AS version");
  const [dbs] = await conn.query("SHOW DATABASES");

  console.log("SELECT 1 ->", one.ok);
  console.log("Versi server ->", ver.version);
  console.log("Databases ->", dbs.map((d) => Object.values(d)[0]).join(", "));

  const [existing] = await conn.query(
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
    [DB_NAME],
  );
  if (!existing.length) {
    await conn.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database ${DB_NAME} dibuat.`);
  } else {
    console.log(`Database ${DB_NAME} sudah ada.`);
  }

  await conn.changeUser({ database: DB_NAME });
  const [tables] = await conn.query("SHOW TABLES");
  console.log(`Tabel di ${DB_NAME} ->`, tables.length ? tables.map((t) => Object.values(t)[0]).join(", ") : "(kosong)");
} catch (err) {
  console.error("GAGAL:", err.code ?? err.name, "-", err.message);
  process.exit(1);
} finally {
  await conn?.end().catch(() => {});
}
