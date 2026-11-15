import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <header className="flex flex-col items-start gap-3 border-b border-ink/15 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link href="/dashboard" className="display text-xl font-bold text-garnet">
          MyLunaList
        </Link>
        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Link href="/dashboard" className="btn btn-ghost px-2.5 text-[0.65rem] sm:px-5 sm:text-sm">
            Dashboard
          </Link>
          <Link href="/library" className="btn btn-ghost px-2.5 text-[0.65rem] sm:px-5 sm:text-sm">
            My Library
          </Link>
          <span className="hidden px-2 text-sm text-ink/60 md:inline">{user.name}</span>
          <LogoutButton />
        </nav>
      </header>
      <div className="py-8">{children}</div>
    </div>
  );
}
