import { PDFDocument, PDFName, PDFFont, StandardFonts, rgb, degrees, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { PdfInputError } from "./errors";
import { assertPdf } from "./detect";

const FONT_DIRS = ["/usr/share/fonts/truetype/dejavu/", "/usr/share/fonts/dejavu/"];

// Fuente con soporte Unicode (acentos, cirílico, griego…). Si no existe, usa Helvetica (WinAnsi).
export async function embedFont(doc: PDFDocument, bold = false): Promise<{ font: PDFFont; unicode: boolean }> {
  doc.registerFontkit(fontkit);
  const file = bold ? "DejaVuSans-Bold.ttf" : "DejaVuSans.ttf";
  for (const dir of FONT_DIRS) {
    try {
      const bytes = await readFile(dir + file);
      return { font: await doc.embedFont(bytes, { subset: true }), unicode: true };
    } catch {
      /* siguiente ruta */
    }
  }
  return { font: await doc.embedFont(bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica), unicode: false };
}

// Sustituye caracteres que la fuente WinAnsi no puede dibujar.
export function safeText(s: string, unicode: boolean): string {
  return unicode ? s : s.replace(/[^\x09\x0a\x0d\x20-\x7e -ÿ]/g, "?");
}

export function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new PdfInputError(`Color no válido: "${hex}". Usa formato #RRGGBB.`);
  const n = parseInt(m[1]!, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function loadDoc(bytes: Uint8Array, name: string): Promise<PDFDocument> {
  assertPdf(bytes, name);
  try {
    return await PDFDocument.load(bytes);
  } catch {
    throw new PdfInputError(`No se pudo abrir "${name}". Puede estar dañado o protegido con contraseña.`);
  }
}

export const PAGE_SIZES: Record<string, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Carta: [612, 792],
  Oficio: [612, 936],
};

// Recorta márgenes (en puntos) cambiando la CropBox de cada página.
export async function cropPdf(bytes: Uint8Array, name: string, m: { top: number; right: number; bottom: number; left: number }) {
  const doc = await loadDoc(bytes, name);
  for (const page of doc.getPages()) {
    const { width, height } = page.getMediaBox();
    const w = width - m.left - m.right;
    const h = height - m.top - m.bottom;
    if (w <= 10 || h <= 10) throw new PdfInputError("Los márgenes son demasiado grandes para el tamaño de la página.");
    const box = page.getMediaBox();
    page.setCropBox(box.x + m.left, box.y + m.bottom, w, h);
  }
  return doc.save();
}

// Cambia el tamaño de página manteniendo el contenido (contain = completo, cover = llena y recorta).
export async function resizePdf(bytes: Uint8Array, name: string, size: string, fit: "contain" | "cover") {
  const src = await loadDoc(bytes, name);
  const dims = PAGE_SIZES[size];
  if (!dims) throw new PdfInputError("Tamaño de página no válido.");
  const [tw, th] = dims;
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(src.getPages());
  for (const emb of embedded) {
    const page = out.addPage([tw, th]);
    const { width: sw, height: sh } = emb.size();
    const s = fit === "cover" ? Math.max(tw / sw, th / sh) : Math.min(tw / sw, th / sh);
    const w = sw * s;
    const h = sh * s;
    page.drawPage(emb, { x: (tw - w) / 2, y: (th - h) / 2, xScale: s, yScale: s });
  }
  return out.save();
}

// Varias páginas por hoja (2, 4, 6 o 9) en A4 vertical.
export async function nUpPdf(bytes: Uint8Array, name: string, perSheet: number) {
  const src = await loadDoc(bytes, name);
  const grid: Record<number, [number, number]> = { 2: [1, 2], 4: [2, 2], 6: [2, 3], 9: [3, 3] };
  const g = grid[perSheet];
  if (!g) throw new PdfInputError("Elige 2, 4, 6 o 9 páginas por hoja.");
  const [cols, rows] = g;
  const [W, H] = PAGE_SIZES.A4!;
  const margin = 24;
  const out = await PDFDocument.create();
  const emb = await out.embedPages(src.getPages());
  const cw = (W - margin * 2) / cols;
  const ch = (H - margin * 2) / rows;
  for (let i = 0; i < emb.length; i += perSheet) {
    const sheet = out.addPage([W, H]);
    for (let k = 0; k < perSheet && i + k < emb.length; k++) {
      const e = emb[i + k]!;
      const { width: sw, height: sh } = e.size();
      const s = Math.min((cw - 12) / sw, (ch - 12) / sh);
      const c = k % cols;
      const r = Math.floor(k / cols);
      const x = margin + c * cw + (cw - sw * s) / 2;
      const y = H - margin - (r + 1) * ch + (ch - sh * s) / 2;
      sheet.drawPage(e, { x, y, xScale: s, yScale: s });
    }
  }
  return out.save();
}

// Cuadernillo (imposición para grapar): hojas A4 horizontales, 2 páginas por cara.
export async function bookletPdf(bytes: Uint8Array, name: string) {
  const src = await loadDoc(bytes, name);
  const n0 = src.getPageCount();
  const N = Math.ceil(n0 / 4) * 4;
  const out = await PDFDocument.create();
  const emb = await out.embedPages(src.getPages());
  const byIndex = (oneBased: number) => (oneBased >= 1 && oneBased <= n0 ? emb[oneBased - 1]! : null);
  const [pw, ph] = PAGE_SIZES.A4!;
  const W = ph; // horizontal
  const H = pw;
  const half = W / 2;
  const drawHalf = (page: PDFPage, e: (typeof emb)[number] | null, xOff: number) => {
    if (!e) return;
    const { width: sw, height: sh } = e.size();
    const s = Math.min((half - 24) / sw, (H - 24) / sh);
    page.drawPage(e, { x: xOff + (half - sw * s) / 2, y: (H - sh * s) / 2, xScale: s, yScale: s });
  };
  for (let k = 0; k < N / 4; k++) {
    const front = out.addPage([W, H]);
    drawHalf(front, byIndex(N - 2 * k), 0);
    drawHalf(front, byIndex(2 * k + 1), half);
    const back = out.addPage([W, H]);
    drawHalf(back, byIndex(2 * k + 2), 0);
    drawHalf(back, byIndex(N - 2 * k - 1), half);
  }
  return out.save();
}

// Póster: cada página se reparte en cols × rows hojas A4 para imprimir y pegar.
export async function posterPdf(bytes: Uint8Array, name: string, cols: number, rows: number) {
  if (cols < 1 || rows < 1 || cols * rows > 36) throw new PdfInputError("El póster admite hasta 36 hojas (por ejemplo 3 × 3).");
  const src = await loadDoc(bytes, name);
  const [W, H] = PAGE_SIZES.A4!;
  const out = await PDFDocument.create();
  const emb = await out.embedPages(src.getPages());
  for (const e of emb) {
    const { width: sw, height: sh } = e.size();
    const areaW = cols * W;
    const areaH = rows * H;
    const s = Math.min(areaW / sw, areaH / sh);
    const ox = (areaW - sw * s) / 2;
    const oy = (areaH - sh * s) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const page = out.addPage([W, H]);
        page.pushOperators(pushGraphicsState(), rectangle(0, 0, W, H), clip(), endPath());
        page.drawPage(e, { x: ox - c * W, y: oy - (rows - 1 - r) * H, xScale: s, yScale: s });
        page.pushOperators(popGraphicsState());
      }
    }
  }
  return out.save();
}

// Firma: imagen PNG/JPG colocada con posición relativa (0-1, origen arriba a la izquierda).
export async function signPdf(
  bytes: Uint8Array,
  name: string,
  sig: { bytes: Uint8Array; kind: "png" | "jpg" },
  place: { page: number; x: number; y: number; width: number },
) {
  const doc = await loadDoc(bytes, name);
  const pages = doc.getPages();
  if (place.page < 1 || place.page > pages.length) throw new PdfInputError(`La página de la firma debe estar entre 1 y ${pages.length}.`);
  const page = pages[place.page - 1]!;
  const img = sig.kind === "png" ? await doc.embedPng(sig.bytes) : await doc.embedJpg(sig.bytes);
  const { width: PW, height: PH } = page.getSize();
  const w = Math.min(Math.max(place.width, 0.05), 0.9) * PW;
  const h = (img.height / img.width) * w;
  const x = Math.min(Math.max(place.x, 0), 1) * PW;
  const yTop = Math.min(Math.max(place.y, 0), 1) * PH;
  page.drawImage(img, { x: Math.min(x, PW - w), y: PH - yTop - h, width: w, height: h });
  return doc.save();
}

export type EditOp =
  | { type: "text"; page: number; x: number; y: number; text: string; size?: number; color?: string }
  | { type: "rect"; page: number; x: number; y: number; w: number; h: number; color?: string; fill?: boolean };

// Edición: añade texto y rectángulos (coordenadas relativas, origen arriba a la izquierda).
export async function editPdf(bytes: Uint8Array, name: string, ops: EditOp[]) {
  const doc = await loadDoc(bytes, name);
  const { font, unicode } = await embedFont(doc);
  const pages = doc.getPages();
  for (const op of ops) {
    if (op.page < 1 || op.page > pages.length) throw new PdfInputError(`Página ${op.page} fuera de rango (1-${pages.length}).`);
    const page = pages[op.page - 1]!;
    const { width: PW, height: PH } = page.getSize();
    const x = Math.min(Math.max(op.x, 0), 1) * PW;
    const yTop = Math.min(Math.max(op.y, 0), 1) * PH;
    if (op.type === "text") {
      const size = Math.min(Math.max(op.size ?? 14, 6), 96);
      const color = hexToRgb(op.color ?? "#01003e");
      const lines = safeText(op.text, unicode).slice(0, 2000).split(/\r?\n/).slice(0, 60);
      lines.forEach((line, i) => {
        page.drawText(line, { x, y: PH - yTop - size - i * size * 1.25, size, font, color });
      });
    } else {
      const w = Math.min(Math.max(op.w, 0), 1) * PW;
      const h = Math.min(Math.max(op.h, 0), 1) * PH;
      const color = hexToRgb(op.color ?? "#01003e");
      if (op.fill) page.drawRectangle({ x, y: PH - yTop - h, width: w, height: h, color });
      else page.drawRectangle({ x, y: PH - yTop - h, width: w, height: h, borderColor: color, borderWidth: 2 });
    }
  }
  return doc.save();
}

// Limpieza: quita metadatos, anotaciones, adjuntos y scripts.
export async function cleanPdf(bytes: Uint8Array, name: string, o: { metadata: boolean; annotations: boolean; attachments: boolean; scripts: boolean }) {
  const doc = await loadDoc(bytes, name);
  const catalog = doc.catalog;
  if (o.metadata) {
    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setCreator("");
    doc.setProducer("");
    catalog.delete(PDFName.of("Metadata"));
  }
  if (o.annotations) {
    for (const page of doc.getPages()) page.node.delete(PDFName.of("Annots"));
  }
  const names = catalog.lookup(PDFName.of("Names"));
  if (o.attachments || o.scripts) {
    if (names && "delete" in names) {
      const dict = names as unknown as { delete: (k: PDFName) => void };
      if (o.attachments) dict.delete(PDFName.of("EmbeddedFiles"));
      if (o.scripts) dict.delete(PDFName.of("JavaScript"));
    }
  }
  if (o.scripts) {
    catalog.delete(PDFName.of("OpenAction"));
    catalog.delete(PDFName.of("AA"));
    for (const page of doc.getPages()) page.node.delete(PDFName.of("AA"));
  }
  return doc.save({ useObjectStreams: false });
}

// Texto a PDF con ajuste de línea. Acepta títulos con «# » y «## ».
export async function textToPdf(text: string, o: { title?: string; size?: number; pageSize?: string }) {
  const doc = await PDFDocument.create();
  const { font, unicode } = await embedFont(doc);
  const bold = await embedFont(doc, true);
  const [W, H] = PAGE_SIZES[o.pageSize ?? "A4"] ?? PAGE_SIZES.A4!;
  const margin = 56;
  const base = Math.min(Math.max(o.size ?? 11, 6), 36);
  let page = doc.addPage([W, H]);
  let y = H - margin;
  const maxW = W - margin * 2;
  const ensure = (need: number) => {
    if (y - need < margin) {
      page = doc.addPage([W, H]);
      y = H - margin;
    }
  };
  const source = safeText(text, unicode).replace(/\r/g, "").slice(0, 200_000);
  const blocks: { t: string; size: number; f: PDFFont }[] = [];
  if (o.title) blocks.push({ t: safeText(o.title, unicode), size: base + 9, f: bold.font });
  for (const raw of source.split("\n")) {
    if (raw.startsWith("## ")) blocks.push({ t: raw.slice(3), size: base + 3, f: bold.font });
    else if (raw.startsWith("# ")) blocks.push({ t: raw.slice(2), size: base + 6, f: bold.font });
    else blocks.push({ t: raw, size: base, f: font });
  }
  for (const b of blocks) {
    if (b.t.trim() === "") {
      y -= base * 0.9;
      continue;
    }
    const words = b.t.split(/\s+/);
    let line = "";
    const flush = () => {
      ensure(b.size * 1.35);
      if (line) page.drawText(line, { x: margin, y: y - b.size, size: b.size, font: b.f, color: rgb(0.07, 0.07, 0.16) });
      y -= b.size * 1.35;
      line = "";
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (b.f.widthOfTextAtSize(candidate, b.size) > maxW && line) {
        flush();
        line = word;
      } else {
        line = candidate;
      }
    }
    flush();
  }
  return doc.save();
}

// Informe de comparación de texto: líneas añadidas en verde y eliminadas en rojo.
export async function comparisonReport(
  rows: { kind: "add" | "del" | "same"; text: string }[],
  meta: { a: string; b: string },
) {
  const doc = await PDFDocument.create();
  const { font, unicode } = await embedFont(doc);
  const bold = await embedFont(doc, true);
  const [W, H] = PAGE_SIZES.A4!;
  const margin = 50;
  const size = 9.5;
  const lineH = size * 1.45;
  let page = doc.addPage([W, H]);
  let y = H - margin;
  page.drawText(safeText("Informe de comparación", unicode), { x: margin, y: y - 16, size: 16, font: bold.font, color: rgb(0.004, 0, 0.243) });
  y -= 40;
  page.drawText(safeText(`Original: ${meta.a}`, unicode), { x: margin, y: y, size: 9, font, color: rgb(0.35, 0.36, 0.47) });
  y -= 13;
  page.drawText(safeText(`Modificado: ${meta.b}`, unicode), { x: margin, y: y, size: 9, font, color: rgb(0.35, 0.36, 0.47) });
  y -= 24;
  const maxChars = Math.floor((W - margin * 2) / (size * 0.55));
  for (const r of rows) {
    const prefix = r.kind === "add" ? "+ " : r.kind === "del" ? "- " : "  ";
    const color = r.kind === "add" ? rgb(0.12, 0.48, 0.31) : r.kind === "del" ? rgb(0.70, 0.15, 0.13) : rgb(0.25, 0.26, 0.35);
    const clean = safeText(r.text.replace(/\t/g, "  "), unicode) || " ";
    const chunks: string[] = [];
    for (let i = 0; i < clean.length; i += maxChars) chunks.push(clean.slice(i, i + maxChars));
    for (const ch of chunks.length ? chunks : [""]) {
      if (y - lineH < margin) {
        page = doc.addPage([W, H]);
        y = H - margin;
      }
      page.drawText(prefix + ch, { x: margin, y: y - size, size, font, color });
      y -= lineH;
    }
  }
  if (rows.length === 0) page.drawText("Los documentos no tienen texto que comparar.", { x: margin, y: y - size, size, font });
  return doc.save();
}

export { degrees };
