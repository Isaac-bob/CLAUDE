"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export function ResetPanel({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar el enlace.");
      setDone(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo cambiar la contraseña.");
      setDone("Tu contraseña se ha cambiado. Ya puedes entrar con la nueva.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success-600" aria-hidden="true" />
        <p className="mt-4 font-semibold">{done}</p>
        <Link href="/cuenta" className="btn-primary mt-6">Ir a mi cuenta</Link>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold">{token ? "Crea una nueva contraseña" : "Recuperar contraseña"}</h1>
      <p className="mt-1 text-sm text-muted">
        {token ? "Elige una contraseña de al menos 10 caracteres, con letras y números." : "Te enviaremos un enlace válido durante 30 minutos."}
      </p>
      {token ? (
        <form onSubmit={setNewPassword} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="new-password">Nueva contraseña</label>
            <input id="new-password" type="password" autoComplete="new-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Guardar contraseña
          </button>
        </form>
      ) : (
        <form onSubmit={requestLink} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="reset-email">Correo electrónico</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input id="reset-email" type="email" autoComplete="email" className="field pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Enviar enlace
          </button>
        </form>
      )}
    </div>
  );
}
