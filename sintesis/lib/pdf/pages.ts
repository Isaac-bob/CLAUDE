import { PdfInputError } from "./errors";

// Convierte "1-3, 5, 8-9" en índices base 0 ordenados sin duplicados.
export function parsePageSpec(spec: string, total: number): number[] {
  const cleaned = spec.replace(/\s+/g, "");
  if (!cleaned) throw new PdfInputError("Indica al menos una página.");
  const set = new Set<number>();
  for (const part of cleaned.split(",")) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new PdfInputError(`Rango no válido: "${part}". Usa formatos como 1-3 o 5.`);
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    if (from < 1 || to < 1) throw new PdfInputError("Las páginas empiezan en 1.");
    if (from > to) throw new PdfInputError(`El rango "${part}" está al revés.`);
    if (to > total) throw new PdfInputError(`El PDF solo tiene ${total} páginas.`);
    for (let p = from; p <= to; p++) set.add(p - 1);
  }
  return [...set].sort((a, b) => a - b);
}

// Lista de páginas en orden exacto (permite repetir y reordenar). Devuelve índices base 0.
export function parseOrderedPages(spec: string, total: number): number[] {
  const cleaned = spec.replace(/\s+/g, "");
  if (!cleaned) throw new PdfInputError("Indica el orden de las páginas, por ejemplo 3,1,2.");
  return cleaned.split(",").map((part) => {
    if (!/^\d+$/.test(part)) throw new PdfInputError(`Número de página no válido: "${part}".`);
    const n = Number(part);
    if (n < 1 || n > total) throw new PdfInputError(`La página ${n} no existe (el PDF tiene ${total}).`);
    return n - 1;
  });
}
