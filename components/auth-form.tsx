"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

export function AuthForm({ defaultMode }: { defaultMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister ? form : { email: form.email, password: form.password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFieldErrors(json.fieldErrors ?? {});
        setError(json.error ?? "Terjadi kesalahan, coba lagi");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server");
    } finally {
      setBusy(false);
    }
  }

  const err = (name: string) => fieldErrors[name]?.[0];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="display mb-8 text-xl font-bold text-garnet">
        MyLunaList
      </Link>

      <div className="ticket p-6 sm:p-8">
        <h1 className="display text-3xl font-bold text-bistre">
          {isRegister ? "Open your list" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-ink/65">
          {isRegister
            ? "Buat akun untuk mulai menyimpan bacaanmu."
            : "Masuk untuk melanjutkan bacaanmu."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label="Pilih mode">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`btn ${mode === m ? "btn-primary" : "btn-ghost"}`}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {isRegister && (
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
                aria-invalid={Boolean(err("name"))}
                aria-describedby={err("name") ? "name-error" : undefined}
              />
              {err("name") && (
                <p id="name-error" className="mt-1 text-sm text-garnet">
                  {err("name")}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              aria-invalid={Boolean(err("email"))}
              aria-describedby={err("email") ? "email-error" : undefined}
            />
            {err("email") && (
              <p id="email-error" className="mt-1 text-sm text-garnet">
                {err("email")}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={isRegister ? "new-password" : "current-password"}
              aria-invalid={Boolean(err("password"))}
              aria-describedby={err("password") ? "password-error" : undefined}
            />
            {err("password") && (
              <p id="password-error" className="mt-1 text-sm text-garnet">
                {err("password")}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="border border-garnet/40 bg-garnet/5 px-3 py-2 text-sm text-garnet">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Memproses…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
