import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { revokeAllSessions } from "@/lib/session";
import { audit } from "@/lib/audit";
import { handleError } from "@/lib/http";
import { resetSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { token, password } = resetSchema.parse(await req.json().catch(() => ({})));
    const record = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "El enlace no es válido o ha caducado. Pide uno nuevo." }, { status: 400 });
    }
    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
      db.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    await revokeAllSessions(record.userId);
    await audit("auth.password_reset_completed", { actorId: record.userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
