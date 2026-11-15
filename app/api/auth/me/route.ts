import { NextResponse } from "next/server";
import { getSessionUser, SessionUnavailableError } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof SessionUnavailableError) {
      return NextResponse.json(
        { error: "Database sedang tidak merespons. Coba lagi sebentar lagi." },
        { status: 503 },
      );
    }
    throw err;
  }
}
