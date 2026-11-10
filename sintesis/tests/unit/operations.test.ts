import { describe, it, expect } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  organizePdf,
  imagesToPdf,
  watermarkPdf,
  pdfPageCount,
  detectType,
  PdfInputError,
} from "@/lib/pdf";
import { makePdf, PNG_1PX } from "./helpers";

async function open(bytes: Uint8Array) {
  return PDFDocument.load(bytes);
}

describe("mergePdfs", () => {
  it("une páginas en el orden recibido", async () => {
    const out = await mergePdfs([
      { name: "a.pdf", bytes: await makePdf(2, "A") },
      { name: "b.pdf", bytes: await makePdf(3, "B") },
    ]);
    expect(await pdfPageCount(out)).toBe(5);
  });
  it("exige al menos dos archivos", async () => {
    await expect(mergePdfs([{ name: "a.pdf", bytes: await makePdf(1) }])).rejects.toBeInstanceOf(PdfInputError);
  });
  it("rechaza un archivo que no es PDF aunque se llame .pdf", async () => {
    await expect(
      mergePdfs([
        { name: "falso.pdf", bytes: PNG_1PX },
        { name: "b.pdf", bytes: await makePdf(1) },
      ]),
    ).rejects.toThrow(/no es un PDF válido/);
  });
});

describe("splitPdf", () => {
  it("por rangos genera un archivo por grupo", async () => {
    const parts = await splitPdf(await makePdf(5, "C"), "c.pdf", "1-2, 3", "ranges");
    expect(parts.map((p) => p.name)).toEqual(["c-paginas-1-2.pdf", "c-paginas-3.pdf"]);
    expect(await pdfPageCount(parts[0]!.bytes)).toBe(2);
    expect(await pdfPageCount(parts[1]!.bytes)).toBe(1);
  });
  it("cada página por separado genera N archivos", async () => {
    const parts = await splitPdf(await makePdf(4), "c.pdf", "", "each");
    expect(parts).toHaveLength(4);
    expect(parts.every((p) => p.bytes.length > 0)).toBe(true);
  });
  it("rechaza rangos fuera de rango", async () => {
    await expect(splitPdf(await makePdf(2), "c.pdf", "1-5", "ranges")).rejects.toThrow(/solo tiene 2/);
  });
});

describe("rotatePdf", () => {
  it("suma el giro a la rotación de las páginas indicadas", async () => {
    const out = await rotatePdf(await makePdf(3), "a.pdf", 90, "2");
    const doc = await open(out);
    expect(doc.getPage(0).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(doc.getPage(2).getRotation().angle).toBe(0);
  });
  it("gira todo el documento si no se indican páginas", async () => {
    const out = await rotatePdf(await makePdf(2), "a.pdf", 270, "");
    const doc = await open(out);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([270, 270]);
  });
  it("acumula giros módulo 360", async () => {
    const src = await makePdf(1);
    const doc = await open(src);
    doc.getPage(0).setRotation(degrees(180));
    const out = await rotatePdf(await doc.save(), "a.pdf", 270, "");
    expect((await open(out)).getPage(0).getRotation().angle).toBe(90);
  });
});

describe("organizePdf", () => {
  it("reordena y elimina páginas no listadas", async () => {
    const out = await organizePdf(await makePdf(3, "X"), "x.pdf", "3,1");
    expect(await pdfPageCount(out)).toBe(2);
  });
  it("permite repetir una página", async () => {
    const out = await organizePdf(await makePdf(2), "x.pdf", "1,1,1");
    expect(await pdfPageCount(out)).toBe(3);
  });
});

describe("imagesToPdf", () => {
  it("convierte PNG en páginas A4 con fit=page", async () => {
    const out = await imagesToPdf([{ name: "p.png", bytes: PNG_1PX }], "page");
    const doc = await open(out);
    expect(doc.getPageCount()).toBe(1);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
  });
  it("usa el tamaño de la imagen con fit=image", async () => {
    const out = await imagesToPdf([{ name: "p.png", bytes: PNG_1PX }], "image");
    const doc = await open(out);
    expect(doc.getPage(0).getWidth()).toBe(1);
  });
  it("rechaza archivos que no son imágenes", async () => {
    await expect(imagesToPdf([{ name: "x.jpg", bytes: await makePdf(1) }], "page")).rejects.toThrow(/no es una imagen/);
  });
});

describe("watermarkPdf", () => {
  it("añade la marca sin cambiar el número de páginas", async () => {
    const out = await watermarkPdf(await makePdf(2), "a.pdf", "CONFIDENCIAL", 0.3);
    expect(await pdfPageCount(out)).toBe(2);
  });
  it("valida texto vacío, demasiado largo y opacidad", async () => {
    const src = await makePdf(1);
    await expect(watermarkPdf(src, "a.pdf", "   ", 0.3)).rejects.toThrow(/Escribe el texto/);
    await expect(watermarkPdf(src, "a.pdf", "x".repeat(61), 0.3)).rejects.toThrow(/hasta 60/);
    await expect(watermarkPdf(src, "a.pdf", "ok", 0.01)).rejects.toThrow(/opacidad/);
  });
});

describe("detectType", () => {
  it("detecta por firma binaria, no por nombre", async () => {
    expect(detectType(await makePdf(1))).toBe("pdf");
    expect(detectType(PNG_1PX)).toBe("png");
    expect(detectType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(detectType(new TextEncoder().encode("hola"))).toBeNull();
  });
});
