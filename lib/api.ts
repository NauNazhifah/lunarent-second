import { NextResponse } from "next/server";
import { getSessionUser, SessionUnavailableError, type SessionUser } from "@/lib/auth";

type Guard = { user: SessionUser; response?: never } | { user?: never; response: NextResponse };

/**
 * Beda antara "tidak login" (401) dan "database tidak merespons" (503).
 * Sebelumnya kedua kondisi sama-sama jadi 401 sehingga user disuruh login ulang
 * padahal sesinya sah.
 */
export async function authOrResponse(): Promise<Guard> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        response: NextResponse.json(
          { error: "Sesi tidak valid atau sudah berakhir. Silakan masuk lagi." },
          { status: 401 },
        ),
      };
    }
    return { user };
  } catch (err) {
    if (err instanceof SessionUnavailableError) {
      return {
        response: NextResponse.json(
          { error: "Database sedang tidak merespons. Coba lagi sebentar lagi." },
          { status: 503 },
        ),
      };
    }
    throw err;
  }
}
