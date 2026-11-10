import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// Descarga pública de un archivo compartido. Caducado = 404 (y se borra en la siguiente purga).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return NextResponse.json({ error: "Enlace no válido." }, { status: 404 });
  const share = await db.sharedFile.findUnique({ where: { id } });
  if (!share || share.expiresAt < new Date()) {
    return NextResponse.json({ error: "Este enlace ha caducado o no existe." }, { status: 404 });
  }
  const body = await readFile(share.storagePath).catch(() => null);
  if (!body) return NextResponse.json({ error: "El archivo ya no está disponible." }, { status: 404 });
  await db.sharedFile.update({ where: { id }, data: { downloads: { increment: 1 } } }).catch(() => undefined);
  const filename = share.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": share.mime,
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(share.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
