// Error de validación de entrada: se muestra tal cual al usuario.
// Se identifica por `name` (no por instanceof) porque Next.js puede duplicar el módulo entre bundles.
export class PdfInputError extends Error {
  override name = "PdfInputError";
}

export function isPdfInputError(err: unknown): err is PdfInputError {
  return err instanceof Error && err.name === "PdfInputError";
}
