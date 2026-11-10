import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handleError, clientIp, rateLimit } from "@/lib/http";
import { MAX_UPLOAD_BYTES, env } from "@/lib/env";
import { createZip } from "@/lib/zip";
import { getPdfTool } from "@/modules/pdf/tools";
import {
  PdfInputError,
  isPdfInputError,
  imagesToPdf,
  mergePdfs,
  organizePdf,
  rotatePdf,
  splitPdf,
  watermarkPdf,
  type OutputFile,
} from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ tool: string }> };

async function readUpload(file: File) {
  if (file.size === 0) throw new PdfInputError(`"${file.name}" está vacío.`);
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new PdfInputError(`"${file.name}" supera el límite de ${env.MAX_UPLOAD_MB} MB.`);
  }
  return { name: file.name.slice(0, 180), bytes: new Uint8Array(await file.arrayBuffer()) };
}

// POST /api/pdf/:tool  (multipart/form-data: files[] + campos de opciones)
// No requiere cuenta. Si hay sesión, la tarea queda en el historial del usuario.
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
  let job: { id: string } | null = null;

  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length < tool.minFiles) {
      throw new PdfInputError(
        tool.minFiles > 1 ? `Sube al menos ${tool.minFiles} archivos.` : "Sube un archivo para continuar.",
      );
    }
    if (files.length > tool.maxFiles) throw new PdfInputError(`Esta herramienta admite hasta ${tool.maxFiles} archivos.`);

    const inputs = await Promise.all(files.map(readUpload));
    const inputBytes = inputs.reduce((n, f) => n + f.bytes.length, 0);
    const opt = (k: string) => String(form.get(k) ?? "").trim();

    job = await db.job.create({
      data: {
        userId: user?.id ?? null,
        module: "pdf",
        tool: tool.slug,
        status: "RUNNING",
        inputFiles: inputs.length,
        inputBytes: BigInt(inputBytes),
      },
      select: { id: true },
    });

    let outputs: OutputFile[];
    switch (tool.slug) {
      case "merge": {
        outputs = [{ name: "unido.pdf", bytes: await mergePdfs(inputs) }];
        break;
      }
      case "split": {
        const mode = opt("mode") === "each" ? "each" : "ranges";
        outputs = await splitPdf(inputs[0]!.bytes, inputs[0]!.name, opt("ranges"), mode);
        break;
      }
      case "rotate": {
        const angle = Number(opt("angle") || 90);
        if (![90, 180, 270].includes(angle)) throw new PdfInputError("Giro no válido.");
        outputs = [
          {
            name: inputs[0]!.name.replace(/\.pdf$/i, "") + "-girado.pdf",
            bytes: await rotatePdf(inputs[0]!.bytes, inputs[0]!.name, angle as 90 | 180 | 270, opt("pages")),
          },
        ];
        break;
      }
      case "organize": {
        outputs = [
          {
            name: inputs[0]!.name.replace(/\.pdf$/i, "") + "-organizado.pdf",
            bytes: await organizePdf(inputs[0]!.bytes, inputs[0]!.name, opt("order")),
          },
        ];
        break;
      }
      case "images-to-pdf": {
        const fit = opt("fit") === "image" ? "image" : "page";
        outputs = [{ name: "imagenes.pdf", bytes: await imagesToPdf(inputs, fit) }];
        break;
      }
      case "watermark": {
        const opacity = Math.min(100, Math.max(5, Number(opt("opacity") || 30))) / 100;
        outputs = [
          {
            name: inputs[0]!.name.replace(/\.pdf$/i, "") + "-marca.pdf",
            bytes: await watermarkPdf(inputs[0]!.bytes, inputs[0]!.name, opt("text"), opacity),
          },
        ];
        break;
      }
      default:
        throw new PdfInputError("Herramienta no implementada.");
    }

    const durationMs = Date.now() - started;
    const outBytes = outputs.reduce((n, f) => n + f.bytes.length, 0);
    await db.job.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        outputBytes: BigInt(outBytes),
        outputName: outputs.length === 1 ? outputs[0]!.name : `${tool.slug}-resultados.zip`,
        durationMs,
        finishedAt: new Date(),
      },
    });

    const body = outputs.length === 1 ? outputs[0]!.bytes : createZip(outputs);
    const filename = outputs.length === 1 ? outputs[0]!.name : `${tool.slug}-resultados.zip`;
    const type = outputs.length === 1 ? "application/pdf" : "application/zip";
    const asciiName = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    const utf8Name = encodeURIComponent(filename);
    return new Response(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": outputs.length === 1 && type === "application/pdf" ? "application/pdf" : type,
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        "Cache-Control": "no-store",
        "X-Job-Id": job.id,
      },
    });
  } catch (err) {
    if (job) {
      await db.job
        .update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMessage: isPdfInputError(err) ? err.message.slice(0, 500) : "Error interno",
            durationMs: Date.now() - started,
            finishedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
    return handleError(err);
  }
}
