"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, UserRound } from "lucide-react";

type Mode = "login" | "register";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({ name: "", email: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email: fields.email, password: fields.password } : fields;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar la acción.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="card p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Acceso">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={`rounded-lg py-2 text-sm font-semibold transition ${mode === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {m === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">
          {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta gratis"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "Accede para ver tu historial de operaciones." : "Con una cuenta guardas tu historial y ampliamos tus límites."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {mode === "register" && (
            <div>
              <label className="label" htmlFor="name">Nombre</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="name" name="name" autoComplete="name" className="field pl-10" value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} required />
              </div>
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Correo electrónico</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input id="email" name="email" type="email" autoComplete="email" className="field pl-10" value={fields.email} onChange={(e) => setFields({ ...fields, email: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="field pl-10"
                value={fields.password}
                onChange={(e) => setFields({ ...fields, password: e.target.value })}
                required
              />
            </div>
            {mode === "register" && <p className="hint">Mínimo 10 caracteres, con letras y números.</p>}
          </div>

          {error && <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-800 ring-1 ring-danger-200">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mode === "login" ? "Entrar" : "Crear mi cuenta"}
          </button>
        </form>

        {mode === "login" && (
          <p className="mt-5 text-center text-sm">
            <Link href="/recuperar" className="font-semibold text-navy-800 hover:underline">¿Olvidaste tu contraseña?</Link>
          </p>
        )}
      </div>
    </div>
  );
}
