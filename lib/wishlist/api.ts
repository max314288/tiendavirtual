import "server-only";
import { randomUUID } from "node:crypto";
import { apiFetch } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/types";
import { products as mockProducts } from "@/lib/catalog/mock/data";
import type { Media, Money } from "@/lib/catalog/types";
import { getServerEnv } from "@/lib/env";
import { readMockDb, withMockDb } from "@/lib/mock-db";

// Default wishlist of the signed-in customer (wishlists + wishlist_items).
// price_at_add lets the UI flag price drops.

export type WishlistItem = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  brandName: string;
  image: Media | null;
  /** Saved variant, or the variant to add to cart for single-variant products. */
  variantId: string | null;
  variantTitle: string | null;
  /** True when the product has options and no variant was saved: pick one on the product page. */
  needsVariantChoice: boolean;
  priceAtAdd: Money;
  currentPrice: Money;
  inStock: boolean;
  addedAt: string;
};

const isMock = () => getServerEnv().API_MODE === "mock";
const storeSlug = () => getServerEnv().STORE_SLUG;

export async function wishlistProductIds(user: SessionUser): Promise<string[]> {
  if (!isMock()) return apiFetch<string[]>("/v1/me/wishlist/ids", { accessToken: user.accessToken ?? undefined });
  const db = await readMockDb();
  return db.wishlist.filter((w) => w.storeSlug === storeSlug() && w.profileId === user.id).map((w) => w.productId);
}

/** Adds or removes a product. Returns whether it is saved afterwards. */
export async function toggleWishlist(user: SessionUser, productId: string, variantId: string | null): Promise<boolean> {
  if (!isMock()) {
    const res = await apiFetch<{ saved: boolean }>("/v1/me/wishlist/toggle", {
      method: "POST",
      body: JSON.stringify({ productId, variantId }),
      accessToken: user.accessToken ?? undefined,
    });
    return res.saved;
  }
  const product = mockProducts.find((p) => p.id === productId);
  if (!product) return false;
  const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
  return withMockDb((db) => {
    const existing = db.wishlist.find((w) => w.storeSlug === storeSlug() && w.profileId === user.id && w.productId === productId);
    if (existing) {
      db.wishlist = db.wishlist.filter((w) => w !== existing);
      return false;
    }
    db.wishlist.push({
      id: randomUUID(),
      storeSlug: storeSlug(),
      profileId: user.id,
      productId,
      variantId: variant?.id ?? null,
      priceAtAdd: variant?.price ?? product.price,
      addedAt: new Date().toISOString(),
    });
    return true;
  });
}

export async function listWishlist(user: SessionUser): Promise<WishlistItem[]> {
  if (!isMock()) return apiFetch<WishlistItem[]>("/v1/me/wishlist", { accessToken: user.accessToken ?? undefined });
  const db = await readMockDb();
  return db.wishlist
    .filter((w) => w.storeSlug === storeSlug() && w.profileId === user.id)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .flatMap((w): WishlistItem[] => {
      const p = mockProducts.find((x) => x.id === w.productId);
      if (!p) return [];
      const saved = w.variantId ? p.variants.find((v) => v.id === w.variantId) : undefined;
      const single = p.variants.length === 1 ? p.variants[0] : undefined;
      const variant = saved ?? single;
      return [
        {
          id: w.id,
          productId: p.id,
          productSlug: p.slug,
          productName: p.name,
          brandName: p.brand.name,
          image: variant?.image ?? p.featuredImage,
          variantId: variant?.id ?? null,
          variantTitle: saved ? saved.title : null,
          needsVariantChoice: !variant,
          priceAtAdd: w.priceAtAdd,
          currentPrice: variant?.price ?? p.price,
          inStock: variant ? variant.available > 0 || variant.allowBackorder : p.inStock,
          addedAt: w.addedAt,
        },
      ];
    });
}

export async function removeWishlistItem(user: SessionUser, itemId: string): Promise<void> {
  if (!isMock()) {
    await apiFetch<void>(`/v1/me/wishlist/items/${encodeURIComponent(itemId)}`, { method: "DELETE", accessToken: user.accessToken ?? undefined });
    return;
  }
  await withMockDb((db) => {
    db.wishlist = db.wishlist.filter((w) => !(w.id === itemId && w.profileId === user.id && w.storeSlug === storeSlug()));
  });
}
