"use server";

import { refresh } from "next/cache";
import { getSessionUser, requireUser } from "@/lib/auth";
import { removeWishlistItem, toggleWishlist, wishlistProductIds } from "./api";

export type WishlistState = { signedIn: boolean; productIds: string[] };

/** Called by the client provider on load (works on static pages too). */
export async function wishlistStateAction(): Promise<WishlistState> {
  const user = await getSessionUser();
  if (!user) return { signedIn: false, productIds: [] };
  return { signedIn: true, productIds: await wishlistProductIds(user) };
}

export async function toggleWishlistAction(productId: string, variantId: string | null): Promise<{ saved: boolean } | { needsLogin: true }> {
  const user = await getSessionUser();
  if (!user) return { needsLogin: true };
  if (typeof productId !== "string" || productId.length > 100) return { saved: false };
  return { saved: await toggleWishlist(user, productId, typeof variantId === "string" ? variantId : null) };
}

export async function removeWishlistItemAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cuenta/favoritos");
  await removeWishlistItem(user, String(formData.get("itemId") ?? ""));
  refresh();
}
