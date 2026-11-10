import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MODULES, getModule } from "@/modules/registry";
import { Bell, ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ module: string }> };

export function generateStaticParams() {
  return MODULES.map((m) => ({ module: m.slug }));
}

// Servicios aún no disponibles: muestran una sección informativa con el mismo diseño.
export default async function ModulePage({ params }: Props) {
  const { module: slug } = await params;
  const mod = getModule(slug);
  if (!mod) notFound();
  if (mod.slug === "pdf") redirect("/pdf");
  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a servicios
      </Link>
      <section className="card p-8 sm:p-12 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg" style={{ backgroundColor: mod.color }}>
          <Bell className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{mod.name}</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">{mod.description}</p>
        <p className="mx-auto mt-6 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
          Estamos preparando este servicio. Muy pronto estará disponible.
        </p>
      </section>
    </div>
  );
}
