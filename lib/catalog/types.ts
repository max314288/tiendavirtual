/**
 * Storefront catalog contract (read side of Modelo BD v2 §4–5), as returned by
 * the backend under /v1. Money travels as decimal strings (numeric(12,2)).
 */

export type Money = string;

export type Media = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type Brand = {
  id: string;
  slug: string;
  name: string;
};

/** `categories` row; `path` is the ltree path, e.g. "tecnologia.audio". */
export type Category = {
  id: string;
  slug: string;
  name: string;
  path: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
  description: string | null;
  image: Media | null;
  /** Active products in this category and its subtree. */
  productCount: number;
};

export type ProductOptionValue = {
  id: string;
  value: string;
  swatchHex: string | null;
};

export type ProductOption = {
  id: string;
  name: string;
  values: ProductOptionValue[];
};

export type Variant = {
  id: string;
  sku: string;
  title: string;
  price: Money;
  compareAtPrice: Money | null;
  optionValueIds: string[];
  image: Media | null;
  /** inventory_levels.available summed over online locations. */
  available: number;
  allowBackorder: boolean;
  isDefault: boolean;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  brand: Brand;
  featuredImage: Media | null;
  /** Lowest variant price and that variant's compare-at price. */
  price: Money;
  compareAtPrice: Money | null;
  ratingAvg: number | null;
  ratingCount: number;
  inStock: boolean;
  /** Short selling points shown as chips on cards. */
  highlights: string[];
  publishedAt: string;
};

export type ProductAttribute = {
  label: string;
  value: string;
  detail: string | null;
};

export type ProductDetail = ProductSummary & {
  description: string;
  gallery: Media[];
  options: ProductOption[];
  variants: Variant[];
  attributes: ProductAttribute[];
  /** Primary category chain from root to leaf, for breadcrumbs. */
  breadcrumb: Pick<Category, "id" | "name" | "path">[];
  seoTitle: string | null;
  seoDescription: string | null;
};

export type BrandFacet = {
  slug: string;
  name: string;
  count: number;
};

export type ProductListResult = {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    brands: BrandFacet[];
    priceRange: { min: Money; max: Money } | null;
  };
};
