import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between border-b border-ink/15 py-5">
        <span className="display text-xl font-bold tracking-tight text-garnet">MyLunaList</span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost px-2.5 text-[0.65rem] sm:px-5 sm:text-sm">
            Sign in
          </Link>
          <Link href="/login?mode=register" className="btn btn-primary px-2.5 text-[0.65rem] sm:px-5 sm:text-sm">
            Get started
          </Link>
        </nav>
      </header>

      <section className="grid flex-1 items-center gap-10 py-14 md:grid-cols-[1.15fr_0.85fr] md:py-20">
        <div>
          <p className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-indian-red">
            A personal reading archive
          </p>
          <h1 className="display text-4xl leading-[1.05] font-bold text-bistre sm:text-5xl lg:text-6xl">
            Keep every story
            <span className="block text-garnet">on one warm shelf.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">
            Novels, manhwa, manga, and comics — tracked chapter by chapter. Note what you loved,
            rate what you finished, and let your favourites stay within reach.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login?mode=register" className="btn btn-primary w-full sm:w-auto">
              Start my list
            </Link>
            <Link href="/login" className="btn btn-ghost w-full sm:w-auto">
              I already have one
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="stripe-band h-3 w-full" aria-hidden />
          <div className="ticket overflow-hidden p-6 sm:p-8">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-indian-red">
              Admit one
            </p>
            <p className="display mt-2 text-2xl font-bold text-bistre">Reading ticket</p>
            <div className="my-5 rule-ornament text-sm">✦</div>
            <dl className="space-y-3 text-sm">
              {[
                ["Novel", "quiet nights, long chapters"],
                ["Manhwa", "colour, motion, cliffhangers"],
                ["Manga", "ink and rhythm"],
                ["Comic", "panels that hit hard"],
              ].map(([kind, note]) => (
                <div key={kind} className="flex items-baseline justify-between gap-4">
                  <dt className="font-semibold text-bistre">{kind}</dt>
                  <dd className="text-right text-ink/60">{note}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 border-t border-dashed border-ink/25 pt-4 text-xs uppercase tracking-[0.2em] text-ink/50">
              No. 0001 · Est. 2026
            </div>
          </div>
          <div className="stripe-band mt-2 h-1.5 w-full" aria-hidden />
        </div>
      </section>

      <footer className="border-t border-ink/15 py-6 text-xs uppercase tracking-[0.2em] text-ink/50">
        MyLunaList · lunarent-second
      </footer>
    </main>
  );
}
