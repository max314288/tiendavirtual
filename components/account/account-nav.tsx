"use client";

import { Heart, LayoutDashboard, LogOut, MapPin, MessageSquareText, Package, RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";

const items = [
  { href: "/cuenta", label: "Resumen", icon: LayoutDashboard },
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/devoluciones", label: "Devoluciones", icon: RotateCcw },
  { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/cuenta/resenas", label: "Reseñas", icon: MessageSquareText },
  { href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/cuenta" ? pathname === href : pathname.startsWith(href);
}

/** Sidebar on desktop, horizontal scrolling tabs on mobile and tablet. */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mi cuenta" className="lg:rounded-xl lg:border lg:border-outline-variant/30 lg:bg-surface-container-lowest lg:p-space-md">
      <ul className="-mx-margin-mobile flex gap-space-xs overflow-x-auto px-margin-mobile [scrollbar-width:none] md:-mx-margin-tablet md:px-margin-tablet lg:mx-0 lg:flex-col lg:px-0">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-touch items-center gap-space-sm rounded-xl px-space-md text-label-lg whitespace-nowrap transition-colors ${
                  active
                    ? "bg-surface-container text-secondary"
                    : "border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface lg:border-transparent"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:mt-space-sm lg:border-t lg:border-outline-variant/30 lg:pt-space-sm">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-touch w-full items-center gap-space-sm rounded-xl border border-outline-variant/40 px-space-md text-label-lg whitespace-nowrap text-error hover:bg-error-container/40 lg:border-transparent"
            >
              <LogOut className="size-5" aria-hidden />
              Cerrar sesión
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
