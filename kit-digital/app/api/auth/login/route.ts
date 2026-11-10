import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { handleError, clientIp, rateLimit } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

const INVALID = "Correo o contraseña incorrectos.";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req) ?? "anon";
    const data = loginSchema.parse(await req.json().catch(() => ({})));
    if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000) || !rateLimit(`login-email:${data.email}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
    }
    const user = await db.user.findUnique({ where: { email: data.email } });
    // Comparamos siempre un hash para no revelar si el correo existe por tiempo de respuesta.
    const ok = await verifyPassword(data.password, user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali");
    if (!user || !ok) {
      await audit("auth.login_failed", { target: data.email, ip: clientIp(req) });
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: "Esta cuenta está desactivada. Contacta con soporte." }, { status: 403 });
    }
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id, req.headers.get("user-agent") ?? undefined);
    await audit("auth.login", { actorId: user.id, ip: clientIp(req) });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return handleError(err);
  }
}
