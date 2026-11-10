import { describe, it, expect } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  nUpPdf, bookletPdf, posterPdf, resizePdf, cropPdf, cleanPdf, textToPdf, comparisonReport, PAGE_SIZES,
} from "@/lib/pdf/advanced";
import { sniffKind, kindMatches } from "@/lib/pdf/inputs";
import { normalizeOptions } from "@/lib/pdf/options";
import { extractiveSummary } from "@/lib/engines";
import { PDF_TOOLS, getPdfTool } from "@/modules/pdf/catalog";
import { makePdf } from "./helpers";

async function open(b: Uint8Array) {
  return PDFDocument.load(b);
}

describe("distribución de páginas (N por hoja)", () => {
  it("4 páginas por hoja: 9 páginas generan 3 hojas", async () => {
    const out = await open(await nUpPdf(await makePdf(9), "a.pdf", 4));
    expect(out.getPageCount()).toBe(3);
    expect(Math.round(out.getPage(0).getWidth())).toBe(595);
  });
  it("rechaza números no soportados", async () => {
    await expect(nUpPdf(await makePdf(2), "a.pdf", 5)).rejects.toThrow(/2, 4, 6 o 9/);
  });
});

describe("folleto (cuadernillo)", () => {
  it("8 páginas producen 4 caras horizontales en el orden de imposición", async () => {
    const out = await open(await bookletPdf(await makePdf(8, "P"), "a.pdf"));
    expect(out.getPageCount()).toBe(4);
    for (const p of out.getPages()) expect(p.getWidth()).toBeGreaterThan(p.getHeight());
  });
  it("completa hasta múltiplo de 4 con páginas en blanco", async () => {
    const out = await open(await bookletPdf(await makePdf(5), "a.pdf"));
    expect(out.getPageCount()).toBe(4); // 8 caras de 4 páginas: 2 hojas × 2 caras
  });
});

describe("póster", () => {
  it("cada página se reparte en cols × rows hojas A4", async () => {
    const out = await open(await posterPdf(await makePdf(2), "a.pdf", 2, 3));
    expect(out.getPageCount()).toBe(2 * 2 * 3);
    expect(Math.round(out.getPage(0).getWidth())).toBe(Math.round(PAGE_SIZES.A4![0]));
  });
  it("limita el número de hojas", async () => {
    await expect(posterPdf(await makePdf(1), "a.pdf", 6, 7)).rejects.toThrow(/36/);
  });
});

describe("tamaño de página y recorte", () => {
  it("cambia todas las páginas al tamaño pedido", async () => {
    const out = await open(await resizePdf(await makePdf(2), "a.pdf", "Carta", "contain"));
    for (const p of out.getPages()) {
      expect(Math.round(p.getWidth())).toBe(612);
      expect(Math.round(p.getHeight())).toBe(792);
    }
  });
  it("recorte: fija la CropBox descontando los márgenes", async () => {
    const out = await open(await cropPdf(await makePdf(1), "a.pdf", { top: 10, right: 20, bottom: 30, left: 40 }));
    const box = out.getPage(0).getCropBox();
    expect(box.x).toBe(40);
    expect(box.y).toBe(30);
    expect(box.width).toBe(300 - 40 - 20);
    expect(box.height).toBe(400 - 10 - 30);
  });
  it("recorte: rechaza márgenes que no caben", async () => {
    await expect(cropPdf(await makePdf(1), "a.pdf", { top: 200, right: 0, bottom: 200, left: 0 })).rejects.toThrow(/demasiado grandes/);
  });
});

describe("limpieza", () => {
  it("borra metadatos y el bloque de metadatos XMP del catálogo", async () => {
    const src = await PDFDocument.load(await makePdf(1));
    src.setAuthor("Persona Real");
    src.setTitle("Secreto");
    const dirty = await src.save();
    const clean = await PDFDocument.load(await cleanPdf(dirty, "a.pdf", { metadata: true, annotations: true, attachments: true, scripts: true }));
    expect(clean.getAuthor() ?? "").toBe("");
    expect(clean.getTitle() ?? "").toBe("");
    expect(clean.catalog.get(PDFName.of("Metadata"))).toBeUndefined();
  });
});

describe("texto a PDF", () => {
  it("pagina el texto largo y respeta los títulos", async () => {
    const long = Array.from({ length: 400 }, (_, i) => `Línea ${i} con texto suficiente para llenar la página completa.`).join("\n");
    const out = await open(await textToPdf(`# Título\n\n${long}`, { title: "Doc", size: 11, pageSize: "A4" }));
    expect(out.getPageCount()).toBeGreaterThan(1);
  });
});

describe("informe de comparación", () => {
  it("genera un PDF aunque no haya diferencias", async () => {
    const out = await open(await comparisonReport([{ kind: "same", text: "igual" }], { a: "a.pdf", b: "b.pdf" }));
    expect(out.getPageCount()).toBe(1);
  });
});

describe("detección de tipo por contenido", () => {
  it("reconoce DjVu, DOCX y audio por su firma", () => {
    const djvu = new TextEncoder().encode("AT&TFORM\x00\x00\x00\x10DJVU");
    expect(sniffKind(djvu, "x.djvu")).toBe("djvu");
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(sniffKind(zip, "doc.docx")).toBe("docx");
    expect(sniffKind(zip, "doc.zip")).toBeNull();
    const wav = new TextEncoder().encode("RIFF\x00\x00\x00\x00WAVEfmt ");
    expect(sniffKind(wav, "voz.wav")).toBe("audio");
  });
  it("un tipo no aceptado por la ranura se rechaza", () => {
    expect(kindMatches("png", ["pdf"])).toBe(false);
    expect(kindMatches("pdf", ["pdf", "png"])).toBe(true);
  });
});

describe("validación de opciones según el catálogo", () => {
  const dividir = getPdfTool("dividir")!;
  it("los rangos son obligatorios solo con el modo «por rangos»", () => {
    expect(() => normalizeOptions(dividir, { mode: "ranges", ranges: "" })).toThrow(/Completa/);
    expect(() => normalizeOptions(dividir, { mode: "each", ranges: "" })).not.toThrow();
  });
  it("rechaza valores de select que no existen", () => {
    expect(() => normalizeOptions(getPdfTool("rotar")!, { angle: "45" })).toThrow(/no válida/);
  });
  it("valida números dentro de su rango", () => {
    expect(() => normalizeOptions(getPdfTool("comprimir")!, {})).not.toThrow();
    expect(() => normalizeOptions(getPdfTool("marca-de-agua")!, { text: "x", opacity: "500" })).toThrow(/entre 5 y 100/);
  });
  it("descarta campos que el catálogo no declara", () => {
    const out = normalizeOptions(getPdfTool("rotar")!, { angle: "90", inyeccion: "x" });
    expect(out.inyeccion).toBeUndefined();
  });
});

describe("catálogo", () => {
  it("tiene las 48 herramientas con slugs únicos", () => {
    expect(PDF_TOOLS).toHaveLength(48);
    expect(new Set(PDF_TOOLS.map((t) => t.slug)).size).toBe(48);
  });
});

describe("resumen automático sin IA", () => {
  it("elige las frases más representativas en orden original", () => {
    const text = [
      "El presupuesto anual se revisa cada trimestre con el equipo financiero.",
      "Una frase irrelevante y corta.",
      "El presupuesto debe aprobarse antes de la reunión del consejo directivo.",
      "Otra idea completamente distinta sobre el clima de la oficina y el café.",
    ].join(" ");
    const s = extractiveSummary(text, 2);
    expect(s).toContain("presupuesto");
    expect(s.split("\n\n")).toHaveLength(2);
  });
});
