import type { Metadata } from "next";
import { ResetPanel } from "@/components/auth/ResetPanel";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="py-6">
      <ResetPanel token={token && /^[A-Za-z0-9_-]{20,200}$/.test(token) ? token : undefined} />
    </div>
  );
}
