import { createHash } from "node:crypto";
import { db } from "./db";

// Registra acciones sensibles. La IP se guarda solo como hash para minimizar datos personales.
export async function audit(
  action: string,
  opts: { actorId?: string | null; target?: string; metadata?: Record<string, unknown>; ip?: string | null } = {},
) {
  await db.auditLog.create({
    data: {
      action,
      actorId: opts.actorId ?? null,
      target: opts.target ?? null,
      metadata: (opts.metadata ?? undefined) as object | undefined,
      ipHash: opts.ip ? createHash("sha256").update(opts.ip).digest("hex").slice(0, 32) : null,
    },
  });
}
