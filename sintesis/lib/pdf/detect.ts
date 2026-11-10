import { PdfInputError } from "./errors";

export type DetectedType = "pdf" | "jpg" | "png";

// Detecta el tipo real por firma binaria, nunca por la extensión del nombre.
export function detectType(bytes: Uint8Array): DetectedType | null {
  const head = bytes.subarray(0, 8);
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return "pdf"; // %PDF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpg";
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return "png";
  return null;
}

export function assertPdf(bytes: Uint8Array, name: string) {
  if (detectType(bytes) !== "pdf") throw new PdfInputError(`"${name}" no es un PDF válido.`);
}
