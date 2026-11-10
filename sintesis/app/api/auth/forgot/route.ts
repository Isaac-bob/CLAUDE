import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken, hashToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mailer";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { handleError, clientIp, rateLimit } from "@/lib/http";
import { forgotSchema } from "@/lib/validation";

const GENERIC =
  "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña en unos minutos.";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req) ?? "anon";
    const { email } = forgotSchema.parse(await req.json().catch(() => ({})));
    if (!rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ message: GENERIC });
    }
    const user = await db.user.findUnique({ where: { email } });
    if (user && user.isActive) {
      const token = newToken();
      await db.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      const link = `${env.APP_URL}/recuperar?token=${token}`;
      await sendMail({
        to: email,
        subject: "Restablece tu contraseña",
        text: `Hola ${user.name},\n\nUsa este enlace para crear una nueva contraseña (válido 30 minutos):\n${link}\n\nSi no lo pediste, ignora este mensaje.`,
      });
      await audit("auth.password_reset_requested", { actorId: user.id, ip: clientIp(req) });
    }
    return NextResponse.json({ message: GENERIC });
  } catch (err) {
    return handleError(err);
  }
}
