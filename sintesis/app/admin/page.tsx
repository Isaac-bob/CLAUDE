import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Administración" };
export const dynamic = "force-dynamic";

// Control de acceso en servidor: el cliente no decide nada, solo muestra datos que la API ya autorizó.
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/cuenta");
  if (user.role !== "ADMIN") redirect("/");
  return <AdminDashboard currentUserId={user.id} />;
}
