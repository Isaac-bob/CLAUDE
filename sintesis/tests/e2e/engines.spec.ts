import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PDF_TOOLS, type PdfTool, type FieldOption, type Slot } from "../../modules/pdf/catalog";

// Matriz de verificación: ejecuta CADA herramienta del catálogo contra el servidor real.
// Resultado esperado: 200 (funciona) o 503 con code "requires-config" (falta una clave o servicio).
// Cualquier otro código es un fallo. El informe se escribe en test-results/engines-matrix.json.

const FIX = path.resolve(__dirname, "../fixtures");
const fixture = (name: string) => readFileSync(path.join(FIX, name));
const MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  epub: "application/epub+zip", djvu: "image/vnd.djvu", audio: "audio/wav",
};

// Archivo de prueba válido para cada ranura.
function sampleFor(slot: Slot, index: number, slug = ""): { name: string; mimeType: string; buffer: Buffer } {
  const pick: Record<string, string> = {
    pdf: index === 1 && slot.key === "modificado" ? "scan.pdf" : slug === "extraer-recursos" || slug === "ocr" ? "scan.pdf" : "sample.pdf",
    jpg: "sample.jpg", png: "sample.png", docx: "sample.docx", xlsx: "sample.xlsx", pptx: "sample.pptx",
    epub: "sample.epub", djvu: "sample.djvu", audio: "sample.wav",
  };
  const kind = slot.accept[0]!;
  if (slot.key === "firma") return { name: "signature.png", mimeType: "image/png", buffer: fixture("signature.png") };
  const file = pick[kind]!;
  return { name: file, mimeType: MIME[kind]!, buffer: fixture(file) };
}

// Valor de prueba para cada opción obligatoria o relevante.
function valueFor(tool: PdfTool, o: FieldOption): string | undefined {
  switch (tool.slug) {
    case "marca-de-agua": return o.key === "text" ? "PRUEBA" : undefined;
    case "proteger": return o.key === "userPassword" ? "clave-prueba" : undefined;
    case "desbloquear": return o.key === "password" ? "clave-prueba" : undefined;
    case "pagina-web-a-pdf": return o.key === "url" ? "https://example.com/" : undefined;
    case "chat": return o.key === "question" ? "¿Qué importe aparece?" : undefined;
    case "crear-pdf": return o.key === "text" ? "# Título de prueba\n\nTexto de prueba con acentos: canción." : undefined;
    case "dividir": return o.key === "ranges" ? "1-2" : undefined;
    case "organizar": return o.key === "order" ? "2,1" : undefined;
    case "rotar": return o.key === "pages" ? "1" : undefined;
    default: return o.type === "pages" && o.required ? "1" : undefined;
  }
}

function extraFields(tool: PdfTool): Record<string, string> {
  const extra: Record<string, string> = {};
  if (tool.slug === "firmar") Object.assign(extra, { page: "1", x: "0.6", y: "0.8", width: "0.25" });
  if (tool.slug === "censurar") extra.rects = JSON.stringify([{ page: 1, x: 0.1, y: 0.1, w: 0.3, h: 0.05 }]);
  if (tool.slug === "editar") extra.edits = JSON.stringify([
    { type: "text", page: 1, x: 0.1, y: 0.2, text: "Texto de prueba", size: 16, color: "#01003e" },
    { type: "rect", page: 1, x: 0.1, y: 0.3, w: 0.3, h: 0.05, color: "#c9a03a", fill: false },
  ]);
  return extra;
}

type Row = { slug: string; name: string; status: number; kind: string; ok: boolean; note: string; ms: number };
const rows: Row[] = [];

async function runTool(request: APIRequestContext, tool: PdfTool) {
  const form = new FormData();
  for (const slot of tool.slots) {
    const count = slot.min > 0 ? Math.min(slot.max, slot.key === "archivos" && slot.max > 1 ? 2 : 1) : 0;
    for (let i = 0; i < count; i++) {
      const f = sampleFor(slot, i, tool.slug);
      form.append(slot.key, new Blob([new Uint8Array(f.buffer)], { type: f.mimeType }), f.name);
    }
  }
  for (const o of tool.options as FieldOption[]) {
    const v = valueFor(tool, o);
    if (v !== undefined) form.append(o.key, v);
    else if (o.type === "boolean") form.append(o.key, o.default ? "true" : "false");
    else if (o.type === "number") form.append(o.key, String(o.default));
    else if (o.type === "select") form.append(o.key, o.default ?? (o as unknown as { choices: { value: string }[] }).choices[0]!.value);
  }
  for (const [k, v] of Object.entries(extraFields(tool))) form.append(k, v);
  const started = Date.now();
  const res = await request.post(`/api/pdf/${tool.slug}`, { multipart: form, timeout: 240_000 });
  const ms = Date.now() - started;
  const ct = res.headers()["content-type"] ?? "";
  let kind = ct.includes("pdf") ? "pdf" : ct.includes("zip") ? "zip" : ct.includes("json") ? "json" : ct || "otro";
  let note = "";
  let ok = res.status() === 200;
  if (res.status() === 503) {
    const body = await res.json().catch(() => ({}));
    ok = body.code === "requires-config";
    note = body.error ?? "";
    kind = "requiere-configuracion";
  } else if (res.status() !== 200) {
    note = (await res.json().catch(() => ({ error: res.statusText() }))).error ?? "";
    // Sin DNS/Internet en el entorno de pruebas, la conversión de URL no puede resolver el dominio: es una limitación del entorno.
    if (tool.slug === "pagina-web-a-pdf" && res.status() === 422 && /resolver/.test(note)) {
      ok = true;
      kind = "sin-internet-en-el-entorno";
    }
  }
  return { status: res.status(), kind, ok, note, ms, body: res };
}

test.describe("catálogo completo de herramientas PDF", () => {
  test.setTimeout(240_000);

  for (const tool of PDF_TOOLS) {
    test(`${tool.slug}: ${tool.name}`, async ({ request }) => {
      const r = await runTool(request, tool);
      rows.push({ slug: tool.slug, name: tool.name, status: r.status, kind: r.kind, ok: r.ok, note: r.note, ms: r.ms });
      expect(r.ok, `${tool.slug} → ${r.status} ${r.note}`).toBe(true);
    });
  }

  test("el catálogo tiene exactamente 48 herramientas", () => {
    expect(PDF_TOOLS.length).toBe(48);
  });

  test("compartir: el enlace descarga el PDF mientras no caduca", async ({ request }) => {
    const tool = PDF_TOOLS.find((t) => t.slug === "compartir")!;
    const r = await runTool(request, tool);
    expect(r.status).toBe(200);
    const link = (await r.body.json()) as { url: string; kind: string };
    expect(link.kind).toBe("link");
    const url = new URL(link.url);
    const dl = await request.get(url.pathname);
    expect(dl.status()).toBe(200);
    expect((await dl.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("proteger y luego desbloquear devuelve un PDF legible", async ({ request }) => {
    const prot = PDF_TOOLS.find((t) => t.slug === "proteger")!;
    const p = await runTool(request, prot);
    expect(p.status).toBe(200);
    const protectedBytes = await p.body.body();
    const form = new FormData();
    form.append("archivos", new Blob([new Uint8Array(protectedBytes)], { type: "application/pdf" }), "protegido.pdf");
    form.append("password", "clave-prueba");
    const u = await request.post("/api/pdf/desbloquear", { multipart: form });
    expect(u.status()).toBe(200);
  });

  test("protección SSRF: no se puede convertir una dirección de red privada", async ({ request }) => {
    const tool = PDF_TOOLS.find((t) => t.slug === "pagina-web-a-pdf")!;
    const form = new FormData();
    form.append("url", "http://127.0.0.1:3000/");
    const res = await request.post(`/api/pdf/${tool.slug}`, { multipart: form });
    expect([422, 503]).toContain(res.status());
    const body = await res.json();
    expect(body.error).toMatch(/privada|no está permitida|Chromium/i);
  });

  test("validación: un archivo de otro tipo se rechaza con mensaje claro", async ({ request }) => {
    const form = new FormData();
    form.append("archivos", new Blob([fixture("sample.png")], { type: "image/png" }), "falso.pdf");
    const res = await request.post("/api/pdf/comprimir", { multipart: form });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/no es un archivo válido/);
  });

  test.afterAll(() => {
    const dir = path.resolve(__dirname, "../../test-results");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "engines-matrix.json"), JSON.stringify(rows, null, 2));
  });
});
