import { cookies } from "next/headers";
import { db } from "./db";
import { hashToken } from "./tokens";
import { SESSION_COOKIE } from "./session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
};

// Devuelve el usuario de la sesión actual o null. Siempre valida en servidor.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Debes iniciar sesión para hacer esto.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new HttpError(403, "No tienes permisos de administración.");
  return user;
}

// Se identifica por `name` (no por instanceof) para que funcione entre bundles de Next.js.
export class HttpError extends Error {
  override name = "HttpError";
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof Error && err.name === "HttpError" && typeof (err as HttpError).status === "number";
}
