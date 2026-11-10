import type { InputKind } from "@/modules/pdf/catalog";
import { PdfInputError } from "./errors";

// Detecta el tipo REAL de un archivo por su contenido (firma), nunca por la extensión.
export function sniffKind(bytes: Uint8Array, filename: string): InputKind | "image-other" | null {
  const h = bytes.subarray(0, 16);
  const ascii = (from: number, to: number) => Buffer.from(h.subarray(from, to)).toString("latin1");
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  if (ascii(0, 4) === "%PDF") return "pdf";
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return "jpg";
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47) return "png";
  if (ascii(0, 8) === "AT&TFORM") return "djvu";
  if (h[0] === 0x50 && h[1] === 0x4b && h[2] === 0x03 && h[3] === 0x04) {
    // Contenedores ZIP: el tipo lo marca la extensión, comprobada frente a la firma ZIP.
    if (ext === "docx") return "docx";
    if (ext === "xlsx") return "xlsx";
    if (ext === "pptx") return "pptx";
    if (ext === "epub") return "epub";
    return null;
  }
  if (ascii(0, 3) === "ID3" || (h[0] === 0xff && (h[1] & 0xe0) === 0xe0)) return "audio";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "audio";
  if (ascii(0, 4) === "OggS" || ascii(0, 4) === "fLaC") return "audio";
  if (ascii(4, 8) === "ftyp" && ["m4a", "mp4"].includes(ext)) return "audio";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image-other";
  return null;
}

export function kindMatches(detected: InputKind | "image-other" | null, accept: InputKind[]): boolean {
  if (!detected || detected === "image-other") return false;
  return accept.includes(detected);
}

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "archivo";
  return base.replace(/[\u0000-\u001f"<>|*?]/g, "").slice(0, 120) || "archivo";
}

export function assertAcceptable(bytes: Uint8Array, filename: string, accept: InputKind[], label: string): InputKind {
  if (bytes.length === 0) throw new PdfInputError(`«${filename}» está vacío.`);
  const kind = sniffKind(bytes, filename);
  if (!kindMatches(kind, accept)) {
    const names = accept.map((a) => a.toUpperCase()).join(" o ");
    throw new PdfInputError(`«${filename}» no es un archivo válido para «${label}». Se espera: ${names}.`);
  }
  return kind as InputKind;
}
