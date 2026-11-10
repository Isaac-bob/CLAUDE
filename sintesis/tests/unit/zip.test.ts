import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createZip } from "@/lib/zip";

describe("createZip", () => {
  it("produce un ZIP que las herramientas estándar pueden verificar y extraer", () => {
    const dir = mkdtempSync(path.join(process.env.TEST_TMP ?? tmpdir(), "zip-"));
    const zipPath = path.join(dir, "out.zip");
    const a = new TextEncoder().encode("contenido A");
    const b = new TextEncoder().encode("bytes del segundo archivo ñ");
    writeFileSync(zipPath, createZip([{ name: "uno.pdf", bytes: a }, { name: "dos ñ.pdf", bytes: b }]));

    execFileSync("unzip", ["-tq", zipPath]); // lanza si el ZIP es inválido
    const listing = execFileSync("unzip", ["-Z1", zipPath]).toString().trim().split("\n");
    expect(listing).toEqual(["uno.pdf", "dos ñ.pdf"]);

    const extracted = execFileSync("unzip", ["-p", zipPath, "uno.pdf"]);
    expect(Buffer.compare(extracted, Buffer.from(a))).toBe(0);
    expect(readFileSync(zipPath).length).toBeGreaterThan(0);
  });
});
