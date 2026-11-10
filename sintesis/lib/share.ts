import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { env } from "./env";

export const STORAGE_DIR = path.resolve(process.env.SINTESIS_STORAGE_DIR ?? path.join(process.cwd(), "storage"));

// Guarda una copia para el enlace y crea su registro con fecha de caducidad.
export async function createShare(opts: { name: string; sourcePath?: string; buffer?: Buffer; mime: string; days: number; ownerId: string | null }) {
  await purgeExpired();
  const id = randomBytes(16).toString("base64url");
  const dir = path.join(STORAGE_DIR, "shares");
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, `${id}.bin`);
  if (opts.buffer) await writeFile(storagePath, opts.buffer, { mode: 0o600 });
  else if (opts.sourcePath) await copyFile(opts.sourcePath, storagePath);
  else throw new Error("createShare necesita un buffer o una ruta");
  const { size } = await stat(storagePath);
  const expiresAt = new Date(Date.now() + opts.days * 24 * 60 * 60 * 1000);
  await db.sharedFile.create({
    data: { id, name: opts.name.slice(0, 180), mime: opts.mime, size, storagePath, expiresAt, ownerId: opts.ownerId },
  });
  return { id, name: opts.name, url: `${env.APP_URL}/s/${id}`, expiresAt: expiresAt.toISOString() };
}

// Borra archivos caducados (disco y base de datos).
export async function purgeExpired() {
  const expired = await db.sharedFile.findMany({ where: { expiresAt: { lt: new Date() } }, select: { id: true, storagePath: true }, take: 200 });
  for (const f of expired) {
    await rm(f.storagePath, { force: true }).catch(() => undefined);
    await db.sharedFile.delete({ where: { id: f.id } }).catch(() => undefined);
  }
}
