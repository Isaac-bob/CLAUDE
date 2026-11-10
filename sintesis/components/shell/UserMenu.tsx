"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserRound, LogOut, ShieldCheck, LogIn } from "lucide-react";

type Props = { user: { name: string; role: "USER" | "ADMIN" } | null };

export function UserMenu({ user }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setBusy(false);
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <Link href="/cuenta" className="btn-ghost !px-4 !py-2">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.role === "ADMIN" && (
        <Link href="/admin" className="btn-ghost !px-3 !py-2 text-navy-900">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Administración</span>
        </Link>
      )}
      <Link href="/cuenta" className="btn-ghost !px-3 !py-2">
        <UserRound className="h-4 w-4" aria-hidden="true" />
        <span className="max-w-[9rem] truncate">{user.name}</span>
      </Link>
      <button type="button" onClick={logout} disabled={busy} className="btn-ghost !px-3 !py-2" aria-label="Cerrar sesión">
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
