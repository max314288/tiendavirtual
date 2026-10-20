/**
 * Catalog filters as they appear in the URL. Spanish keys because they are
 * user-facing: ?marca=sony,bose&precio_min=100&precio_max=500&rating=4
 * &stock=1&oferta=1&orden=precio_asc&pagina=2&q=audifonos
 */

export const SORT_OPTIONS = [
  { value: "relevancia", label: "Más relevantes" },
  { value: "populares", label: "Más populares" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "calificacion", label: "Mejor calificados" },
  { value: "novedades", label: "Novedades" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export type CatalogQuery = {
  q: string | null;
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  ratingMin: number | null;
  inStock: boolean;
  onSale: boolean;
  sort: SortOption;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 12;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseCatalogQuery(params: RawSearchParams, defaultSort: SortOption = "populares"): CatalogQuery {
  const sortParam = first(params.orden);
  const sort = SORT_OPTIONS.some((o) => o.value === sortParam) ? (sortParam as SortOption) : defaultSort;
  const rating = positiveNumber(first(params.rating));
  const page = Math.floor(positiveNumber(first(params.pagina)) ?? 1);

  return {
    q: first(params.q)?.trim() || null,
    // Accept both ?marca=a,b and ?marca=a&marca=b (what a GET form submits).
    brands: [...new Set([params.marca ?? []].flat().flatMap((v) => v.split(",")).map((s) => s.trim()).filter(Boolean))],
    priceMin: positiveNumber(first(params.precio_min)),
    priceMax: positiveNumber(first(params.precio_max)),
    ratingMin: rating !== null && rating <= 5 ? rating : null,
    inStock: first(params.stock) === "1",
    onSale: first(params.oferta) === "1",
    sort,
    page: page >= 1 ? page : 1,
  };
}

/** Builds the query string for a catalog URL; omits defaults. */
export function serializeCatalogQuery(query: Partial<CatalogQuery>, defaultSort: SortOption = "populares"): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.brands?.length) params.set("marca", query.brands.join(","));
  if (query.priceMin != null) params.set("precio_min", String(query.priceMin));
  if (query.priceMax != null) params.set("precio_max", String(query.priceMax));
  if (query.ratingMin != null) params.set("rating", String(query.ratingMin));
  if (query.inStock) params.set("stock", "1");
  if (query.onSale) params.set("oferta", "1");
  if (query.sort && query.sort !== defaultSort) params.set("orden", query.sort);
  if (query.page && query.page > 1) params.set("pagina", String(query.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** True when any narrowing filter (not search text, sort or page) is set. */
export function hasActiveFilters(query: CatalogQuery): boolean {
  return (
    query.brands.length > 0 ||
    query.priceMin !== null ||
    query.priceMax !== null ||
    query.ratingMin !== null ||
    query.inStock ||
    query.onSale
  );
}
