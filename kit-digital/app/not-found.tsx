import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-600">Error 404</p>
      <h1 className="mt-2 text-3xl font-extrabold">No encontramos esta página</h1>
      <p className="mt-3 text-muted">Puede que el enlace haya cambiado. Vuelve al inicio y encuentra lo que buscas.</p>
      <Link href="/" className="btn-primary mt-6">Ir al inicio</Link>
    </div>
  );
}
