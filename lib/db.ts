import mysql from "mysql2/promise";

const g = globalThis as unknown as { __mlPool?: mysql.Pool };

export function getPool(): mysql.Pool {
  if (!g.__mlPool) {
    g.__mlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // ponytail: Aiven CA tidak di-bundle; verifikasi cert dimatikan.
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 15000,
      timezone: "Z",
    });
  }
  return g.__mlPool;
}
