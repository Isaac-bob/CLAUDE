"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Mic, Monitor, Sparkles, type LucideIcon } from "lucide-react";
import { MODULES, type ModuleIcon } from "@/modules/registry";

const ICONS: Record<ModuleIcon, LucideIcon> = {
  file: FileText,
  mic: Mic,
  monitor: Monitor,
  languages: Sparkles,
  sparkles: Sparkles,
};

// Pestañas de servicios. Cada servicio vive en su propia sección (/pdf, /grabacion, …).
export function ModuleTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Servicios" className="print:hidden border-b border-navy-950/5 bg-white/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ul className="-mb-px flex gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MODULES.map((m) => {
            const href = `/${m.slug}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const Icon = ICONS[m.icon];
            return (
              <li key={m.slug} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    active ? "border-current text-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                  style={active ? { color: m.color } : undefined}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-lg transition group-hover:scale-105"
                    style={{ backgroundColor: `${m.color}1a`, color: m.color }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {m.name}
                  {m.status === "soon" && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Pronto
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
