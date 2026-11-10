import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { hasBinary, PYTHON } from "@/lib/engines/exec";

const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const OCR = process.env.SINTESIS_OCRMYPDF ?? "/opt/sintesis-venv/bin/ocrmypdf";

// Estado de los motores del servidor. Solo para administradores; nunca muestra valores de claves.
export async function GET() {
  try {
    await requireAdmin();
    const bins = ["qpdf", "gs", "pdftoppm", "pdftotext", "pdfimages", "pdfinfo", "pdffonts", "soffice", "pandoc", "ffmpeg", "espeak-ng", "ddjvu", "hunspell", "qpdf"];
    const results = await Promise.all(bins.map(async (b) => ({ name: b, ok: await hasBinary(b) })));
    results.push({ name: "ocrmypdf", ok: existsSync(OCR) || (await hasBinary("ocrmypdf")) });
    results.push({ name: "python (pdf2docx, pdfplumber, python-pptx, PyMuPDF)", ok: existsSync(PYTHON) });
    results.push({ name: "chromium (páginas web)", ok: existsSync(CHROMIUM) || (await hasBinary("chromium")) });
    const services = [
      { name: "IA (chat, traducción, resumen con IA)", ok: Boolean(process.env.ANTHROPIC_API_KEY) },
      { name: "Voz a texto (audio)", ok: Boolean(process.env.SINTESIS_STT_API_KEY) },
    ];
    return NextResponse.json({ binaries: results, services });
  } catch (err) {
    return handleError(err);
  }
}
