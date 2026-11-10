import { PDFDocument, StandardFonts } from "pdf-lib";

export const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@sintesis.local",
  password: process.env.ADMIN_PASSWORD ?? "AdminLocal-2026-segura",
};

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function pdfBytes(pages: number, label: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    doc.addPage([300, 400]).drawText(`${label} ${i}`, { x: 20, y: 200, size: 18, font });
  }
  return Buffer.from(await doc.save());
}

// Blob de PDF para FormData de la API.
export async function pdfBlob(pages: number, label: string): Promise<Blob> {
  return new Blob([new Uint8Array(await pdfBytes(pages, label))], { type: "application/pdf" });
}
