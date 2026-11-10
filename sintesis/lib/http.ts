import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isHttpError } from "./auth";
import { isPdfInputError } from "./pdf/errors";

// Convierte cualquier error en una respuesta JSON uniforme, sin filtrar detalles internos.
export function handleError(err: unknown) {
  if (isHttpError(err)) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (isPdfInputError(err)) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join(".") || "datos"}: ${first.message}` : "Datos no válidos." },
      { status: 400 },
    );
  }
  console.error("[api]", err);
  return NextResponse.json({ error: "Ha ocurrido un error inesperado. Inténtalo de nuevo." }, { status: 500 });
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : null;
}

// Limitador de peticiones en memoria (por proceso) para endpoints de autenticación.
const buckets = new Map<string, { count: number; resetAt: number }>();
// RATE_LIMIT_FACTOR multiplica los máximos (útil en pruebas automatizadas). Por defecto 1.
const FACTOR = Math.max(1, Number(process.env.RATE_LIMIT_FACTOR ?? 1) || 1);

export function rateLimit(key: string, baseMax: number, windowMs: number): boolean {
  const max = baseMax * FACTOR;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}
