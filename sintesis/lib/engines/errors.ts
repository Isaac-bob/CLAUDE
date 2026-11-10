// Errores de motor. Se identifican por `name` (Next.js puede duplicar módulos entre bundles).
export class EngineError extends Error {
  override name = "EngineError";
}
// El motor (binario, clave o servicio) no está configurado en este servidor.
export class EngineMissingError extends Error {
  override name = "EngineMissingError";
}
export const isEngineError = (e: unknown): e is EngineError => e instanceof Error && e.name === "EngineError";
export const isEngineMissingError = (e: unknown): e is EngineMissingError =>
  e instanceof Error && e.name === "EngineMissingError";
