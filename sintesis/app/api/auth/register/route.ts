import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { handleError, clientIp, rateLimit } from "@/lib/http";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req) ?? "anon";
    if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiados intentos. Prueba más tarde." }, { status: 429 });
    }
    const data = registerSchema.parse(await req.json().catch(() => ({})));
    const exists = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (exists) {
      // Mensaje genérico para no revelar qué correos están registrados.
      return NextResponse.json({ error: "No se pudo completar el registro. Revisa los datos o inicia sesión." }, { status: 409 });
    }
    const user = await db.user.create({
      data: { email: data.email, name: data.name, passwordHash: await hashPassword(data.password) },
      select: { id: true, email: true, name: true, role: true },
    });
    await createSession(user.id, req.headers.get("user-agent") ?? undefined);
    await audit("auth.register", { actorId: user.id, ip: clientIp(req) });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
