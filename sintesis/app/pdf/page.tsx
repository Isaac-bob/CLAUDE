import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Info } from "lucide-react";
import { CATEGORIES, PDF_TOOLS, toolsByCategory } from "@/modules/pdf/catalog";
import { ToolIcon } from "@/components/pdf/ToolIcon";

export const metadata: Metadata = { title: "PDF" };

export default function PdfHomePage() {
  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-100" />
        <p className="relative text-sm font-bold uppercase tracking-widest text-navy-600">Servicio PDF</p>
        <h1 className="relative mt-2 font-serif text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">¿Qué quieres hacer con tu PDF?</h1>
        <p className="relative mt-3 max-w-2xl text-muted">
          {PDF_TOOLS.length} herramientas organizadas por tipo. Elige una, sigue tres pasos sencillos y descarga el resultado.
        </p>
        <nav aria-label="Categorías" className="relative mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy-900 ring-1 ring-navy-900/10 transition hover:bg-navy-900 hover:text-white">
              {c.label}
            </a>
          ))}
        </nav>
      </section>

      {CATEGORIES.map((c) => (
        <section key={c.id} id={c.id} aria-labelledby={`cat-${c.id}`} className="scroll-mt-28">
          <div className="mb-5">
            <h2 id={`cat-${c.id}`} className="font-serif text-2xl font-bold text-navy-900">{c.label}</h2>
            <p className="text-muted">{c.blurb}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolsByCategory(c.id).map((t) => (
              <li key={t.slug}>
                <Link href={`/pdf/${t.slug}`} className="card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 text-white transition group-hover:bg-gold-500">
                      <ToolIcon icon={t.icon} className="h-5 w-5" />
                    </span>
                    {t.requires && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-navy-900" title={t.requiresNote}>
                        <Info className="h-3 w-3" aria-hidden="true" /> Configuración
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-bold text-navy-900">{t.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted">{t.summary}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-900">
                    Usar herramienta <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
