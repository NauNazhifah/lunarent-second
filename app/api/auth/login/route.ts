import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { verifyPassword } from "@/lib/password.mjs";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  try {
    const [rows] = await getPool().query<
      (RowDataPacket & { id: number; email: string; name: string; password_hash: string })[]
    >("SELECT id, email, name, password_hash FROM users WHERE email = ? LIMIT 1", [email]);

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    await createSession(Number(user.id));
    return NextResponse.json({ user: { id: Number(user.id), email: user.email, name: user.name } });
  } catch {
    return NextResponse.json({ error: "Gagal masuk, coba lagi" }, { status: 500 });
  }
}
