import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { PdfInputError } from "./errors";
import { parseOrderedPages, parsePageSpec } from "./pages";
import { assertPdf, detectType } from "./detect";

export type OutputFile = { name: string; bytes: Uint8Array };

async function load(bytes: Uint8Array, name: string): Promise<PDFDocument> {
  assertPdf(bytes, name);
  try {
    // ignoreEncryption: abrimos PDFs con permisos, pero no PDFs protegidos por contraseña de apertura.
    return await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    throw new PdfInputError(`No se pudo abrir "${name}". Puede estar dañado o protegido con contraseña.`);
  }
}

export async function pdfPageCount(bytes: Uint8Array, name = "archivo.pdf"): Promise<number> {
  return (await load(bytes, name)).getPageCount();
}

// Une varios PDF en el orden recibido.
export async function mergePdfs(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  if (files.length < 2) throw new PdfInputError("Sube al menos dos archivos PDF para unirlos.");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await load(f.bytes, f.name);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

// Divide: cada rango separado por comas genera un PDF; "each" genera un PDF por página.
export async function splitPdf(
  bytes: Uint8Array,
  name: string,
  spec: string,
  mode: "ranges" | "each",
): Promise<OutputFile[]> {
  const src = await load(bytes, name);
  const total = src.getPageCount();
  const base = name.replace(/\.pdf$/i, "");

  const groups: { label: string; indices: number[] }[] = [];
  if (mode === "each") {
    for (let i = 0; i < total; i++) groups.push({ label: `pagina-${i + 1}`, indices: [i] });
  } else {
    for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
      const idx = parsePageSpec(part, total);
      groups.push({ label: `paginas-${part.replace(/\s+/g, "")}`, indices: idx });
    }
    if (groups.length === 0) throw new PdfInputError("Indica los rangos a extraer, por ejemplo 1-3, 5.");
  }

  const outputs: OutputFile[] = [];
  for (const g of groups) {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, g.indices);
    pages.forEach((p) => doc.addPage(p));
    outputs.push({ name: `${base}-${g.label}.pdf`, bytes: await doc.save() });
  }
  return outputs;
}

// Gira páginas. spec vacío = todas las páginas.
export async function rotatePdf(
  bytes: Uint8Array,
  name: string,
  angle: 90 | 180 | 270,
  spec: string,
): Promise<Uint8Array> {
  const doc = await load(bytes, name);
  const total = doc.getPageCount();
  const indices = spec.trim() ? parsePageSpec(spec, total) : doc.getPageIndices();
  for (const i of indices) {
    const page = doc.getPage(i);
    page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  }
  return doc.save();
}

// Organiza: el orden indicado define el PDF final. Las páginas no listadas se eliminan.
export async function organizePdf(bytes: Uint8Array, name: string, order: string): Promise<Uint8Array> {
  const src = await load(bytes, name);
  const indices = parseOrderedPages(order, src.getPageCount());
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

// Convierte imágenes JPG/PNG en un PDF, una imagen por página.
export async function imagesToPdf(
  images: { name: string; bytes: Uint8Array }[],
  fit: "page" | "image",
): Promise<Uint8Array> {
  if (images.length === 0) throw new PdfInputError("Sube al menos una imagen JPG o PNG.");
  const doc = await PDFDocument.create();
  const A4 = { w: 595.28, h: 841.89 };
  for (const img of images) {
    const type = detectType(img.bytes);
    if (type !== "jpg" && type !== "png") throw new PdfInputError(`"${img.name}" no es una imagen JPG o PNG válida.`);
    const embedded = type === "jpg" ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes);
    const { width, height } = embedded.scale(1);
    if (fit === "image") {
      const page = doc.addPage([width, height]);
      page.drawImage(embedded, { x: 0, y: 0, width, height });
    } else {
      const page = doc.addPage([A4.w, A4.h]);
      const margin = 36;
      const maxW = A4.w - margin * 2;
      const maxH = A4.h - margin * 2;
      const s = Math.min(maxW / width, maxH / height, 1);
      const w = width * s;
      const h = height * s;
      page.drawImage(embedded, { x: (A4.w - w) / 2, y: (A4.h - h) / 2, width: w, height: h });
    }
  }
  return doc.save();
}

// Marca de agua de texto diagonal, semitransparente, centrada en cada página.
export async function watermarkPdf(
  bytes: Uint8Array,
  name: string,
  text: string,
  opacity: number,
): Promise<Uint8Array> {
  const clean = text.trim();
  if (!clean) throw new PdfInputError("Escribe el texto de la marca de agua.");
  if (clean.length > 60) throw new PdfInputError("La marca de agua admite hasta 60 caracteres.");
  if (opacity < 0.05 || opacity > 1) throw new PdfInputError("La opacidad debe estar entre 5 % y 100 %.");

  const doc = await load(bytes, name);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  // Solo caracteres WinAnsi: sustituimos lo que la fuente estándar no soporta.
  const safe = clean.replace(/[^\x20-\x7E -ÿ]/g, "?");
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.max(18, Math.min(72, width / (safe.length * 0.6 + 2)));
    const textWidth = font.widthOfTextAtSize(safe, size);
    page.drawText(safe, {
      x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 4),
      y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 4),
      size,
      font,
      color: rgb(0.45, 0.45, 0.5),
      opacity,
      rotate: degrees(45),
    });
  }
  return doc.save();
}
