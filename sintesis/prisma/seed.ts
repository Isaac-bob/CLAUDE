import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

// Crea (o actualiza) el administrador inicial a partir de ADMIN_EMAIL y ADMIN_PASSWORD.
// Idempotente: se puede ejecutar varias veces.
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) en .env antes de sembrar.");
  }
  const passwordHash = await hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", isActive: true },
    create: { email: email.toLowerCase(), name: "Administrador", passwordHash, role: "ADMIN" },
  });
  console.log(`Administrador listo: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
