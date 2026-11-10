"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PDF_TOOLS } from "@/modules/pdf/tools";

type Job = {
  id: string;
  module: string;
  tool: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  inputFiles: number;
  outputName: string | null;
  errorMessage: string | null;
  createdAt: string;
};

const STATUS: Record<Job["status"], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  SUCCEEDED: { label: "Completada", icon: CheckCircle2, cls: "text-emerald-600" },
  FAILED: { label: "Con error", icon: XCircle, cls: "text-rose-600" },
  RUNNING: { label: "En proceso", icon: Clock, cls: "text-amber-600" },
  PENDING: { label: "En cola", icon: Clock, cls: "text-slate-500" },
};

export function AccountView({ user }: { user: { name: string; email: string; role: string; createdAt: string } }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => setError("No pudimos cargar tu historial."));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const toolName = (slug: string) => PDF_TOOLS.find((t) => t.slug === slug)?.name ?? slug;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="card h-fit p-6">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xl font-extrabold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="mt-4 text-xl font-extrabold">{user.name}</h1>
        <p className="text-sm text-muted break-all">{user.email}</p>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Tipo de cuenta</dt><dd className="font-semibold">{user.role === "ADMIN" ? "Administrador" : "Gratuita"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Miembro desde</dt><dd className="font-semibold">{new Date(user.createdAt).toLocaleDateString("es-ES")}</dd></div>
        </dl>
        <button type="button" onClick={logout} className="btn-ghost mt-6 w-full">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
        </button>
      </aside>

      <section className="card p-6" aria-labelledby="hist-title">
        <h2 id="hist-title" className="text-xl font-extrabold">Historial de operaciones</h2>
        <p className="text-sm text-muted">Tus últimas 50 tareas. Solo se muestran datos técnicos, nunca el contenido de los archivos.</p>
        {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
        {jobs === null && !error && <p className="mt-6 text-sm text-muted">Cargando…</p>}
        {jobs && jobs.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
            <p className="font-semibold">Todavía no tienes operaciones</p>
            <p className="mt-1 text-sm text-muted">Cuando proceses un archivo, aparecerá aquí.</p>
          </div>
        )}
        {jobs && jobs.length > 0 && (
          <ul className="mt-5 divide-y divide-indigo-950/5">
            {jobs.map((j) => {
              const s = STATUS[j.status];
              const Icon = s.icon;
              return (
                <li key={j.id} className="flex items-center gap-4 py-3">
                  <Icon className={`h-5 w-5 shrink-0 ${s.cls}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{toolName(j.tool)} <span className="font-normal text-muted">· {j.inputFiles} archivo{j.inputFiles > 1 ? "s" : ""}</span></p>
                    <p className="truncate text-xs text-muted">
                      {new Date(j.createdAt).toLocaleString("es-ES")} · {s.label}{j.errorMessage ? ` — ${j.errorMessage}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
