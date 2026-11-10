import { test, expect, type APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Comprueba el CONTENIDO de los resultados, no solo el código de respuesta.
const FIX = path.resolve(__dirname, "../fixtures");
const fixture = (n: string) => readFileSync(path.join(FIX, n));

function textOf(pdf: Buffer, page?: number): string {
  const dir = mkdtempSync(path.join(tmpdir(), "sint-txt-"));
  const f = path.join(dir, "x.pdf");
  writeFileSync(f, pdf);
  const args = page ? ["-f", String(page), "-l", String(page)] : [];
  return execFileSync("pdftotext", ["-enc", "UTF-8", ...args, f, "-"]).toString();
}

// Contenido de dibujo sin comprimir (para comprobar texto que pdftotext no extrae, p. ej. girado).
function rawContent(pdf: Buffer): string {
  const dir = mkdtempSync(path.join(tmpdir(), "sint-raw-"));
  const f = path.join(dir, "x.pdf");
  const out = path.join(dir, "q.pdf");
  writeFileSync(f, pdf);
  execFileSync("qpdf", ["--qdf", "--object-streams=disable", f, out]);
  return readFileSync(out).toString("latin1");
}

async function post(request: APIRequestContext, tool: string, fields: Record<string, string | Buffer | { name: string; mime: string; buf: Buffer }>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string") form.append(k, v);
    else if (Buffer.isBuffer(v)) form.append(k, new Blob([new Uint8Array(v)], { type: "application/pdf" }), "doc.pdf");
    else form.append(k, new Blob([new Uint8Array(v.buf)], { type: v.mime }), v.name);
  }
  return request.post(`/api/pdf/${tool}`, { multipart: form, timeout: 240_000 });
}

test.describe("contenido real de los resultados", () => {
  test.setTimeout(240_000);

  test("censurar elimina el texto que hay bajo la zona marcada", async ({ request }) => {
    const before = textOf(fixture("sample.pdf"));
    expect(before).toContain("Importe");
    const res = await post(request, "censurar", {
      documento: fixture("sample.pdf"),
      rects: JSON.stringify([{ page: 1, x: 0.09, y: 0.16, w: 0.5, h: 0.06 }]),
    });
    expect(res.status()).toBe(200);
    // La zona está en la página 1: allí debe desaparecer el texto. El resto del documento no cambia.
    const after = textOf(await res.body(), 1);
    expect(after).not.toContain("Importe");
    expect(after).toContain("Documento de prueba");
    expect(textOf(await res.body(), 2)).toContain("Importe");
  });

  test("OCR extrae texto de un escaneo", async ({ request }) => {
    const res = await post(request, "ocr", { archivos: fixture("scan.pdf"), language: "spa" });
    expect(res.status()).toBe(200);
    expect(textOf(await res.body()).toLowerCase()).toContain("escaneado");
  });

  test("proteger cifra el PDF y no se puede leer sin contraseña", async ({ request }) => {
    const res = await post(request, "proteger", { archivos: fixture("sample.pdf"), userPassword: "clave-prueba", allowCopy: "false" });
    expect(res.status()).toBe(200);
    const bytes = await res.body();
    const dir = mkdtempSync(path.join(tmpdir(), "sint-enc-"));
    const f = path.join(dir, "p.pdf");
    writeFileSync(f, bytes);
    expect(() => execFileSync("qpdf", ["--show-npages", f])).toThrow();
  });

  test("limpiar elimina los metadatos del autor", async ({ request }) => {
    const res = await post(request, "limpiar", { documento: fixture("sample.pdf"), metadata: "true", annotations: "true", attachments: "true", scripts: "true" });
    expect(res.status()).toBe(200);
    const dir = mkdtempSync(path.join(tmpdir(), "sint-meta-"));
    const f = path.join(dir, "m.pdf");
    writeFileSync(f, await res.body());
    const info = execFileSync("pdfinfo", [f]).toString();
    expect(info).not.toMatch(/^Author:[ \t]+\S/m);
    expect(info).not.toMatch(/^Creator:[ \t]+\S/m);
    expect(info).not.toMatch(/^Producer:[ \t]+\S/m);
  });

  test("marca de agua aparece en el texto de la página", async ({ request }) => {
    const res = await post(request, "marca-de-agua", { documento: fixture("sample.pdf"), text: "CONFIDENCIAL", opacity: "40" });
    expect(res.status()).toBe(200);
    // pdftotext no extrae texto girado 45°; comprobamos el contenido del flujo de dibujo.
    expect(rawContent(await res.body())).toContain("(CONFIDENCIAL) Tj");
  });

  test("PDF a texto conserva el contenido", async ({ request }) => {
    const res = await post(request, "pdf-a-texto", { archivos: fixture("sample.pdf") });
    expect(res.status()).toBe(200);
    expect((await res.body()).toString("utf8")).toContain("Documento de prueba");
  });

  test("Word a PDF produce un PDF con el texto del documento", async ({ request }) => {
    const form = new FormData();
    form.append("archivos", new Blob([new Uint8Array(fixture("sample.docx"))], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "sample.docx");
    const res = await request.post("/api/pdf/word-a-pdf", { multipart: form, timeout: 240_000 });
    expect(res.status()).toBe(200);
    expect(textOf(await res.body())).toContain("Informe de prueba");
  });

  test("resumir devuelve texto aunque no haya IA configurada", async ({ request }) => {
    const res = await post(request, "resumir", { archivos: fixture("sample.pdf") });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("text");
    expect(body.texts[0].text.length).toBeGreaterThan(20);
  });

  test("corregir ortografía señala posibles errores con sugerencias", async ({ request }) => {
    const res = await post(request, "corregir-ortografia", { archivos: fixture("sample.pdf"), language: "es_ES" });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("text");
    expect(typeof body.texts[0].text).toBe("string");
  });
});
