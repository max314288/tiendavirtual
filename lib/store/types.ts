/**
 * Storefront view of a tenant: `stores` + `store_branding` (+ a few
 * `store_settings`) from Modelo BD v2, as returned by `GET /v1/store`.
 */
export type Store = {
  id: string;
  slug: string;
  name: string;
  archetype: string;
  currencyCode: string;
  locale: string;
  timezone: string;
  /** store_settings.tax_rate (IGV 0.18); prices include it (prices_include_tax). */
  taxRate: number;
  /** Cart subtotal that unlocks free shipping (shipping_rates.free_over_amount), if any. */
  freeShippingThreshold: string | null;
  branding: StoreBranding;
  /** Top announcement bar text; null hides the bar content. */
  announcement: string | null;
  /** Main navigation. Replaced by the categories API in Phase 1. */
  navigation: NavItem[];
};

export type StoreBranding = {
  /** Wordmark shown when there is no logo image. */
  logoText: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  /** `store_branding.color_overrides`: token name → hex color. */
  colorOverrides: Record<string, string>;
};

export type NavItem = {
  label: string;
  href: string;
};
