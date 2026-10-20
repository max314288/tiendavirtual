import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/types";
import { products as mockProducts } from "@/lib/catalog/mock/data";
import { getServerEnv } from "@/lib/env";
import { readMockDb, withMockDb, type MockCart, type MockDb } from "@/lib/mock-db";
import { mockPromotions } from "@/lib/promotions/mock-data";
import { normalizeCode } from "@/lib/promotions/engine";
import { getStore } from "@/lib/store/get-store";
import { buildCart, checkQuantity, findVariant, mergeItems } from "./mock";
import type { Cart } from "./types";

// The cart lives on the server (carts / cart_items). Guests are identified by
// an httpOnly cookie token, customers by their session. Never cached.

const CART_COOKIE = "tv_cart";
const CART_COOKIE_DAYS = 30;

export type CartResult = { ok: true; cart: Cart } | { ok: false; error: string };
type LiveCartResponse = { cart: Cart; cartToken: string | null };

const isMock = () => getServerEnv().API_MODE === "mock";

async function guestToken() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

/** Only callable from Server Actions / Route Handlers (cookies are read-only in RSC). */
async function setGuestToken(token: string | null) {
  const jar = await cookies();
  if (!token) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_DAYS * 86_400,
  });
}

function liveHeaders(user: SessionUser | null, token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers["x-cart-token"] = token;
  return { headers, accessToken: user?.accessToken ?? undefined };
}

function findMockCart(db: MockDb, user: SessionUser | null, token: string | null): MockCart | undefined {
  const storeSlug = getServerEnv().STORE_SLUG;
  return db.carts.find(
    (c) =>
      c.storeSlug === storeSlug &&
      c.status === "active" &&
      (user ? c.profileId === user.id : c.profileId === null && token !== null && c.token === token),
  );
}

/** Promotion ids this customer already redeemed (orders that used a coupon). */
export function mockTimesUsed(db: MockDb, profileId: string | null, email: string | null): Record<string, number> {
  const used: Record<string, number> = {};
  for (const o of db.orders) {
    if (o.storeSlug !== getServerEnv().STORE_SLUG || !o.promotionId) continue;
    const mine = (profileId && o.profileId === profileId) || (email && o.email.toLowerCase() === email.toLowerCase());
    if (mine) used[o.promotionId] = (used[o.promotionId] ?? 0) + 1;
  }
  return used;
}

async function toCart(cart: MockCart, user: SessionUser | null): Promise<Cart> {
  const [store, db] = await Promise.all([getStore(), readMockDb()]);
  return buildCart(cart, mockProducts, store.taxRate, store.currencyCode, {
    promotions: mockPromotions,
    now: new Date(),
    timesUsed: mockTimesUsed(db, user?.id ?? null, user?.email ?? null),
  });
}

/** Current cart, or null if there is none yet. Request-time: render inside <Suspense>. */
export async function getCart(): Promise<Cart | null> {
  await connection();
  const [user, token] = await Promise.all([getSessionUser(), guestToken()]);
  if (isMock()) {
    const cart = findMockCart(await readMockDb(), user, token);
    return cart ? toCart(cart, user) : null;
  }
  if (!user && !token) return null;
  try {
    const res = await apiFetch<LiveCartResponse>("/v1/cart", liveHeaders(user, token));
    return res.cart;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function userError(error: unknown): CartResult {
  if (error instanceof ApiError && error.userMessage) return { ok: false, error: error.userMessage };
  throw error;
}

export async function addToCart(variantId: string, quantity: number): Promise<CartResult> {
  const [user, token] = await Promise.all([getSessionUser(), guestToken()]);

  if (!isMock()) {
    try {
      const res = await apiFetch<LiveCartResponse>("/v1/cart/items", {
        method: "POST",
        body: JSON.stringify({ variantId, quantity }),
        ...liveHeaders(user, token),
      });
      if (!user && res.cartToken && res.cartToken !== token) await setGuestToken(res.cartToken);
      return { ok: true, cart: res.cart };
    } catch (error) {
      return userError(error);
    }
  }

  const ref = findVariant(mockProducts, variantId);
  const result = await withMockDb((db) => {
    let cart = findMockCart(db, user, token);
    const existing = cart?.items.find((i) => i.variantId === variantId);
    const check = checkQuantity(ref, (existing?.quantity ?? 0) + quantity);
    if (!check.ok) return check;
    if (!cart) {
      cart = {
        id: randomUUID(),
        storeSlug: getServerEnv().STORE_SLUG,
        token: user ? null : randomBytes(24).toString("base64url"),
        profileId: user?.id ?? null,
        status: "active",
        items: [],
        updatedAt: new Date().toISOString(),
      };
      db.carts.push(cart);
    }
    if (existing) {
      existing.quantity = check.quantity;
    } else {
      cart.items.push({
        id: randomUUID(),
        variantId,
        quantity: check.quantity,
        unitPriceSnapshot: ref!.variant.price,
        addedAt: new Date().toISOString(),
      });
    }
    cart.updatedAt = new Date().toISOString();
    return { ok: true as const, cart: structuredClone(cart) };
  });
  if (!result.ok) return result;
  if (!user && result.cart.token !== token) await setGuestToken(result.cart.token);
  return { ok: true, cart: await toCart(result.cart, user) };
}

/** quantity 0 removes the line. Changing quantity also refreshes the price snapshot. */
export async function updateCartLine(lineId: string, quantity: number): Promise<CartResult> {
  const [user, token] = await Promise.all([getSessionUser(), guestToken()]);

  if (!isMock()) {
    try {
      const res = await apiFetch<LiveCartResponse>(`/v1/cart/items/${encodeURIComponent(lineId)}`, {
        method: quantity > 0 ? "PATCH" : "DELETE",
        body: quantity > 0 ? JSON.stringify({ quantity }) : undefined,
        ...liveHeaders(user, token),
      });
      return { ok: true, cart: res.cart };
    } catch (error) {
      return userError(error);
    }
  }

  const result = await withMockDb((db) => {
    const cart = findMockCart(db, user, token);
    const item = cart?.items.find((i) => i.id === lineId);
    if (!cart || !item) return { ok: false as const, error: "Ese producto ya no está en tu carrito." };
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i !== item);
    } else {
      const ref = findVariant(mockProducts, item.variantId);
      // Lowering quantity is always allowed, even if stock dropped meanwhile.
      const check = quantity < item.quantity ? ({ ok: true, quantity } as const) : checkQuantity(ref, quantity);
      if (!check.ok) return check;
      item.quantity = check.quantity;
      if (ref) item.unitPriceSnapshot = ref.variant.price;
    }
    cart.updatedAt = new Date().toISOString();
    return { ok: true as const, cart: structuredClone(cart) };
  });
  return result.ok ? { ok: true, cart: await toCart(result.cart, user) } : result;
}

/**
 * After sign-in: moves the guest cart into the customer's cart and drops the
 * guest cookie (carts.merged_into_cart_id in the backend).
 */
export async function mergeGuestCart(user: SessionUser): Promise<void> {
  const token = await guestToken();
  if (!token) return;

  if (!isMock()) {
    await apiFetch<LiveCartResponse>("/v1/cart/merge", { method: "POST", ...liveHeaders(user, token) }).catch(() => null);
    await setGuestToken(null);
    return;
  }

  await withMockDb((db) => {
    const guest = findMockCart(db, null, token);
    if (!guest || guest.items.length === 0) return;
    const target = findMockCart(db, user, null);
    if (!target) {
      // Adopt the guest cart as the customer's cart.
      guest.profileId = user.id;
      guest.token = null;
      guest.updatedAt = new Date().toISOString();
      return;
    }
    target.items = mergeItems(target.items, guest.items, mockProducts);
    target.updatedAt = new Date().toISOString();
    guest.status = "merged";
  });
  await setGuestToken(null);
}

/** On sign-out, forget any guest cart on this device. */
export async function forgetGuestCart(): Promise<void> {
  await setGuestToken(null);
}

/** Mock mode only: id of the active cart for this request (used by the mock checkout). */
export async function currentMockCartId(): Promise<string | null> {
  const [user, token] = await Promise.all([getSessionUser(), guestToken()]);
  return findMockCart(await readMockDb(), user, token)?.id ?? null;
}

/** Applies a coupon to the current cart. The code is validated against the cart contents. */
export async function applyCoupon(rawCode: string): Promise<CartResult> {
  const code = normalizeCode(rawCode);
  const [user, token] = await Promise.all([getSessionUser(), guestToken()]);
  if (!code) return { ok: false, error: "Ingresa un código." };

  if (!isMock()) {
    try {
      const res = await apiFetch<LiveCartResponse>("/v1/cart/promotion", {
        method: "POST",
        body: JSON.stringify({ code }),
        ...liveHeaders(user, token),
      });
      return { ok: true, cart: res.cart };
    } catch (error) {
      return userError(error);
    }
  }

  if (!mockPromotions.some((p) => p.code === code)) return { ok: false, error: "Ese cupón no existe." };
  const saved = await withMockDb((db) => {
    const cart = findMockCart(db, user, token);
    if (!cart) return null;
    cart.promotionCode = code;
    cart.updatedAt = new Date().toISOString();
    return structuredClone(cart);
  });
  if (!saved) return { ok: false, error: "Tu carrito está vacío." };
  const cart = await toCart(saved, user);
  if (cart.promotionError) {
    // Don't keep a code that doesn't apply right now.
    await removeCoupon();
    return { ok: false, error: cart.promotionError };
  }
  return { ok: true, cart };
}

export async function removeCoupon(): Promise<void> {
  const [user, token] = await Promise.all([getSessionUser(), guestToken()]);
  if (!isMock()) {
    await apiFetch<LiveCartResponse>("/v1/cart/promotion", { method: "DELETE", ...liveHeaders(user, token) });
    return;
  }
  await withMockDb((db) => {
    const cart = findMockCart(db, user, token);
    if (cart) cart.promotionCode = null;
  });
}
