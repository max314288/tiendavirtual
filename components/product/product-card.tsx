import Image from "next/image";
import Link from "next/link";
import { HeartButton } from "@/components/wishlist/wishlist-provider";
import { discountPercent } from "@/lib/catalog/pricing";
import type { ProductSummary } from "@/lib/catalog/types";
import { Price } from "./price";
import { Rating } from "./rating";

type ProductCardProps = {
  product: ProductSummary;
  currencyCode: string;
  locale: string;
  /** Set on the first cards of a page so the LCP image loads eagerly. */
  eager?: boolean;
};

export function ProductCard({ product, currencyCode, locale, eager }: ProductCardProps) {
  const discount = discountPercent(product.price, product.compareAtPrice);

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest transition-shadow hover:shadow-surface-2">
      <div className="relative aspect-square overflow-hidden bg-surface-container-low">
        {product.featuredImage && (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.alt}
            fill
            loading={eager ? "eager" : undefined}
            sizes="(min-width: 1536px) 22vw, (min-width: 1024px) 26vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <HeartButton productId={product.id} productName={product.name} className="absolute top-space-xs right-space-xs" />
        <div className="absolute top-space-sm left-space-sm flex flex-col items-start gap-space-xs">
          {discount !== null && (
            <span className="rounded-full bg-error-container px-2.5 py-1 text-label-sm text-on-error-container">
              -{discount}%
            </span>
          )}
          {!product.inStock && (
            <span className="rounded-full bg-inverse-surface px-2.5 py-1 text-label-sm text-inverse-on-surface">Agotado</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-space-sm md:p-space-md">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-space-sm gap-y-0.5">
          <span className="text-label-sm tracking-wide text-on-surface-variant uppercase">{product.brand.name}</span>
          <Rating average={product.ratingAvg} count={product.ratingCount} />
        </div>
        <h3 className="mb-space-sm line-clamp-2 text-body-md font-semibold text-on-surface md:text-title-md">
          <Link href={`/producto/${product.slug}`} className="after:absolute after:inset-0 group-hover:text-secondary">
            {product.name}
          </Link>
        </h3>
        {product.highlights.length > 0 && (
          <ul className="mb-space-sm hidden flex-wrap gap-1.5 sm:flex">
            {product.highlights.slice(0, 2).map((h) => (
              <li key={h} className="rounded-md bg-surface-container-low px-2 py-0.5 text-label-sm text-on-surface-variant">
                {h}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} currencyCode={currencyCode} locale={locale} />
        </div>
      </div>
    </article>
  );
}
