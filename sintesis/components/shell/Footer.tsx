import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="print:hidden border-t border-navy-900/5 bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 rounded-full" />
          <p>© {new Date().getFullYear()} Síntesis. Tus archivos se procesan y se eliminan al terminar.</p>
        </div>
        <nav className="flex flex-wrap gap-5" aria-label="Pie de página">
          <Link href="/pdf" className="hover:text-navy-900">Herramientas PDF</Link>
          <Link href="/marca" className="hover:text-navy-900">Manual de marca</Link>
          <Link href="/cuenta" className="hover:text-navy-900">Mi cuenta</Link>
        </nav>
      </div>
    </footer>
  );
}
