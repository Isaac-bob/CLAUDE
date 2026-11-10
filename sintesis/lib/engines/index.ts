import { readFile, writeFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { run, runPython, hasBinary } from "./exec";
import { EngineError, EngineMissingError } from "./errors";
import { aiComplete, aiConfigured } from "./ai";
import { assertSafeUrl } from "./url-guard";
import type { EngineContext, EngineFn, EngineOutput } from "./types";
import { input, inputs, opt, optBool, optNum } from "./types";
import { createZip } from "../zip";
import {
  mergePdfs, splitPdf, rotatePdf, organizePdf, imagesToPdf, watermarkPdf, pdfPageCount, PdfInputError,
} from "../pdf";
import {
  cropPdf, resizePdf, nUpPdf, bookletPdf, posterPdf, signPdf, editPdf, cleanPdf, textToPdf, comparisonReport, PAGE_SIZES, type EditOp,
} from "../pdf/advanced";

const OCR = process.env.SINTESIS_OCRMYPDF ?? "/opt/sintesis-venv/bin/ocrmypdf";
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const MAX_TEXT = 120_000;

// Salida estándar de un archivo generado.
function fileOut(name: string, p: string, mime: string): EngineOutput {
  return { kind: "file", name, path: p, mime };
}

// Texto extraído del PDF de entrada (con pdftotext).
async function pdfText(ctx: EngineContext, slot?: string): Promise<string> {
  const inp = input(ctx, slot);
  const out = ctx.wd.file(`text-${randomBytes(4).toString("hex")}.txt`);
  await run("pdftotext", ["-layout", "-enc", "UTF-8", inp.path, out], { timeoutMs: 120_000 });
  return (await readFile(out, "utf8")).replace(/\f/g, "\n").trim();
}

async function gsCompress(ctx: EngineContext, src: string, dst: string, preset: string) {
  await run("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pdfwrite", `-dPDFSETTINGS=${preset}`, `-sOutputFile=${dst}`, src], { timeoutMs: 300_000 });
}

// Argumentos largos o sensibles (contraseñas) se pasan por fichero para que no aparezcan en la lista de procesos.
async function qpdfWithArgFile(ctx: EngineContext, args: string[]) {
  const argFile = ctx.wd.file(`args-${randomBytes(4).toString("hex")}.txt`);
  await writeFile(argFile, args.join("\n"), { mode: 0o600 });
  return run("qpdf", [`@${argFile}`], { timeoutMs: 300_000 });
}

function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "documento";
}

// ---------- Herramientas de edición ----------

const unir: EngineFn = async (ctx) => {
  const files = await Promise.all(inputs(ctx).map(async (f) => ({ name: f.name, bytes: new Uint8Array(await readFile(f.path)) })));
  return [{ kind: "file", name: `${ctx.baseName}-unido.pdf`, path: await ctx.wd.write("unido.pdf", await mergePdfs(files)), mime: "application/pdf" }];
};

const dividir: EngineFn = async (ctx) => {
  const f = input(ctx);
  const parts = await splitPdf(new Uint8Array(await readFile(f.path)), f.name, opt(ctx, "ranges"), opt(ctx, "mode") === "each" ? "each" : "ranges");
  return zipOrSingle(ctx, parts.map((p) => ({ name: p.name, bytes: p.bytes })), `${ctx.baseName}-divididos`);
};

const rotar: EngineFn = async (ctx) => {
  const f = input(ctx);
  const angle = optNum(ctx, "angle", 90);
  if (![90, 180, 270].includes(angle)) throw new PdfInputError("Giro no válido.");
  const out = await rotatePdf(new Uint8Array(await readFile(f.path)), f.name, angle as 90 | 180 | 270, opt(ctx, "pages"));
  return [fileOut(`${ctx.baseName}-girado.pdf`, await ctx.wd.write("rotado.pdf", out), "application/pdf")];
};

const organizar: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = await organizePdf(new Uint8Array(await readFile(f.path)), f.name, opt(ctx, "order"));
  return [fileOut(`${ctx.baseName}-organizado.pdf`, await ctx.wd.write("organizado.pdf", out), "application/pdf")];
};

const marcaDeAgua: EngineFn = async (ctx) => {
  const f = input(ctx);
  const opacity = Math.min(100, Math.max(5, optNum(ctx, "opacity", 30))) / 100;
  const out = await watermarkPdf(new Uint8Array(await readFile(f.path)), f.name, opt(ctx, "text"), opacity);
  return [fileOut(`${ctx.baseName}-marca.pdf`, await ctx.wd.write("marca.pdf", out), "application/pdf")];
};

const editar: EngineFn = async (ctx) => {
  const f = input(ctx);
  let ops: EditOp[];
  try {
    ops = z.array(z.discriminatedUnion("type", [
      z.object({ type: z.literal("text"), page: z.number().int().min(1), x: z.number().min(0).max(1), y: z.number().min(0).max(1), text: z.string().min(1).max(2000), size: z.number().min(6).max(96).optional(), color: z.string().optional() }),
      z.object({ type: z.literal("rect"), page: z.number().int().min(1), x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0).max(1), h: z.number().min(0).max(1), color: z.string().optional(), fill: z.boolean().optional() }),
    ])).max(300).parse(JSON.parse(opt(ctx, "edits", "[]")));
  } catch {
    throw new PdfInputError("Las ediciones no tienen un formato válido. Revisa los textos y las posiciones.");
  }
  if (ops.length === 0) throw new PdfInputError("Añade al menos un texto o rectángulo.");
  const out = await editPdf(new Uint8Array(await readFile(f.path)), f.name, ops);
  return [fileOut(`${ctx.baseName}-editado.pdf`, await ctx.wd.write("editado.pdf", out), "application/pdf")];
};

const firmar: EngineFn = async (ctx) => {
  const doc = input(ctx, "documento");
  const sig = input(ctx, "firma");
  const kind = sig.kind === "png" ? "png" : "jpg";
  if (sig.kind !== "png" && sig.kind !== "jpg") throw new PdfInputError("La firma debe ser una imagen PNG o JPG.");
  const out = await signPdf(new Uint8Array(await readFile(doc.path)), doc.name, { bytes: new Uint8Array(await readFile(sig.path)), kind }, {
    page: optNum(ctx, "page", 1, 1),
    x: optNum(ctx, "x", 0.6, 0, 1),
    y: optNum(ctx, "y", 0.8, 0, 1),
    width: optNum(ctx, "width", 0.25, 0.05, 0.9),
  });
  return [fileOut(`${ctx.baseName}-firmado.pdf`, await ctx.wd.write("firmado.pdf", out), "application/pdf")];
};

const censurar: EngineFn = async (ctx) => {
  const f = input(ctx);
  let rects: unknown;
  try {
    rects = z.array(z.object({ page: z.number().int().min(1), x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0).max(1), h: z.number().min(0).max(1) })).min(1).max(500).parse(JSON.parse(opt(ctx, "rects", "[]")));
  } catch {
    throw new PdfInputError("Marca al menos una zona para censurar.");
  }
  const rectsPath = ctx.wd.file("rects.json");
  await writeFile(rectsPath, JSON.stringify(rects));
  const out = ctx.wd.file("censurado.pdf");
  await runPython("redact.py", [f.path, out, rectsPath], { timeoutMs: 300_000 });
  return [fileOut(`${ctx.baseName}-censurado.pdf`, out, "application/pdf")];
};

const limpiar: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = await cleanPdf(new Uint8Array(await readFile(f.path)), f.name, {
    metadata: optBool(ctx, "metadata", true),
    annotations: optBool(ctx, "annotations", true),
    attachments: optBool(ctx, "attachments", true),
    scripts: optBool(ctx, "scripts", true),
  });
  return [fileOut(`${ctx.baseName}-limpio.pdf`, await ctx.wd.write("limpio.pdf", out), "application/pdf")];
};

const recortar: EngineFn = async (ctx) => {
  const f = input(ctx);
  const m = { top: optNum(ctx, "top", 0, 0, 500), right: optNum(ctx, "right", 0, 0, 500), bottom: optNum(ctx, "bottom", 0, 0, 500), left: optNum(ctx, "left", 0, 0, 500) };
  const out = await cropPdf(new Uint8Array(await readFile(f.path)), f.name, m);
  return [fileOut(`${ctx.baseName}-recortado.pdf`, await ctx.wd.write("recortado.pdf", out), "application/pdf")];
};

const cambiarTamano: EngineFn = async (ctx) => {
  const f = input(ctx);
  const size = opt(ctx, "size", "A4");
  const out = await resizePdf(new Uint8Array(await readFile(f.path)), f.name, size, opt(ctx, "fit") === "cover" ? "cover" : "contain");
  return [fileOut(`${ctx.baseName}-${size.toLowerCase()}.pdf`, await ctx.wd.write("tamano.pdf", out), "application/pdf")];
};

const distribucion: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = await nUpPdf(new Uint8Array(await readFile(f.path)), f.name, optNum(ctx, "perSheet", 2));
  return [fileOut(`${ctx.baseName}-distribuido.pdf`, await ctx.wd.write("distribuido.pdf", out), "application/pdf")];
};

const folleto: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = await bookletPdf(new Uint8Array(await readFile(f.path)), f.name);
  return [fileOut(`${ctx.baseName}-folleto.pdf`, await ctx.wd.write("folleto.pdf", out), "application/pdf")];
};

const poster: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = await posterPdf(new Uint8Array(await readFile(f.path)), f.name, optNum(ctx, "cols", 2, 1, 6), optNum(ctx, "rows", 2, 1, 6));
  return [fileOut(`${ctx.baseName}-poster.pdf`, await ctx.wd.write("poster.pdf", out), "application/pdf")];
};

const crearPdf: EngineFn = async (ctx) => {
  const text = opt(ctx, "text");
  if (!text) throw new PdfInputError("Escribe el contenido del documento.");
  const out = await textToPdf(text, { title: opt(ctx, "title") || undefined, size: optNum(ctx, "size", 11, 6, 36), pageSize: opt(ctx, "pageSize", "A4") });
  return [fileOut(`${slug(opt(ctx, "title") || "documento")}.pdf`, await ctx.wd.write("nuevo.pdf", out), "application/pdf")];
};

const comparar: EngineFn = async (ctx) => {
  const a = input(ctx, "original");
  const b = input(ctx, "modificado");
  const ta = await pdfText({ ...ctx, inputs: [a] }, undefined);
  const tb = await pdfText({ ...ctx, inputs: [b] }, undefined);
  const { diffLines } = await import("diff");
  const rows: { kind: "add" | "del" | "same"; text: string }[] = [];
  for (const part of diffLines(ta, tb)) {
    const kind = part.added ? "add" : part.removed ? "del" : "same";
    for (const line of part.value.replace(/\n$/, "").split("\n")) rows.push({ kind, text: line });
  }
  const changed = rows.filter((r) => r.kind !== "same").length;
  const out = await comparisonReport(rows.filter((r) => r.kind !== "same" || rows.length < 400).slice(0, 4000), { a: a.name, b: b.name });
  return [
    fileOut(`${ctx.baseName}-comparacion.pdf`, await ctx.wd.write("comparacion.pdf", out), "application/pdf"),
    { kind: "text", title: "Resumen", text: `Líneas que cambian: ${changed}. Informe en PDF adjunto.` },
  ];
};

// ---------- Optimización y seguridad ----------

const comprimir: EngineFn = async (ctx) => {
  const f = input(ctx);
  const preset = { alta: "/screen", media: "/ebook", baja: "/printer" }[opt(ctx, "level", "media")] ?? "/ebook";
  const out = ctx.wd.file("comprimido.pdf");
  await gsCompress(ctx, f.path, out, preset);
  const before = await ctx.wd.size(path.basename(f.path));
  const after = await stat(out);
  if (after.size >= before) {
    return [{ kind: "text", title: "Compresión", text: `El archivo ya estaba optimizado (no se pudo reducir más sin perder calidad). Tamaño: ${Math.round(before / 1024)} KB.` }, fileOut(`${ctx.baseName}-comprimido.pdf`, f.path, "application/pdf")];
  }
  return [fileOut(`${ctx.baseName}-comprimido.pdf`, out, "application/pdf")];
};

const optimizar: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("optimizado.pdf");
  const args = ["--object-streams=generate", "--compress-streams=y", "--recompress-flate", "--compression-level=9"];
  if (optBool(ctx, "linearize", true)) args.push("--linearize");
  await run("qpdf", [...args, f.path, out], { timeoutMs: 300_000 });
  return [fileOut(`${ctx.baseName}-optimizado.pdf`, out, "application/pdf")];
};

const reparar: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("reparado.pdf");
  await run("gs", ["-q", "-o", out, "-sDEVICE=pdfwrite", "-dPDFSETTINGS=/prepress", "-dNOPAUSE", "-dBATCH", "-dSAFER", f.path], { timeoutMs: 300_000 });
  let check = "";
  try {
    const r = await run("qpdf", ["--check", out], { timeoutMs: 120_000 });
    check = r.stdout.split("\n").filter(Boolean).slice(-1)[0] ?? "";
  } catch (e) {
    check = e instanceof Error ? e.message : "";
  }
  return [fileOut(`${ctx.baseName}-reparado.pdf`, out, "application/pdf"), { kind: "text", title: "Verificación", text: check || "Reparado. Revisa el resultado antes de usarlo." }];
};

const proteger: EngineFn = async (ctx) => {
  const f = input(ctx);
  const user = opt(ctx, "userPassword");
  if (user.length < 4) throw new PdfInputError("La contraseña para abrir el PDF debe tener al menos 4 caracteres.");
  const owner = opt(ctx, "ownerPassword") || randomBytes(12).toString("base64url");
  const modifiers = [
    `--print=${optBool(ctx, "allowPrint", true) ? "full" : "none"}`,
    `--modify=${optBool(ctx, "allowModify", false) ? "all" : "none"}`,
    `--extract=${optBool(ctx, "allowCopy", false) ? "y" : "n"}`,
  ];
  const out = ctx.wd.file("protegido.pdf");
  await qpdfWithArgFile(ctx, ["--encrypt", user, owner, "256", ...modifiers, "--", f.path, out]);
  const note = opt(ctx, "ownerPassword") ? "" : `Contraseña de propietario generada: ${owner}`;
  return [fileOut(`${ctx.baseName}-protegido.pdf`, out, "application/pdf"), ...(note ? [{ kind: "text" as const, title: "Permisos", text: note }] : [])];
};

const desbloquear: EngineFn = async (ctx) => {
  const f = input(ctx);
  const pwd = opt(ctx, "password");
  const out = ctx.wd.file("desbloqueado.pdf");
  const pwdFile = ctx.wd.file(`pwd-${randomBytes(4).toString("hex")}.txt`);
  await writeFile(pwdFile, pwd, { mode: 0o600 });
  try {
    await run("qpdf", [`--password-file=${pwdFile}`, "--decrypt", f.path, out], { timeoutMs: 120_000 });
  } catch (e) {
    if (e instanceof EngineError && /password|encrypted/i.test(e.message)) throw new EngineError("La contraseña no es correcta.");
    throw e;
  }
  return [fileOut(`${ctx.baseName}-desbloqueado.pdf`, out, "application/pdf")];
};

const ocr: EngineFn = async (ctx) => {
  const f = input(ctx);
  const lang = ["spa", "eng", "spa+eng"].includes(opt(ctx, "language")) ? opt(ctx, "language") : "spa+eng";
  const out = ctx.wd.file("ocr.pdf");
  await run(OCR, ["--language", lang, "--skip-text", "--rotate-pages", "--deskew", "--output-type", "pdf", "--quiet", f.path, out], { timeoutMs: 900_000 });
  return [fileOut(`${ctx.baseName}-ocr.pdf`, out, "application/pdf")];
};

const pdfa: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("pdfa.pdf");
  await run(OCR, ["--skip-text", "--output-type", "pdfa-2", "--quiet", f.path, out], { timeoutMs: 600_000 });
  return [fileOut(`${ctx.baseName}-pdfa.pdf`, out, "application/pdf")];
};

const validarPdfa: EngineFn = async (ctx) => {
  const f = input(ctx);
  const checks: string[] = [];
  const enc = await run("qpdf", ["--is-encrypted", f.path]).then(() => true).catch(() => false);
  checks.push(`${enc ? "[FALLO]" : "[OK]"} Sin cifrado`);
  const qdf = ctx.wd.file("validar.qdf");
  await run("qpdf", ["--qdf", "--object-streams=disable", f.path, qdf], { timeoutMs: 120_000 }).catch(() => undefined);
  const raw = await readFile(qdf).catch(() => Buffer.alloc(0)).then((b) => b.toString("latin1"));
  const pdfaPart = /pdfaid:part[^0-9]*([1-4])/.exec(raw);
  checks.push(`${pdfaPart ? "[OK]" : "[FALLO]"} Identificador PDF/A en metadatos XMP${pdfaPart ? ` (parte ${pdfaPart[1]})` : ""}`);
  checks.push(`${/\/OutputIntents/.test(raw) ? "[OK]" : "[FALLO]"} Perfil de color de salida (OutputIntents)`);
  const fonts = await run("pdffonts", [f.path]).then((r) => r.stdout).catch(() => "");
  const fontLines = fonts.split("\n").slice(2).filter((l) => l.trim());
  const notEmbedded = fontLines.filter((l) => / no\s+(\S+\s+)?\S+\s*$/.test(l) || / no\s*$/.test(l));
  checks.push(`${notEmbedded.length === 0 ? "[OK]" : "[FALLO]"} Fuentes incrustadas${notEmbedded.length ? ` (${notEmbedded.length} sin incrustar)` : ""}`);
  const javascript = /\/JavaScript/.test(raw);
  checks.push(`${javascript ? "[FALLO]" : "[OK]"} Sin JavaScript`);
  const ok = checks.every((c) => c.startsWith("[OK]"));
  return [{
    kind: "text",
    title: ok ? "Validación básica: cumple los controles" : "Validación básica: hay incidencias",
    text: [...checks, "", "Esta es una comprobación básica. Para una certificación oficial de PDF/A usa veraPDF."].join("\n"),
  }];
};

// ---------- Conversión desde PDF ----------

const pdfAWord: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("salida.docx");
  await runPython("pdf_to_docx.py", [f.path, out], { timeoutMs: 600_000 });
  return [fileOut(`${ctx.baseName}.docx`, out, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")];
};

const pdfAExcel: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("salida.xlsx");
  await runPython("pdf_tables_to_xlsx.py", [f.path, out], { timeoutMs: 300_000 });
  return [fileOut(`${ctx.baseName}.xlsx`, out, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")];
};

async function pagesToImages(ctx: EngineContext, src: string, format: "png" | "jpeg", dpi: number, maxPages = 60): Promise<string[]> {
  const prefix = ctx.wd.file(`page-${randomBytes(3).toString("hex")}`);
  const flag = format === "png" ? "-png" : "-jpeg";
  const total = await pdfPageCount(new Uint8Array(await readFile(src)), "entrada.pdf");
  if (total > maxPages) throw new PdfInputError(`Este servicio admite hasta ${maxPages} páginas por archivo (tiene ${total}).`);
  await run("pdftoppm", [flag, "-r", String(dpi), src, prefix], { timeoutMs: 600_000 });
  const dir = path.dirname(prefix);
  const base = path.basename(prefix);
  return (await readdir(dir)).filter((n) => n.startsWith(base)).sort().map((n) => path.join(dir, n));
}

const pdfAPowerpoint: EngineFn = async (ctx) => {
  const f = input(ctx);
  const images = await pagesToImages(ctx, f.path, "png", 110);
  const out = ctx.wd.file("salida.pptx");
  await runPython("images_to_pptx.py", [out, ...images], { timeoutMs: 300_000 });
  return [fileOut(`${ctx.baseName}.pptx`, out, "application/vnd.openxmlformats-officedocument.presentationml.presentation")];
};

const pdfAJpg: EngineFn = async (ctx) => {
  const f = input(ctx);
  const dpi = optNum(ctx, "dpi", 150, 72, 300);
  const images = await pagesToImages(ctx, f.path, "jpeg", dpi);
  const files = await Promise.all(images.map(async (p, i) => ({ name: `${ctx.baseName}-pagina-${i + 1}.jpg`, bytes: new Uint8Array(await readFile(p)) })));
  return zipOrSingle(ctx, files, `${ctx.baseName}-jpg`);
};

const pdfATexto: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("salida.txt");
  await run("pdftotext", ["-enc", "UTF-8", f.path, out], { timeoutMs: 120_000 });
  return [fileOut(`${ctx.baseName}.txt`, out, "text/plain; charset=utf-8")];
};

const pdfAEpub: EngineFn = async (ctx) => {
  const f = input(ctx);
  const text = await pdfText(ctx);
  const pages = text.split(/\f|\n\n\n+/).filter((p) => p.trim());
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(ctx.baseName)}</title></head><body>${pages
    .map((p, i) => `<section><h2>Página ${i + 1}</h2>${p.split("\n").filter(Boolean).map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</section>`)
    .join("")}</body></html>`;
  const htmlPath = ctx.wd.file("entrada.html");
  await writeFile(htmlPath, html);
  const out = ctx.wd.file("salida.epub");
  await run("pandoc", [htmlPath, "-f", "html", "-t", "epub3", "--metadata", `title=${ctx.baseName}`, "-o", out], { timeoutMs: 300_000 });
  void f;
  return [fileOut(`${ctx.baseName}.epub`, out, "application/epub+zip")];
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const pdfAVoz: EngineFn = async (ctx) => {
  const text = (await pdfText(ctx)).slice(0, 15_000);
  if (!text) throw new PdfInputError("El PDF no contiene texto que leer. Si es un escaneo, aplica primero OCR.");
  const lang = ["es", "en", "fr", "de", "it", "pt"].includes(opt(ctx, "language")) ? opt(ctx, "language") : "es";
  const txt = ctx.wd.file("voz.txt");
  await writeFile(txt, text);
  const wav = ctx.wd.file("voz.wav");
  await run("espeak-ng", ["-v", lang, "-f", txt, "-w", wav], { timeoutMs: 300_000 });
  const mp3 = ctx.wd.file("voz.mp3");
  try {
    await run("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "4", mp3], { timeoutMs: 300_000 });
    return [fileOut(`${ctx.baseName}-voz.mp3`, mp3, "audio/mpeg")];
  } catch {
    return [fileOut(`${ctx.baseName}-voz.wav`, wav, "audio/wav")];
  }
};

const extraerRecursos: EngineFn = async (ctx) => {
  const f = input(ctx);
  const prefix = ctx.wd.file("img");
  await run("pdfimages", ["-all", f.path, prefix], { timeoutMs: 300_000 });
  const names = (await readdir(ctx.wd.dir)).filter((n) => n.startsWith("img-")).sort();
  if (names.length === 0) throw new PdfInputError("No se encontraron imágenes incrustadas en este PDF.");
  const files = await Promise.all(names.map(async (n) => ({ name: n, bytes: new Uint8Array(await readFile(ctx.wd.file(n))) })));
  return zipOrSingle(ctx, files, `${ctx.baseName}-recursos`);
};

// ---------- Conversión hacia PDF ----------

async function officeToPdf(ctx: EngineContext, kindLabel: string): Promise<EngineOutput[]> {
  const f = input(ctx);
  const outDir = ctx.wd.file("office-out");
  const profile = ctx.wd.file("lo-profile");
  await run("mkdir", ["-p", outDir]);
  const src = ctx.wd.file(`origen-${randomBytes(3).toString("hex")}${path.extname(f.path)}`);
  await run("cp", [f.path, src]);
  await run("soffice", [`-env:UserInstallation=file://${profile}`, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", outDir, src], { timeoutMs: 240_000 });
  const produced = (await readdir(outDir)).find((n) => n.toLowerCase().endsWith(".pdf"));
  if (!produced) throw new EngineError(`No se pudo convertir el archivo de ${kindLabel}.`);
  return [fileOut(`${ctx.baseName}.pdf`, path.join(outDir, produced), "application/pdf")];
}

const officeAPdf: EngineFn = (ctx) => officeToPdf(ctx, "Office");

// EPUB: Pandoc lo convierte a DOCX (LibreOffice no importa EPUB) y después se genera el PDF.
const epubAPdf: EngineFn = async (ctx) => {
  const f = input(ctx);
  const docx = ctx.wd.file("epub-origen.docx");
  await run("pandoc", [f.path, "-f", "epub", "-t", "docx", "-o", docx], { timeoutMs: 180_000 });
  return officeToPdf({ ...ctx, inputs: [{ ...f, path: docx, name: f.name.replace(/\.epub$/i, ".docx") }] }, "EPUB");
};

const imagenesAPdf: EngineFn = async (ctx) => {
  const files = await Promise.all(inputs(ctx).map(async (f) => ({ name: f.name, bytes: new Uint8Array(await readFile(f.path)) })));
  const fit = opt(ctx, "fit") === "image" ? "image" : "page";
  return [fileOut(`${ctx.baseName}.pdf`, await ctx.wd.write("imagenes.pdf", await imagesToPdf(files, fit)), "application/pdf")];
};

const djvuAPdf: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("djvu.pdf");
  await run("ddjvu", ["-format=pdf", "-quality=90", f.path, out], { timeoutMs: 300_000 });
  return [fileOut(`${ctx.baseName}.pdf`, out, "application/pdf")];
};

const paginaWebAPdf: EngineFn = async (ctx) => {
  const url = await assertSafeUrl(opt(ctx, "url"));
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    // Cada petición (también redirecciones y recursos) pasa por la misma comprobación SSRF.
    await page.route("**/*", async (route) => {
      try {
        await assertSafeUrl(route.request().url());
        await route.continue();
      } catch {
        await route.abort("blockedbyclient");
      }
    });
    await page.goto(url.toString(), { waitUntil: "networkidle", timeout: 60_000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
    const name = `${slug(url.hostname)}.pdf`;
    return [fileOut(name, await ctx.wd.write("web.pdf", pdf), "application/pdf")];
  } catch (e) {
    if (e instanceof Error && /Executable doesn't exist|Failed to launch|ENOENT/i.test(e.message)) {
      throw new EngineMissingError("Chromium no está instalado en el servidor (CHROMIUM_PATH).");
    }
    throw new EngineError("No se pudo cargar la página. Comprueba que la dirección es pública y responde.");
  } finally {
    await browser.close().catch(() => undefined);
  }
};

const audioATexto: EngineFn = async (ctx) => {
  const f = input(ctx);
  const key = process.env.SINTESIS_STT_API_KEY;
  if (!key) throw new EngineMissingError("La transcripción requiere configurar SINTESIS_STT_API_KEY (proveedor de voz a texto).");
  const url = process.env.SINTESIS_STT_URL ?? "https://api.openai.com/v1/audio/transcriptions";
  const form = new FormData();
  form.append("model", process.env.SINTESIS_STT_MODEL ?? "whisper-1");
  form.append("language", opt(ctx, "language", "es"));
  form.append("file", new Blob([new Uint8Array(await readFile(f.path))]), path.basename(f.path));
  const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(600_000) });
  if (!res.ok) throw new EngineError(`El servicio de transcripción respondió con error (${res.status}).`);
  const data = (await res.json()) as { text?: string };
  return [{ kind: "text", title: "Transcripción", text: data.text ?? "" }];
};

// ---------- Inteligencia artificial y lenguaje ----------

const chatPdf: EngineFn = async (ctx) => {
  const question = opt(ctx, "question");
  if (!question) throw new PdfInputError("Escribe tu pregunta sobre el documento.");
  const text = (await pdfText(ctx)).slice(0, MAX_TEXT);
  if (!text) throw new PdfInputError("El PDF no tiene texto. Si es un escaneo, usa primero OCR.");
  const answer = await aiComplete({
    system: "Responde solo con la información del documento que te doy. Si la respuesta no está en el documento, dilo. Responde en el idioma de la pregunta.",
    user: `<documento>\n${text}\n</documento>\n\nPregunta: ${question}`,
  });
  return [{ kind: "text", title: "Respuesta", text: answer }];
};

const traducirPdf: EngineFn = async (ctx) => {
  const text = (await pdfText(ctx)).slice(0, MAX_TEXT);
  if (!text) throw new PdfInputError("El PDF no tiene texto que traducir. Si es un escaneo, usa primero OCR.");
  const target = opt(ctx, "target", "español");
  const translated = await aiComplete({
    system: "Traduce el texto que recibes conservando párrafos, títulos y listas. Devuelve solo la traducción, sin comentarios.",
    user: `Idioma de destino: ${target}\n\n${text}`,
    maxTokens: 8000,
  });
  const out = await textToPdf(translated, { title: `${ctx.baseName} (${target})`, size: 11, pageSize: "A4" });
  return [fileOut(`${ctx.baseName}-traducido.pdf`, await ctx.wd.write("traducido.pdf", out), "application/pdf")];
};

const resumirPdf: EngineFn = async (ctx) => {
  const text = (await pdfText(ctx)).slice(0, MAX_TEXT);
  if (!text) throw new PdfInputError("El PDF no tiene texto que resumir.");
  if (aiConfigured()) {
    const summary = await aiComplete({
      system: "Resume el documento en español en 5 a 10 puntos claros, con las ideas principales y las conclusiones.",
      user: text,
      maxTokens: 1500,
    });
    return [{ kind: "text", title: "Resumen (IA)", text: summary }];
  }
  return [{ kind: "text", title: "Resumen automático (sin IA)", text: extractiveSummary(text, 8) }];
};

// Resumen extractivo sin IA: elige las frases con más palabras frecuentes del documento.
export function extractiveSummary(text: string, count: number): string {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter((s) => s.length > 40 && s.length < 400);
  if (sentences.length <= count) return sentences.join("\n\n") || text.slice(0, 1200);
  const stop = new Set(["de", "la", "que", "el", "en", "y", "a", "los", "las", "del", "se", "por", "un", "una", "para", "con", "no", "su", "al", "es", "lo", "como", "más", "o", "pero", "sus", "le", "ya", "este", "esta", "también", "the", "and", "of", "to", "in", "is"]);
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-záéíóúñü]{3,}/g) ?? []) if (!stop.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().match(/[a-záéíóúñü]{3,}/g) ?? [];
    const score = words.reduce((n, w) => n + (freq.get(w) ?? 0), 0) / Math.sqrt(words.length + 1);
    return { s, i, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, count).sort((a, b) => a.i - b.i).map((x) => x.s).join("\n\n");
}

const extraerDatos: EngineFn = async (ctx) => {
  const f = input(ctx);
  const out = ctx.wd.file("datos.xlsx");
  await runPython("pdf_tables_to_xlsx.py", [f.path, out], { timeoutMs: 300_000 });
  return [fileOut(`${ctx.baseName}-datos.xlsx`, out, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")];
};

const corregirOrtografia: EngineFn = async (ctx) => {
  if (!(await hasBinary("hunspell"))) throw new EngineMissingError("Corrector no instalado en el servidor (hunspell).");
  const text = (await pdfText(ctx)).slice(0, MAX_TEXT);
  if (!text) throw new PdfInputError("El PDF no tiene texto que revisar.");
  const lang = ["es_ES", "en_US"].includes(opt(ctx, "language")) ? opt(ctx, "language") : "es_ES";
  return [{ kind: "text", title: "Revisión ortográfica", text: await spellReport(ctx, text, lang) }];
};

async function spellReport(ctx: EngineContext, text: string, lang: string): Promise<string> {
  const file = ctx.wd.file(`spell-${randomBytes(3).toString("hex")}.txt`);
  await writeFile(file, text.replace(/\n/g, " \n"));
  const { stdout } = await run("sh", ["-c", `hunspell -d ${lang} -a < "${file}"`], { timeoutMs: 120_000 }).catch(() => ({ stdout: "" }));
  const issues: string[] = [];
  for (const line of stdout.split("\n")) {
    const m = /^& (\S+) \d+ \d+: (.+)$/.exec(line);
    if (m) issues.push(`${m[1]} → ${m[2].split(", ").slice(0, 4).join(", ")}`);
    else if (/^# (\S+) \d+/.test(line)) issues.push(`${/^# (\S+)/.exec(line)![1]} → (sin sugerencias)`);
  }
  if (issues.length === 0) return "No se detectaron errores ortográficos en el texto del PDF.";
  return `Posibles errores (${issues.length}). Revísalos antes de corregir el original:\n\n${[...new Set(issues)].slice(0, 300).join("\n")}`;
}

// ---------- Utilidades comunes ----------

// Varios archivos -> ZIP; uno -> se devuelve tal cual.
async function zipOrSingle(ctx: EngineContext, files: { name: string; bytes: Uint8Array }[], zipBase: string): Promise<EngineOutput[]> {
  if (files.length === 1) {
    const f = files[0]!;
    const mime = f.name.endsWith(".pdf") ? "application/pdf" : f.name.endsWith(".jpg") ? "image/jpeg" : f.name.endsWith(".png") ? "image/png" : "application/octet-stream";
    return [fileOut(f.name, await ctx.wd.write("unico-" + slug(f.name), f.bytes), mime)];
  }
  return [fileOut(`${zipBase}.zip`, await ctx.wd.write("resultado.zip", createZip(files)), "application/zip")];
}

// Compartir: devuelve el PDF tal cual; la ruta crea el enlace con caducidad.
const compartir: EngineFn = async (ctx) => {
  const f = input(ctx);
  return [fileOut(`${ctx.baseName}.pdf`, f.path, "application/pdf")];
};

export const ENGINES: Record<string, EngineFn> = {
  compartir,
  unir, dividir, rotar, organizar, "marca-de-agua": marcaDeAgua, editar, firmar, censurar, limpiar, recortar,
  "cambiar-tamano": cambiarTamano, distribucion, folleto, poster, "crear-pdf": crearPdf, comparar,
  comprimir, optimizar, reparar, proteger, desbloquear, ocr, pdfa, "validar-pdfa": validarPdfa,
  "pdf-a-word": pdfAWord, "pdf-a-excel": pdfAExcel, "pdf-a-powerpoint": pdfAPowerpoint, "pdf-a-jpg": pdfAJpg,
  "pdf-a-texto": pdfATexto, "pdf-a-epub": pdfAEpub, "pdf-a-voz": pdfAVoz,
  "extraer-recursos": extraerRecursos, "office-a-pdf": officeAPdf, "epub-a-pdf": epubAPdf, "imagenes-a-pdf": imagenesAPdf,
  "djvu-a-pdf": djvuAPdf, "pagina-web-a-pdf": paginaWebAPdf, "audio-a-texto": audioATexto,
  chat: chatPdf, traducir: traducirPdf, resumir: resumirPdf, "extraer-datos": extraerDatos,
  "corregir-ortografia": corregirOrtografia,
};

export { PAGE_SIZES, inputs, input, EngineError, EngineMissingError };
