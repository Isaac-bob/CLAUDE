// Genera el PDF del manual de marca a partir de la página /marca en ejecución.
// Uso: node scripts/export-brand-manual.mjs [url] [salida]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:3000/marca";
const out = path.resolve(process.argv[3] ?? "public/brand/manual-de-marca.pdf");
mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: out, format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
  console.log(`Manual exportado: ${out}`);
} finally {
  await browser.close();
}
