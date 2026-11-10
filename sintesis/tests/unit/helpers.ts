import { PDFDocument, StandardFonts } from "pdf-lib";

// Genera un PDF real de n páginas, cada una con una etiqueta de texto.
export async function makePdf(pages: number, label = "doc"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([300, 400]);
    p.drawText(`${label} ${i}`, { x: 20, y: 200, size: 18, font });
  }
  return doc.save();
}

// PNG válido de 1×1 píxel.
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);
