import { User } from "lucide-react";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

function AccountLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="hidden min-h-touch items-center gap-space-xs rounded-lg px-space-sm text-label-lg text-on-surface-variant hover:text-on-surface sm:flex"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-primary">
        <User className="size-[18px] text-on-primary" aria-hidden />
      </span>
      <span className="hidden max-w-32 truncate lg:inline">{label}</span>
    </Link>
  );
}

/** Static fallback while the session streams in. */
export function HeaderAccountFallback() {
  return <AccountLink href="/cuenta" label="Mi cuenta" />;
}

/** Reads the session: render inside <Suspense fallback={<HeaderAccountFallback />}>. */
export async function HeaderAccount() {
  const user = await getSessionUser();
  if (!user) return <AccountLink href="/login" label="Ingresar" />;
  return <AccountLink href="/cuenta" label={user.firstName ? `Hola, ${user.firstName}` : "Mi cuenta"} />;
}
