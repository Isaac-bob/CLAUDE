import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Zap, FileText, Monitor, Mic } from "lucide-react";

const SERVICE_ICONS = { file: FileText, monitor: Monitor, mic: Mic, languages: Sparkles, sparkles: Sparkles } as const;
import { MODULES } from "@/modules/registry";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-600 via-violet-600 to-gold-600 px-6 py-12 text-white shadow-[0_30px_60px_-30px_rgb(79_70_229/0.6)] sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/20">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Herramientas digitales, sencillas y gratuitas
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Todo lo que necesitas para tus documentos, en un solo lugar.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-navy-100">
            Elige un servicio, sube tu archivo y listo. Sin instalar nada y sin complicaciones.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pdf" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-navy-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              Empezar con PDF <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {!user && (
              <Link href="/cuenta" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold ring-1 ring-white/30 transition hover:bg-white/20">
                Crear cuenta gratis
              </Link>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="servicios-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="servicios-title" className="text-2xl font-extrabold tracking-tight">Servicios</h2>
            <p className="text-muted">Cada servicio tiene su propia sección. Elige el que necesites.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const card = (
              <article className="card group flex h-full flex-col p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md" style={{ backgroundColor: m.color }}>
                    {(() => { const Icon = SERVICE_ICONS[m.icon]; return <Icon className="h-6 w-6" aria-hidden="true" />; })()}
                  </span>
                  {m.status === "soon" ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">Próximamente</span>
                  ) : (
                    <span className="rounded-full bg-success-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-success-700">Disponible</span>
                  )}
                </div>
                <h3 className="mt-5 text-xl font-bold">{m.name}</h3>
                <p className="mt-1 font-medium" style={{ color: m.color }}>{m.tagline}</p>
                <p className="mt-3 flex-1 text-sm text-muted">{m.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink group-hover:gap-2 transition-all">
                  {m.status === "available" ? "Abrir" : "Ver novedades"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </article>
            );
            return (
              <Link key={m.slug} href={`/${m.slug}`} className="block rounded-[var(--radius-card)] focus-visible:outline-none">
                {card}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3" aria-label="Garantías">
        {[
          { icon: ShieldCheck, t: "Tus archivos, tuyos", d: "No guardamos el contenido de tus documentos. Solo registramos datos técnicos de la operación." },
          { icon: Zap, t: "Rápido y sin instalar", d: "Todo funciona en el navegador, en el móvil o en el ordenador." },
          { icon: Sparkles, t: "Pensado para todos", d: "Textos claros y pasos guiados. Si sabes usar un correo, sabes usar Síntesis." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="card p-6">
            <Icon className="h-6 w-6 text-navy-800" aria-hidden="true" />
            <h3 className="mt-3 font-bold">{t}</h3>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
