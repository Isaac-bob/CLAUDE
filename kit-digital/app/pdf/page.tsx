import Link from "next/link";
import type { Metadata } from "next";
import { PDF_TOOLS } from "@/modules/pdf/tools";
import { ToolIcon } from "@/components/pdf/ToolIcon";

export const metadata: Metadata = { title: "PDF" };

const UPCOMING = ["Comprimir PDF", "PDF a Word", "PDF a JPG", "Proteger con contraseña", "Eliminar páginas en blanco"];

export default function PdfHomePage() {
  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-100" />
        <p className="relative text-sm font-bold uppercase tracking-widest text-rose-600">Servicio PDF</p>
        <h1 className="relative mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">¿Qué quieres hacer con tu PDF?</h1>
        <p className="relative mt-3 max-w-2xl text-muted">
          Elige una herramienta. Cada una te guía en tres pasos: subir, ajustar y descargar.
        </p>
      </section>

      <section aria-labelledby="tools-title">
        <h2 id="tools-title" className="sr-only">Herramientas disponibles</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PDF_TOOLS.map((t) => (
            <li key={t.slug}>
              <Link href={`/pdf/${t.slug}`} className="card group flex h-full flex-col p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 transition group-hover:bg-rose-600 group-hover:text-white">
                  <ToolIcon icon={t.icon} />
                </span>
                <h3 className="mt-5 text-lg font-bold">{t.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{t.summary}</p>
                <span className="mt-4 text-sm font-semibold text-rose-600">Usar herramienta →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] border border-dashed border-indigo-200 bg-white/60 p-6">
        <h2 className="font-bold">Próximamente en PDF</h2>
        <p className="mt-1 text-sm text-muted">Estas herramientas están en nuestra lista. Aún no están disponibles.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {UPCOMING.map((u) => (
            <li key={u} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-500">{u}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
