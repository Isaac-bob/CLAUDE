"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PDF_TOOLS } from "@/modules/pdf/tools";
import { ToolIcon } from "./ToolIcon";

// Sub-pestañas dentro de la sección PDF para cambiar de herramienta sin volver al inicio.
export function PdfToolTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Herramientas PDF" className="mb-6">
      <ul className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PDF_TOOLS.map((t) => {
          const href = `/pdf/${t.slug}`;
          const active = pathname === href;
          return (
            <li key={t.slug} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
                    : "bg-white text-ink ring-1 ring-indigo-950/10 hover:bg-rose-50"
                }`}
              >
                <ToolIcon icon={t.icon} className="h-4 w-4" />
                {t.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
