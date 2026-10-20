import type { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: ProductSummary[];
  currencyCode: string;
  locale: string;
  /** "catalog" leaves room for the filter sidebar on desktop. */
  layout?: "full" | "catalog";
  eagerCount?: number;
};

const columns = {
  full: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5",
  catalog: "grid-cols-2 md:grid-cols-3 2xl:grid-cols-4",
} as const;

/** 2 columns on mobile, 3 on tablet, 4–5 on desktop. */
export function ProductGrid({ products, currencyCode, locale, layout = "full", eagerCount = 0 }: ProductGridProps) {
  return (
    <ul className={`grid gap-gutter-mobile md:gap-gutter-tablet lg:gap-gutter ${columns[layout]}`}>
      {products.map((product, i) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} currencyCode={currencyCode} locale={locale} eager={i < eagerCount} />
        </li>
      ))}
    </ul>
  );
}
