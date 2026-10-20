import { X } from "lucide-react";
import Link from "next/link";
import { hasActiveFilters, serializeCatalogQuery, type CatalogQuery, type SortOption } from "@/lib/catalog/query";
import type { BrandFacet } from "@/lib/catalog/types";
import { formatMoney } from "@/lib/money";

type ActiveFiltersProps = {
  basePath: string;
  query: CatalogQuery;
  defaultSort: SortOption;
  brands: BrandFacet[];
  currencyCode: string;
  locale: string;
};

/** Removable chips for each applied filter. */
export function ActiveFilters({ basePath, query, defaultSort, brands, currencyCode, locale }: ActiveFiltersProps) {
  if (!hasActiveFilters(query)) return null;

  const href = (patch: Partial<CatalogQuery>) => `${basePath}${serializeCatalogQuery({ ...query, ...patch, page: 1 }, defaultSort)}`;
  const money = (n: number) => formatMoney(n, currencyCode, locale);

  const chips: { label: string; href: string }[] = [
    ...query.brands.map((slug) => ({
      label: brands.find((b) => b.slug === slug)?.name ?? slug,
      href: href({ brands: query.brands.filter((b) => b !== slug) }),
    })),
  ];
  if (query.priceMin !== null) chips.push({ label: `Desde ${money(query.priceMin)}`, href: href({ priceMin: null }) });
  if (query.priceMax !== null) chips.push({ label: `Hasta ${money(query.priceMax)}`, href: href({ priceMax: null }) });
  if (query.ratingMin !== null) chips.push({ label: `${query.ratingMin}+ estrellas`, href: href({ ratingMin: null }) });
  if (query.inStock) chips.push({ label: "Con stock", href: href({ inStock: false }) });
  if (query.onSale) chips.push({ label: "En oferta", href: href({ onSale: false }) });

  return (
    <div className="flex flex-wrap items-center gap-space-xs">
      <span className="text-label-sm text-on-surface-variant">Filtros activos:</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          aria-label={`Quitar filtro ${chip.label}`}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-container-lowest py-1 pr-2 pl-3 text-label-md text-on-surface hover:border-error hover:text-error"
        >
          {chip.label}
          <X className="size-3.5" aria-hidden />
        </Link>
      ))}
      <Link
        href={`${basePath}${serializeCatalogQuery({ q: query.q, sort: query.sort }, defaultSort)}`}
        className="ml-1 inline-flex min-h-9 items-center text-label-sm text-on-surface-variant underline hover:text-secondary"
      >
        Limpiar filtros
      </Link>
    </div>
  );
}
