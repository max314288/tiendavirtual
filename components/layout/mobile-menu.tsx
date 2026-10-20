"use client";

import { Menu, User } from "lucide-react";
import Link from "next/link";
import type { NavItem } from "@/lib/store/types";
import { OverlayDialog } from "./overlay-dialog";

const itemClass =
  "flex min-h-touch items-center gap-space-sm px-margin-mobile text-body-lg hover:bg-surface-container-low";

export function MobileMenu({ navigation }: { navigation: NavItem[] }) {
  return (
    <OverlayDialog
      variant="drawer"
      title="Menú"
      triggerLabel="Abrir menú"
      triggerIcon={<Menu className="size-6" aria-hidden />}
      triggerClassName="-ml-space-sm lg:hidden"
    >
      <nav aria-label="Menú principal" className="flex flex-col py-space-sm">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className={itemClass}>
            {item.label}
          </Link>
        ))}
        <hr className="my-space-sm border-outline-variant/40" />
        <Link href="/cuenta" className={itemClass}>
          <User className="size-5" aria-hidden />
          Mi cuenta
        </Link>
        <Link href="/ayuda" className={itemClass}>
          Centro de ayuda
        </Link>
      </nav>
    </OverlayDialog>
  );
}
