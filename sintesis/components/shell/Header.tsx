import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="print:hidden sticky top-0 z-30 border-b border-navy-900/5 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-xl" aria-label="Síntesis, inicio">
          <Logo className="h-10 w-10 rounded-full" />
          <span className="font-serif text-xl font-bold tracking-tight text-navy-900">Síntesis</span>
        </Link>
        <UserMenu user={user ? { name: user.name, role: user.role } : null} />
      </div>
    </header>
  );
}
