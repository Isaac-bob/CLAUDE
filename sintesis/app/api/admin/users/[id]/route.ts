import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, HttpError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revokeAllSessions } from "@/lib/session";
import { handleError, clientIp } from "@/lib/http";
import { adminUserUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/:id  { role?, isActive? }
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const data = adminUserUpdateSchema.parse(await req.json().catch(() => ({})));

    // Un administrador no puede quitarse sus propios permisos ni desactivarse (evita quedarse fuera).
    if (id === admin.id && (data.role === "USER" || data.isActive === false)) {
      throw new HttpError(400, "No puedes quitarte a ti mismo los permisos ni desactivar tu cuenta.");
    }
    const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, isActive: true } });
    if (!target) throw new HttpError(404, "Usuario no encontrado.");

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (data.isActive === false) await revokeAllSessions(id);
    await audit("admin.user_updated", {
      actorId: admin.id,
      target: id,
      metadata: { before: { role: target.role, isActive: target.isActive }, after: data },
      ip: clientIp(req),
    });
    return NextResponse.json({ user: updated });
  } catch (err) {
    return handleError(err);
  }
}
