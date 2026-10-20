import { PAGE_SIZE, type CatalogQuery } from "../query";
import type { BrandFacet, ProductDetail, ProductListResult, ProductSummary } from "../types";
import type { MockProduct } from "./data";

// In-memory version of what the backend does with SQL: filtering, facets,
// sorting and pagination. Kept pure so it can be unit tested.

export type ListScope = {
  categoryPath?: string;
  brandSlug?: string;
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function inCategory(p: MockProduct, path: string) {
  return p.categoryPaths.some((c) => c === path || c.startsWith(`${path}.`));
}

function matchesText(p: MockProduct, q: string) {
  const haystack = normalize([p.name, p.brand.name, p.shortDescription, ...p.highlights, ...p.breadcrumb.map((b) => b.name)].join(" "));
  return normalize(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

const onSale = (p: ProductSummary) => p.compareAtPrice !== null && Number(p.compareAtPrice) > Number(p.price);

export function toSummary(p: MockProduct | ProductDetail): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    brand: p.brand,
    featuredImage: p.featuredImage,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    inStock: p.inStock,
    highlights: p.highlights,
    publishedAt: p.publishedAt,
  };
}

/** Drops mock-only fields so mock and live return the same shape. */
export function toDetail(p: MockProduct): ProductDetail {
  return {
    ...toSummary(p),
    description: p.description,
    gallery: p.gallery,
    options: p.options,
    variants: p.variants,
    attributes: p.attributes,
    breadcrumb: p.breadcrumb,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  };
}

function sortProducts(items: MockProduct[], sort: CatalogQuery["sort"]): MockProduct[] {
  const sorted = [...items];
  switch (sort) {
    case "precio_asc":
      return sorted.sort((a, b) => Number(a.price) - Number(b.price));
    case "precio_desc":
      return sorted.sort((a, b) => Number(b.price) - Number(a.price));
    case "calificacion":
      return sorted.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) || b.ratingCount - a.ratingCount);
    case "novedades":
      return sorted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    case "relevancia":
    case "populares":
    default:
      return sorted.sort((a, b) => a.salesRank - b.salesRank);
  }
}

export function listMockProducts(all: MockProduct[], query: CatalogQuery, scope: ListScope = {}): ProductListResult {
  // Base set: scope + search text. Facets are computed on it so brand counts
  // and price range don't collapse when a brand or price filter is applied.
  const base = all.filter(
    (p) =>
      (!scope.categoryPath || inCategory(p, scope.categoryPath)) &&
      (!scope.brandSlug || p.brand.slug === scope.brandSlug) &&
      (!query.q || matchesText(p, query.q)),
  );

  const brandCounts = new Map<string, BrandFacet>();
  for (const p of base) {
    const facet = brandCounts.get(p.brand.slug) ?? { slug: p.brand.slug, name: p.brand.name, count: 0 };
    facet.count += 1;
    brandCounts.set(p.brand.slug, facet);
  }
  const prices = base.map((p) => Number(p.price));

  const filtered = base.filter(
    (p) =>
      (query.brands.length === 0 || query.brands.includes(p.brand.slug)) &&
      (query.priceMin === null || Number(p.price) >= query.priceMin) &&
      (query.priceMax === null || Number(p.price) <= query.priceMax) &&
      (query.ratingMin === null || (p.ratingAvg ?? 0) >= query.ratingMin) &&
      (!query.inStock || p.inStock) &&
      (!query.onSale || onSale(p)),
  );

  const sorted = sortProducts(filtered, query.sort);
  const start = (query.page - 1) * PAGE_SIZE;

  return {
    items: sorted.slice(start, start + PAGE_SIZE).map(toSummary),
    total: filtered.length,
    page: query.page,
    pageSize: PAGE_SIZE,
    facets: {
      brands: [...brandCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      priceRange: prices.length
        ? { min: Math.min(...prices).toFixed(2), max: Math.max(...prices).toFixed(2) }
        : null,
    },
  };
}
