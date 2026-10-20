import type { Metadata } from "next";
import { Heart, TrendingDown, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";
import { WishlistAddButton } from "@/components/wishlist/wishlist-add-button";
import { requireUser } from "@/lib/auth";
import { fromCents, toCents } from "@/lib/cart/totals";
import { formatMoney } from "@/lib/money";
import { getStore } from "@/lib/store/get-store";
import { removeWishlistItemAction } from "@/lib/wishlist/actions";
import { listWishlist } from "@/lib/wishlist/api";

export const metadata: Metadata = { title: "Favoritos" };

async function WishlistContent() {
  const user = await requireUser("/cuenta/favoritos");
  const [items, store] = await Promise.all([listWishlist(user), getStore()]);
  const money = (m: string) => formatMoney(m, store.currencyCode, store.locale);

  return (
    <section aria-labelledby="favoritos" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
      <h2 id="favoritos" className="mb-space-md text-headline-sm text-on-surface">
        Favoritos
      </h2>
      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const drop = toCents(item.priceAtAdd) - toCents(item.currentPrice);
            return (
              <li key={item.id} className="relative flex flex-col overflow-hidden rounded-xl border border-outline-variant/30">
                <div className="relative aspect-[4/3] bg-surface-container-low">
                  {item.image && <Image src={item.image.url} alt={item.image.alt} fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 40vw, 90vw" className="object-cover mix-blend-multiply" />}
                  {drop > 0 && (
                    <span className="absolute top-space-sm left-space-sm inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2.5 py-1 text-label-sm text-on-tertiary-fixed-variant">
                      <TrendingDown className="size-3.5" aria-hidden />
                      Bajó {money(fromCents(drop))}
                    </span>
                  )}
                  <form action={removeWishlistItemAction} className="absolute top-space-xs right-space-xs">
                    <input type="hidden" name="itemId" value={item.id} />
                    <button
                      type="submit"
                      aria-label={`Quitar ${item.productName} de favoritos`}
                      className="flex size-touch items-center justify-center rounded-full bg-surface-container-lowest/85 text-on-surface-variant shadow-surface-1 hover:text-error"
                    >
                      <X className="size-5" aria-hidden />
                    </button>
                  </form>
                </div>
                <div className="flex flex-1 flex-col gap-space-xs p-space-md">
                  <span className="text-label-sm tracking-wide text-on-surface-variant uppercase">{item.brandName}</span>
                  <Link href={`/producto/${item.productSlug}${item.variantId ? `?variante=${item.variantId}` : ""}`} className="line-clamp-2 text-label-lg text-on-surface hover:text-secondary">
                    {item.productName}
                  </Link>
                  {item.variantTitle && <span className="text-label-sm text-on-surface-variant">{item.variantTitle}</span>}
                  <p className="flex items-baseline gap-space-sm">
                    <span className="text-headline-sm text-on-surface">{money(item.currentPrice)}</span>
                    {drop > 0 && <s className="text-body-md text-on-surface-variant">{money(item.priceAtAdd)}</s>}
                  </p>
                  <div className="mt-auto pt-space-xs">
                    {item.needsVariantChoice || !item.variantId ? (
                      <Link
                        href={`/producto/${item.productSlug}`}
                        className="flex h-11 items-center justify-center rounded-xl border border-outline-variant text-label-lg text-on-surface hover:bg-surface-container-low"
                      >
                        Elegir opción
                      </Link>
                    ) : (
                      <WishlistAddButton variantId={item.variantId} disabled={!item.inStock} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center py-space-xl text-center">
          <Heart className="mb-space-md size-10 text-on-surface-variant" aria-hidden />
          <p className="text-title-md text-on-surface">Aún no guardas favoritos</p>
          <p className="mt-space-xs max-w-sm text-body-md text-on-surface-variant">Toca el corazón en cualquier producto para guardarlo aquí. Te avisaremos si baja de precio.</p>
          <Link href="/buscar" className="mt-space-lg inline-flex h-12 items-center rounded-xl bg-primary px-space-lg text-label-lg text-on-primary hover:bg-surface-tint">
            Explorar productos
          </Link>
        </div>
      )}
    </section>
  );
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <WishlistContent />
    </Suspense>
  );
}
