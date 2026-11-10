import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handleError, clientIp, rateLimit } from "@/lib/http";
import { MAX_UPLOAD_BYTES, env } from "@/lib/env";
import { getPdfTool } from "@/modules/pdf/catalog";
import { ENGINES } from "@/lib/engines";
import { withWorkdir } from "@/lib/engines/workdir";
import type { EngineOutput, InputFile } from "@/lib/engines/types";
import { aiConfigured } from "@/lib/engines/ai";
import { hasBinary } from "@/lib/engines/exec";
import { isEngineError, isEngineMissingError, EngineMissingError } from "@/lib/engines/errors";
import { PdfInputError, isPdfInputError } from "@/lib/pdf/errors";
import { assertAcceptable, safeFilename } from "@/lib/pdf/inputs";
import { normalizeOptions } from "@/lib/pdf/options";
import { createShare } from "@/lib/share";
import { createZip } from "@/lib/zip";
import { acquireSlot, releaseSlot } from "@/lib/engines/concurrency";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ tool: string }> };

// Requisitos de configuración por servicio. Sin ellos, la herramienta responde con un aviso claro.
async function preflight(tool: NonNullable<ReturnType<typeof getPdfTool>>) {
  if (tool.requires === "ia" && !aiConfigured()) throw new EngineMissingError("Esta función requiere configurar ANTHROPIC_API_KEY en el servidor.");
  if (tool.requires === "voz" && !process.env.SINTESIS_STT_API_KEY) throw new EngineMissingError("Esta función requiere configurar SINTESIS_STT_API_KEY.");
  if (tool.requires === "chromium") {
    const bin = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
    if (!existsSync(bin) && !(await hasBinary("chromium"))) {
      throw new EngineMissingError("Chromium no está instalado en el servidor (CHROMIUM_PATH).");
    }
  }
}

function baseNameOf(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "");
  return stem.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "documento";
}

// POST /api/pdf/:tool  (multipart: ranuras de archivo + campos de opciones)
export async function POST(req: Request, ctx: Ctx) {
  const { tool: slug } = await ctx.params;
  const tool = getPdfTool(slug);
  if (!tool) return NextResponse.json({ error: "Herramienta no encontrada." }, { status: 404 });

  const ip = clientIp(req) ?? "anon";
  if (!rateLimit(`pdf:${ip}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas operaciones seguidas. Espera unos minutos." }, { status: 429 });
  }

  const started = Date.now();
  const user = await getCurrentUser();
  let jobId: string | null = null;
  let slotHeld = false;

  try {
    await preflight(tool);
    const form = await req.formData();

    // 1) Archivos por ranura, validados por contenido.
    const collected: { slot: string; file: File }[] = [];
    for (const slot of tool.slots) {
      const files = form.getAll(slot.key).filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length < slot.min) {
        throw new PdfInputError(slot.min > 0 ? `Sube ${slot.min === 1 ? "un archivo" : `al menos ${slot.min} archivos`} en «${slot.label}».` : `Falta «${slot.label}».`);
      }
      if (files.length > slot.max) throw new PdfInputError(`«${slot.label}» admite hasta ${slot.max} archivo${slot.max > 1 ? "s" : ""}.`);
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) throw new PdfInputError(`«${file.name}» supera el límite de ${env.MAX_UPLOAD_MB} MB.`);
        collected.push({ slot: slot.key, file });
      }
    }

    const inputMeta: { slot: string; name: string; bytes: Uint8Array; kind: InputFile["kind"] }[] = [];
    for (const { slot, file } of collected) {
      const def = tool.slots.find((s) => s.key === slot)!;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const name = safeFilename(file.name);
      const kind = assertAcceptable(bytes, name, def.accept, def.label);
      inputMeta.push({ slot, name, bytes, kind });
    }

    const opts = normalizeOptions(tool, Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>);
    const inputBytes = inputMeta.reduce((n, f) => n + f.bytes.length, 0);

    const created = await db.job.create({
      data: { userId: user?.id ?? null, module: "pdf", tool: tool.slug, status: "RUNNING", inputFiles: inputMeta.length, inputBytes: BigInt(inputBytes) },
      select: { id: true },
    });
    jobId = created.id;

    await acquireSlot();
    slotHeld = true;

    const result = await withWorkdir(async (wd) => {
      const inputs: InputFile[] = [];
      for (let i = 0; i < inputMeta.length; i++) {
        const f = inputMeta[i]!;
        const pathOnDisk = await wd.write(`in-${i}.${f.kind === "jpg" ? "jpg" : f.kind === "png" ? "png" : f.kind}`, f.bytes);
        inputs.push({ slot: f.slot, kind: f.kind, name: f.name, path: pathOnDisk, size: f.bytes.length });
      }
      const engine = ENGINES[tool.engine];
      if (!engine) throw new EngineMissingError("Esta herramienta aún no está disponible en el servidor.");
      const outputs: EngineOutput[] = await engine({
        wd,
        inputs,
        opts,
        baseName: inputs[0] ? baseNameOf(inputs[0].name) : "documento",
        userId: user?.id ?? null,
      });
      // Los archivos de salida deben salir del workdir antes de borrarlo.
      const materialized: { output: EngineOutput; body?: Buffer }[] = [];
      for (const o of outputs) {
        if (o.kind === "file") materialized.push({ output: o, body: await readFile(o.path) });
        else materialized.push({ output: o });
      }
      return materialized;
    });

    const durationMs = Date.now() - started;
    const files = result.filter((r) => r.output.kind === "file");
    const texts = result.filter((r) => r.output.kind === "text").map((r) => r.output as Extract<EngineOutput, { kind: "text" }>);
    const links = result.filter((r) => r.output.kind === "link").map((r) => r.output as Extract<EngineOutput, { kind: "link" }>);
    const outBytes = files.reduce((n, r) => n + (r.body?.length ?? 0), 0);

    const finish = (outputName: string | null) =>
      db.job.update({
        where: { id: jobId! },
        data: { status: "SUCCEEDED", outputBytes: BigInt(outBytes), outputName: outputName?.slice(0, 180) ?? null, durationMs, finishedAt: new Date() },
      });

    // Compartir: el enlace se crea desde el archivo ya generado.
    if (tool.engine === "compartir") {
      const f = files[0];
      if (!f) throw new PdfInputError("No se pudo preparar el archivo para compartir.");
      const share = await createShare({
        name: (f.output as { name: string }).name,
        sourcePath: "",
        mime: "application/pdf",
        days: Math.min(30, Math.max(1, Number(opts.days ?? 7) || 7)),
        ownerId: user?.id ?? null,
        buffer: f.body!,
      });
      await finish(share.name);
      return NextResponse.json({ kind: "link", name: share.name, url: share.url, expiresAt: share.expiresAt, jobId });
    }

    if (files.length === 0) {
      await finish(null);
      if (links.length) {
        const { url, name, expiresAt } = links[0]!;
        return NextResponse.json({ kind: "link", url, name, expiresAt, jobId });
      }
      return NextResponse.json({ kind: "text", texts, jobId });
    }

    const body = files.length === 1 ? files[0]!.body! : await zipOf(files);
    const filename = files.length === 1 ? (files[0]!.output as { name: string }).name : `${tool.slug}-resultados.zip`;
    const mime = files.length === 1 ? (files[0]!.output as { mime: string }).mime : "application/zip";
    await finish(filename);

    const headers: Record<string, string> = {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      "X-Job-Id": jobId!,
    };
    if (texts.length) {
      const notes = Buffer.from(JSON.stringify(texts.map((t) => ({ title: t.title, text: t.text.slice(0, 4000) })))).toString("base64url");
      headers["X-Sintesis-Notes"] = notes;
    }
    return new Response(new Uint8Array(body), { status: 200, headers });
  } catch (err) {
    if (jobId) {
      await db.job
        .update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            errorMessage: (isPdfInputError(err) || isEngineError(err) || isEngineMissingError(err) ? err.message : "Error interno").slice(0, 500),
            durationMs: Date.now() - started,
            finishedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
    if (isEngineMissingError(err)) return NextResponse.json({ error: err.message, code: "requires-config" }, { status: 503 });
    if (isEngineError(err)) return NextResponse.json({ error: err.message }, { status: 422 });
    return handleError(err);
  } finally {
    if (slotHeld) releaseSlot();
  }
}

async function zipOf(files: { output: EngineOutput; body?: Buffer }[]): Promise<Buffer> {
  return Buffer.from(
    createZip(files.map((f) => ({ name: (f.output as { name: string }).name, bytes: new Uint8Array(f.body!) }))),
  );
}
