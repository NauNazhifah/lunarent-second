import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { hashPassword } from "@/lib/password.mjs";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const pool = getPool();

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if ((existing as unknown[]).length) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const [result] = await pool.query(
      "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
      [email, name, hashPassword(password)],
    );
    const id = (result as { insertId: number }).insertId;
    await createSession(id);
    return NextResponse.json({ user: { id, email, name } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mendaftar, coba lagi" }, { status: 500 });
  }
}
