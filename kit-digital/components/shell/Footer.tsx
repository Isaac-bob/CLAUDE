import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-indigo-950/5 bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Kit Digital. Tus archivos se procesan y se eliminan al terminar.</p>
        <nav className="flex gap-5" aria-label="Legal">
          <Link href="/cuenta" className="hover:text-ink">Mi cuenta</Link>
          <Link href="/pdf" className="hover:text-ink">Herramientas PDF</Link>
        </nav>
      </div>
    </footer>
  );
}
