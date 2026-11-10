import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-30 border-b border-indigo-950/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl" aria-label="Kit Digital, inicio">
          <Logo />
          <span className="text-lg font-extrabold tracking-tight text-ink">
            Kit <span className="text-brand-600">Digital</span>
          </span>
        </Link>
        <UserMenu user={user ? { name: user.name, role: user.role } : null} />
      </div>
    </header>
  );
}
