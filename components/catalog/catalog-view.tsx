import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ProductGrid } from "@/components/product/product-grid";
import { hasActiveFilters, serializeCatalogQuery, SORT_OPTIONS, type CatalogQuery, type SortOption } from "@/lib/catalog/query";
import type { Category, ProductListResult } from "@/lib/catalog/types";
import type { Store } from "@/lib/store/types";
import { ActiveFilters } from "./active-filters";
import { Breadcrumbs, categoryHref, type Crumb } from "./breadcrumbs";
import { FilterForm } from "./filter-form";
import { FiltersDrawer } from "./filters-drawer";
import { Pagination } from "./pagination";
import { SortSelect } from "./sort-select";

type CatalogViewProps = {
  store: Store;
  basePath: string;
  title: string;
  description?: string | null;
  breadcrumb: Crumb[];
  query: CatalogQuery;
  defaultSort: SortOption;
  result: ProductListResult;
  /** Child categories listed above the filters. */
  subcategories?: Category[];
  showBrandFacet?: boolean;
};

function activeFilterCount(q: CatalogQuery) {
  return (
    q.brands.length +
    (q.priceMin !== null ? 1 : 0) +
    (q.priceMax !== null ? 1 : 0) +
    (q.ratingMin !== null ? 1 : 0) +
    (q.inStock ? 1 : 0) +
    (q.onSale ? 1 : 0)
  );
}

/** Shared listing layout for category, brand and search pages. */
export function CatalogView({
  store,
  basePath,
  title,
  description,
  breadcrumb,
  query,
  defaultSort,
  result,
  subcategories = [],
  showBrandFacet = true,
}: CatalogViewProps) {
  const { currencyCode, locale } = store;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const sortOptions = SORT_OPTIONS.map((o) => o.value).filter((v) => v !== "relevancia" || query.q);
  const sortHrefs = Object.fromEntries(
    SORT_OPTIONS.map((o) => [o.value, `${basePath}${serializeCatalogQuery({ ...query, sort: o.value, page: 1 }, defaultSort)}`]),
  ) as Record<SortOption, string>;
  const formProps = {
    action: basePath,
    query,
    defaultSort,
    facets: result.facets,
    currencyCode,
    locale,
    showBrands: showBrandFacet,
  };

  const subcategoryList = subcategories.length > 0 && (
    <nav aria-label="Subcategorías">
      <h2 className="mb-space-sm text-label-lg text-on-surface">Categorías</h2>
      <ul className="space-y-0.5">
        {subcategories.map((c) => (
          <li key={c.id}>
            <Link
              href={categoryHref(c.path)}
              className="flex min-h-touch items-center justify-between rounded-lg px-space-sm text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface lg:min-h-9"
            >
              {c.name}
              <span className="text-label-sm">{c.productCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <Container className="py-space-md lg:py-space-lg">
      <div className="mb-space-md">
        <Breadcrumbs items={breadcrumb} />
      </div>

      <div className="flex flex-col gap-gutter lg:flex-row lg:items-start">
        <aside className="hidden w-72 shrink-0 space-y-space-md lg:block" aria-label="Filtros">
          {subcategoryList && (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md">{subcategoryList}</div>
          )}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md">
            <h2 className="mb-space-md text-headline-sm text-on-surface">Filtros</h2>
            <FilterForm {...formProps} idPrefix="sidebar" />
          </div>
        </aside>

        <section className="min-w-0 flex-1" aria-labelledby="catalog-title">
          <header className="mb-space-md space-y-space-md">
            <div className="flex flex-col gap-space-sm md:flex-row md:items-end md:justify-between">
              <div>
                <h1 id="catalog-title" className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
                  {title}
                </h1>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {result.total === 1 ? "1 producto" : `${result.total} productos`}
                  {description ? ` · ${description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-space-sm">
                <FiltersDrawer activeCount={activeFilterCount(query)}>
                  <div className="space-y-space-lg">
                    {subcategoryList}
                    <FilterForm {...formProps} idPrefix="drawer" />
                  </div>
                </FiltersDrawer>
                <SortSelect hrefs={sortHrefs} value={query.sort} options={sortOptions} />
              </div>
            </div>
            <ActiveFilters
              basePath={basePath}
              query={query}
              defaultSort={defaultSort}
              brands={result.facets.brands}
              currencyCode={currencyCode}
              locale={locale}
            />
          </header>

          {result.items.length > 0 ? (
            <ProductGrid products={result.items} currencyCode={currencyCode} locale={locale} layout="catalog" eagerCount={4} />
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-outline-variant px-space-lg py-16 text-center">
              <PackageSearch className="mb-space-md size-10 text-on-surface-variant" aria-hidden />
              <p className="text-title-md text-on-surface">No encontramos productos</p>
              <p className="mt-space-xs max-w-sm text-body-md text-on-surface-variant">
                {hasActiveFilters(query)
                  ? "Prueba quitando algunos filtros."
                  : query.q
                    ? "Revisa la ortografía o usa términos más generales."
                    : "Esta sección todavía no tiene productos."}
              </p>
            </div>
          )}

          <Pagination
            page={query.page}
            totalPages={totalPages}
            hrefFor={(page) => `${basePath}${serializeCatalogQuery({ ...query, page }, defaultSort)}`}
          />
        </section>
      </div>
    </Container>
  );
}
