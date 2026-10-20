import { BadgeCheck, Lock, Truck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { HeaderCart, HeaderCartFallback } from "@/components/cart/header-cart";
import type { Store } from "@/lib/store/types";
import { Container } from "./container";
import { HeaderAccount, HeaderAccountFallback } from "./header-account";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { MobileSearch } from "./mobile-search";
import { SearchForm } from "./search-form";

export function Header({ store }: { store: Store }) {
  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest/90 shadow-header backdrop-blur-xl">
      <div className="bg-surface-container-low">
        <Container className="flex h-8 items-center justify-between gap-space-md text-label-sm text-on-surface-variant">
          <p className="flex min-w-0 items-center gap-space-xs">
            {store.announcement && (
              <>
                <Truck className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{store.announcement}</span>
              </>
            )}
          </p>
          <Link href="/ayuda" className="hidden shrink-0 hover:text-on-surface sm:inline">
            Centro de ayuda
          </Link>
        </Container>
      </div>

      <Container className="flex h-16 items-center justify-between gap-space-sm md:h-20 md:gap-space-lg">
        <div className="flex items-center gap-space-xs">
          <MobileMenu navigation={store.navigation} />
          <Logo branding={store.branding} storeName={store.name} />
        </div>

        <SearchForm className="mx-space-lg hidden max-w-xl flex-1 md:flex" />

        <div className="flex items-center gap-space-xs sm:gap-space-md">
          <MobileSearch />

          <Suspense fallback={<HeaderAccountFallback />}>
            <HeaderAccount />
          </Suspense>

          <Suspense fallback={<HeaderCartFallback store={store} />}>
            <HeaderCart store={store} />
          </Suspense>
        </div>
      </Container>

      <Container className="flex h-11 items-center justify-between border-t border-outline-variant/30">
        <nav aria-label="Categorías" className="-mx-space-sm flex min-w-0 items-center gap-space-sm overflow-x-auto [scrollbar-width:none]">
          {store.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-11 shrink-0 items-center rounded-lg px-space-sm text-label-md md:h-auto md:py-1.5 text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-space-lg text-label-sm text-on-surface-variant lg:flex">
          <span className="flex items-center gap-space-xs">
            <BadgeCheck className="size-4 text-on-tertiary-container" aria-hidden />
            Garantía 30 días
          </span>
          <span className="flex items-center gap-space-xs">
            <Lock className="size-4 text-secondary" aria-hidden />
            Pago 100% seguro
          </span>
        </div>
      </Container>
    </header>
  );
}
