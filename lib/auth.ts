import { createHmac, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPool } from "@/lib/db";

const COOKIE = "ml_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = { id: number; email: string; name: string };

export class SessionUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Gagal memeriksa sesi ke database");
    this.name = "SessionUnavailableError";
    this.cause = cause;
  }
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET belum diset di .env.local");
  return s;
}

function sign(uid: number, exp: number) {
  return createHmac("sha256", secret()).update(`${uid}.${exp}`).digest("base64url");
}

export async function createSession(userId: number) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const jar = await cookies();
  jar.set(COOKIE, `${userId}.${exp}.${sign(userId, exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [uid, exp, mac] = raw.split(".");
  if (!uid || !exp || !mac) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;

  const expected = Buffer.from(sign(Number(uid), Number(exp)));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const [rows] = await getPool().query<(RowDataPacket & SessionUser)[]>(
      "SELECT id, email, name FROM users WHERE id = ? LIMIT 1",
      [Number(uid)],
    );
    return rows[0] ?? null;
  } catch (err) {
    throw new SessionUnavailableError(err);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
