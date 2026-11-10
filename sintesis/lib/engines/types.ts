import type { Workdir } from "./workdir";
import { PdfInputError } from "../pdf/errors";

// Tipos de entrada reconocidos por firma binaria (magic bytes), nunca por extensión.
export type InputKind =
  | "pdf"
  | "jpg"
  | "png"
  | "image"
  | "docx"
  | "xlsx"
  | "pptx"
  | "epub"
  | "djvu"
  | "audio";

export type InputFile = {
  slot: string;
  kind: InputKind;
  name: string; // nombre original saneado (solo para mostrar)
  path: string; // ruta dentro del workdir (nombre generado por el servidor)
  size: number;
};

export type EngineOutput =
  | { kind: "file"; name: string; path: string; mime: string }
  | { kind: "text"; title: string; text: string }
  | { kind: "link"; name: string; url: string; expiresAt: string };

export type EngineContext = {
  wd: Workdir;
  inputs: InputFile[];
  opts: Record<string, string>;
  baseName: string; // nombre base para los resultados (sin extensión)
  userId?: string | null;
};

export type EngineFn = (ctx: EngineContext) => Promise<EngineOutput[]>;

export function input(ctx: EngineContext, slot?: string): InputFile {
  const f = ctx.inputs.find((i) => (slot ? i.slot === slot : true));
  if (!f) throw new PdfInputError(slot ? `Falta el archivo «${slot}».` : "Falta el archivo de entrada.");
  return f;
}

export function inputs(ctx: EngineContext, slot?: string): InputFile[] {
  return ctx.inputs.filter((i) => (slot ? i.slot === slot : true));
}

export function opt(ctx: EngineContext, key: string, fallback = ""): string {
  return (ctx.opts[key] ?? fallback).toString().trim();
}

export function optNum(ctx: EngineContext, key: string, fallback: number, min?: number, max?: number): number {
  const n = Number(opt(ctx, key, String(fallback)).replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

export function optBool(ctx: EngineContext, key: string, fallback = false): boolean {
  const v = opt(ctx, key, "");
  if (v === "") return fallback;
  return v === "true" || v === "on" || v === "1";
}
