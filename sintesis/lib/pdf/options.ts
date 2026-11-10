import type { FieldOption, PdfTool } from "@/modules/pdf/catalog";
import { PdfInputError } from "./errors";

// Valida y normaliza los valores del formulario según el catálogo. Lo que no está declarado se descarta.
function conditionMet(o: FieldOption, values: Record<string, string>): boolean {
  if (!("requiredWhen" in o) || !o.requiredWhen) return true;
  return (values[o.requiredWhen.key] ?? "") === o.requiredWhen.value;
}

export function normalizeOptions(tool: PdfTool, raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const o of tool.options as FieldOption[]) {
    const v = (raw[o.key] ?? "").toString().slice(0, 200_000);
    if ("requiredWhen" in o && o.requiredWhen && conditionMet(o, raw) && !v.trim()) {
      throw new PdfInputError(`Completa «${o.label}».`);
    }
    switch (o.type) {
      case "boolean": {
        out[o.key] = v === "true" || v === "on" || v === "1" ? "true" : v === "" ? (o.default ? "true" : "false") : "false";
        break;
      }
      case "number": {
        const n = Number(v === "" ? o.default : v);
        if (!Number.isFinite(n) || n < o.min || n > o.max) throw new PdfInputError(`«${o.label}» debe estar entre ${o.min} y ${o.max}.`);
        out[o.key] = String(n);
        break;
      }
      case "select": {
        const allowed = o.choices.map((c) => c.value);
        if (v === "" ) out[o.key] = o.default;
        else if (!allowed.includes(v)) throw new PdfInputError(`Opción no válida en «${o.label}».`);
        else out[o.key] = v;
        break;
      }
      case "pages": {
        if (o.required && !v.trim()) throw new PdfInputError(`Completa «${o.label}».`);
        if (v && !/^[\d\s,\-]+$/.test(v)) throw new PdfInputError(`«${o.label}» solo admite números, comas y guiones.`);
        out[o.key] = v.replace(/\s+/g, "");
        break;
      }
      case "url":
      case "text":
      case "password":
      case "textarea": {
        if (o.required && !v.trim()) throw new PdfInputError(`Completa «${o.label}».`);
        if (o.maxLength && v.length > o.maxLength) throw new PdfInputError(`«${o.label}» admite hasta ${o.maxLength} caracteres.`);
        out[o.key] = v;
        break;
      }
    }
  }
  // Campos de paneles especiales (firma, censura, edición, compartir): se aceptan con límites.
  const special = ["page", "x", "y", "width", "rects", "edits"];
  for (const k of special) if (raw[k] !== undefined) out[k] = String(raw[k]).slice(0, 200_000);
  return out;
}
