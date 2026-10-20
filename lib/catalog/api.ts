import "server-only";
import { cacheLife } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getServerEnv } from "@/lib/env";
import { brands as mockBrands, categories as mockCategories, products as mockProducts } from "./mock/data";
import { listMockProducts, toDetail, toSummary, type ListScope } from "./mock/engine";
import { PAGE_SIZE, type CatalogQuery } from "./query";
import type { Brand, Category, ProductDetail, ProductListResult, ProductSummary } from "./types";

// Catalog reads. Each function serves mock data (API_MODE=mock) or calls the
// backend. Results are cached per argument set; the tenant is fixed per
// deployment, so it does not need to be part of the cache key.

const isMock = () => getServerEnv().API_MODE === "mock";

async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Backend query contract for GET /v1/products (English keys, unlike the storefront URL). */
function toApiParams(query: CatalogQuery, scope: ListScope): URLSearchParams {
  const p = new URLSearchParams({ sort: query.sort, page: String(query.page), page_size: String(PAGE_SIZE) });
  if (scope.categoryPath) p.set("category", scope.categoryPath);
  if (scope.brandSlug) p.set("brand", scope.brandSlug);
  if (query.q) p.set("q", query.q);
  if (query.brands.length) p.set("brands", query.brands.join(","));
  if (query.priceMin !== null) p.set("price_min", String(query.priceMin));
  if (query.priceMax !== null) p.set("price_max", String(query.priceMax));
  if (query.ratingMin !== null) p.set("rating_min", String(query.ratingMin));
  if (query.inStock) p.set("in_stock", "true");
  if (query.onSale) p.set("on_sale", "true");
  return p;
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  if (isMock()) return mockCategories;
  return apiFetch<Category[]>("/v1/categories");
}

export async function getCategoryByPath(path: string): Promise<Category | null> {
  const all = await getCategories();
  return all.find((c) => c.path === path) ?? null;
}

export async function getBrand(slug: string): Promise<Brand | null> {
  "use cache";
  cacheLife("hours");
  if (isMock()) return mockBrands.find((b) => b.slug === slug) ?? null;
  return orNull(apiFetch<Brand>(`/v1/brands/${encodeURIComponent(slug)}`));
}

export async function listProducts(query: CatalogQuery, scope: ListScope = {}): Promise<ProductListResult> {
  "use cache";
  cacheLife("minutes");
  if (isMock()) return listMockProducts(mockProducts, query, scope);

  return apiFetch<ProductListResult>(`/v1/products?${toApiParams(query, scope)}`);
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  if (isMock()) {
    const p = mockProducts.find((m) => m.slug === slug);
    return p ? toDetail(p) : null;
  }
  return orNull(apiFetch<ProductDetail>(`/v1/products/${encodeURIComponent(slug)}`));
}

/** Other products from the same leaf category. */
export async function getRelatedProducts(product: ProductDetail, limit = 4): Promise<ProductSummary[]> {
  "use cache";
  cacheLife("minutes");
  if (isMock()) {
    const leaf = product.breadcrumb.at(-1)?.path;
    const parent = product.breadcrumb.at(-2)?.path ?? leaf;
    const pool = mockProducts.filter((p) => p.id !== product.id);
    const same = pool.filter((p) => leaf && p.categoryPaths.includes(leaf));
    const near = pool.filter((p) => !same.includes(p) && parent && p.categoryPaths.some((c) => c.startsWith(parent)));
    return [...same, ...near].slice(0, limit).map(toSummary);
  }
  return apiFetch<ProductSummary[]>(`/v1/products/${encodeURIComponent(product.slug)}/related?limit=${limit}`);
}
