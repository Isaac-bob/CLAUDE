import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCurrentUser();
  if (!session) {
    return (
      <div className="py-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Tu cuenta</h1>
          <p className="mt-2 text-muted">Entra o crea una cuenta gratis para guardar tu historial.</p>
        </div>
        <AuthPanel />
      </div>
    );
  }
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { name: true, email: true, role: true, createdAt: true },
  });
  return <AccountView user={{ ...user, createdAt: user.createdAt.toISOString() }} />;
}
