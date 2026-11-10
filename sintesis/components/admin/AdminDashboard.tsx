"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import { PDF_TOOLS } from "@/modules/pdf/catalog";

type Stats = {
  users: number; activeUsers: number; admins: number; jobsTotal: number; jobsWeek: number; jobsFailedWeek: number;
  byTool: { tool: string; count: number }[];
};
type User = { id: string; email: string; name: string; role: "USER" | "ADMIN"; isActive: boolean; createdAt: string; lastLoginAt: string | null; jobs: number };
type Job = { id: string; tool: string; status: string; inputFiles: number; inputBytes: number; outputBytes: number | null; errorMessage: string | null; durationMs: number | null; createdAt: string; user: { email: string; name: string } | null };

const toolName = (s: string) => PDF_TOOLS.find((t) => t.slug === s)?.name ?? s;
const kb = (n: number | null) => (n === null ? "—" : n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

export function AdminDashboard({ currentUserId }: { currentUserId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [engines, setEngines] = useState<{ binaries: { name: string; ok: boolean }[]; services: { name: string; ok: boolean }[] } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const refreshStats = useCallback(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats).catch(() => undefined);
  }, []);

  // Cada efecto ignora respuestas antiguas si el filtro cambia mientras se espera la red.
  useEffect(() => { refreshStats(); }, [refreshStats]);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/engines").then((r) => (r.ok ? r.json() : null)).then((d) => { if (active && d) setEngines(d); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      fetch(`/api/admin/users?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (active && d) setUsers(d.users); })
        .catch(() => undefined);
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [q, refreshVersion]);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/jobs${jobFilter ? `?status=${jobFilter}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setJobs(d.jobs); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [jobFilter]);

  async function patchUser(id: string, data: { role?: "USER" | "ADMIN"; isActive?: boolean }) {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMessage({ type: "err", text: body.error ?? "No se pudo actualizar el usuario." });
      return;
    }
    setMessage({ type: "ok", text: "Cambios guardados." });
    setRefreshVersion((v) => v + 1);
    refreshStats();
  }

  const cards = stats
    ? [
        { label: "Usuarios", value: stats.users, sub: `${stats.activeUsers} activos`, icon: Users, c: "text-navy-600 bg-navy-50" },
        { label: "Operaciones (7 días)", value: stats.jobsWeek, sub: `${stats.jobsTotal} en total`, icon: Activity, c: "text-success-600 bg-success-50" },
        { label: "Errores (7 días)", value: stats.jobsFailedWeek, sub: "revisar en la tabla", icon: AlertTriangle, c: "text-danger-600 bg-danger-50" },
        { label: "Administradores", value: stats.admins, sub: "con acceso completo", icon: ShieldCheck, c: "text-navy-600 bg-gold-50" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Panel de administración</h1>
        <p className="text-muted">Resumen de uso, usuarios y operaciones de la plataforma.</p>
      </div>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.length === 0 && <p className="text-muted">Cargando indicadores…</p>}
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${c.c}`}><c.icon className="h-5 w-5" aria-hidden="true" /></span>
            <p className="mt-4 text-sm text-muted">{c.label}</p>
            <p className="text-3xl font-extrabold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted">{c.sub}</p>
          </div>
        ))}
      </section>

      {engines && (
        <section className="card p-6" aria-labelledby="engines-title">
          <h2 id="engines-title" className="font-bold">Motores y servicios del servidor</h2>
          <p className="text-sm text-muted">Las herramientas que no aparecen como disponibles responden con un aviso de configuración en lugar de fallar.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[...engines.binaries, ...engines.services].map((e) => (
              <li key={e.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="truncate">{e.name}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${e.ok ? "bg-success-50 text-success-800" : "bg-amber-50 text-amber-800"}`}>{e.ok ? "Disponible" : "No configurado"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats && stats.byTool.length > 0 && (
        <section className="card p-6" aria-labelledby="tools-usage">
          <h2 id="tools-usage" className="font-bold">Herramientas más usadas</h2>
          <ul className="mt-4 space-y-3">
            {stats.byTool.map((t) => {
              const max = Math.max(...stats.byTool.map((x) => x.count));
              return (
                <li key={t.tool} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm">
                  <span className="truncate font-medium">{toolName(t.tool)}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-navy-500 to-gold-500" style={{ width: `${(t.count / max) * 100}%` }} />
                  </div>
                  <span className="text-right tabular-nums text-muted">{t.count}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {message && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ring-1 ${message.type === "ok" ? "bg-success-50 text-success-800 ring-success-200" : "bg-danger-50 text-danger-800 ring-danger-200"}`}>
          {message.text}
        </p>
      )}

      <section className="card p-6" aria-labelledby="users-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="users-title" className="font-bold">Usuarios</h2>
          <input className="field sm:max-w-xs" placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-3 font-semibold">Usuario</th>
                <th className="py-2 pr-3 font-semibold">Rol</th>
                <th className="py-2 pr-3 font-semibold">Estado</th>
                <th className="py-2 pr-3 font-semibold">Operaciones</th>
                <th className="py-2 font-semibold">Último acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/5">
              {users.map((u) => {
                const self = u.id === currentUserId;
                return (
                  <tr key={u.id}>
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <select aria-label={`Rol de ${u.email}`} className="field !py-1.5 !text-sm" value={u.role} disabled={self} onChange={(e) => patchUser(u.id, { role: e.target.value as "USER" | "ADMIN" })}>
                        <option value="USER">Usuario</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </td>
                    <td className="py-3 pr-3">
                      <button type="button" disabled={self} onClick={() => patchUser(u.id, { isActive: !u.isActive })}
                        className={`rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50 ${u.isActive ? "bg-success-50 text-success-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.isActive ? "Activo" : "Desactivado"}
                      </button>
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{u.jobs}</td>
                    <td className="py-3 text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("es-ES") : "Nunca"}</td>
                  </tr>
                );
              })}
              {users.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted">Sin resultados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6" aria-labelledby="jobs-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="jobs-title" className="font-bold">Operaciones recientes</h2>
          <select aria-label="Filtrar por estado" className="field sm:max-w-[220px]" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="SUCCEEDED">Completadas</option>
            <option value="FAILED">Con error</option>
            <option value="RUNNING">En proceso</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-3 font-semibold">Fecha</th>
                <th className="py-2 pr-3 font-semibold">Herramienta</th>
                <th className="py-2 pr-3 font-semibold">Usuario</th>
                <th className="py-2 pr-3 font-semibold">Entrada → salida</th>
                <th className="py-2 pr-3 font-semibold">Estado</th>
                <th className="py-2 font-semibold">Tiempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/5">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="py-3 pr-3 whitespace-nowrap text-muted">{new Date(j.createdAt).toLocaleString("es-ES")}</td>
                  <td className="py-3 pr-3 font-medium">{toolName(j.tool)}</td>
                  <td className="py-3 pr-3 text-muted">{j.user?.email ?? "Anónimo"}</td>
                  <td className="py-3 pr-3 tabular-nums">{kb(j.inputBytes)} → {kb(j.outputBytes)}</td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${j.status === "SUCCEEDED" ? "bg-success-50 text-success-700" : j.status === "FAILED" ? "bg-danger-50 text-danger-700" : "bg-amber-50 text-amber-700"}`}>
                      {j.status === "SUCCEEDED" ? "Completada" : j.status === "FAILED" ? "Error" : "En proceso"}
                    </span>
                    {j.errorMessage && <p className="mt-1 max-w-xs truncate text-xs text-danger-700" title={j.errorMessage}>{j.errorMessage}</p>}
                  </td>
                  <td className="py-3 tabular-nums text-muted">{j.durationMs ? `${j.durationMs} ms` : "—"}</td>
                </tr>
              ))}
              {jobs.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted">Sin operaciones.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
