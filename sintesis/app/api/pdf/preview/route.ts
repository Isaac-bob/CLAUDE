import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { run } from "@/lib/engines/exec";
import { withWorkdir } from "@/lib/engines/workdir";
import { handleError, clientIp, rateLimit } from "@/lib/http";
import { MAX_UPLOAD_BYTES } from "@/lib/env";
import { PdfInputError } from "@/lib/pdf/errors";
import { assertAcceptable } from "@/lib/pdf/inputs";
import { acquireSlot, releaseSlot } from "@/lib/engines/concurrency";

export const runtime = "nodejs";

// POST /api/pdf/preview  (multipart: file + page)
// Devuelve una imagen PNG de la página indicada, para colocar firmas, censuras o textos.
// No guarda nada: el archivo se procesa en un espacio temporal que se borra al terminar.
export async function POST(req: Request) {
  const ip = clientIp(req) ?? "anon";
  if (!rateLimit(`preview:${ip}`, 600, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas vistas previas seguidas. Espera un momento." }, { status: 429 });
  }
  let held = false;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new PdfInputError("Sube un PDF para ver sus páginas.");
    if (file.size > MAX_UPLOAD_BYTES) throw new PdfInputError("El archivo supera el límite de tamaño.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    assertAcceptable(bytes, file.name, ["pdf"], "vista previa");
    const page = Math.max(1, Math.min(9999, Number(form.get("page") ?? 1) || 1));
    const width = Math.max(300, Math.min(1400, Number(form.get("width") ?? 900) || 900));

    await acquireSlot();
    held = true;
    return await withWorkdir(async (wd) => {
      const input = await wd.write("preview.pdf", bytes);
      const info = await run("pdfinfo", ["-f", "1", "-l", "1", input], { timeoutMs: 60_000 }).catch(() => ({ stdout: "" }));
      const pages = Number(/Pages:\s+(\d+)/.exec(info.stdout)?.[1] ?? 0);
      if (!pages) throw new PdfInputError("No se pudo leer el PDF.");
      if (page > pages) throw new PdfInputError(`El PDF solo tiene ${pages} páginas.`);
      const prefix = wd.file("pg");
      await run("pdftoppm", ["-png", "-f", String(page), "-l", String(page), "-scale-to-x", String(width), "-scale-to-y", "-1", input, prefix], { timeoutMs: 120_000 });
      const { readdir } = await import("node:fs/promises");
      const produced = (await readdir(wd.dir)).find((n) => n.startsWith("pg") && n.endsWith(".png"));
      if (!produced) throw new PdfInputError("No se pudo generar la vista previa.");
      const png = await readFile(wd.file(produced));
      return new Response(new Uint8Array(png), {
        headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Page-Count": String(pages) },
      });
    });
  } catch (err) {
    return handleError(err);
  } finally {
    if (held) releaseSlot();
  }
}
