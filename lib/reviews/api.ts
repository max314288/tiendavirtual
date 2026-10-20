import "server-only";
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/types";
import { products as mockProducts } from "@/lib/catalog/mock/data";
import { getServerEnv } from "@/lib/env";
import { readMockDb, withMockDb, type MockDb, type MockReview } from "@/lib/mock-db";
import { deliveredAt } from "@/lib/orders/post-sale";
import { seedReviews } from "./mock-data";
import type { ProductReviews, Review, ReviewableProduct } from "./types";

// Reviews are moderated (status pending → approved by the admin panel).
// A review is a "compra verificada" when the customer received the product.

const isMock = () => getServerEnv().API_MODE === "mock";
const storeSlug = () => getServerEnv().STORE_SLUG;

export type ReviewInput = { rating: number; title: string; body: string };
export type ReviewResult = { ok: true } | { ok: false; error: string };

function toReview(r: MockReview, user: SessionUser | null): Review {
  return {
    id: r.id,
    productId: r.productId,
    authorName: r.authorName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verifiedPurchase: r.orderNumber !== null,
    status: r.status,
    helpfulCount: 0,
    createdAt: r.createdAt,
    isMine: user?.id === r.profileId,
  };
}

/** Delivered orders of this customer that contain the product. */
function deliveredOrderWith(db: MockDb, user: SessionUser, productSlug: string): string | null {
  const order = db.orders.find(
    (o) => o.storeSlug === storeSlug() && o.profileId === user.id && deliveredAt(o) && o.lines.some((l) => l.productSlug === productSlug),
  );
  return order?.number ?? null;
}

export async function getProductReviews(productId: string): Promise<ProductReviews> {
  await connection();
  const user = await getSessionUser();
  if (!isMock()) {
    return apiFetch<ProductReviews>(`/v1/products/${encodeURIComponent(productId)}/reviews`, {
      accessToken: user?.accessToken ?? undefined,
    });
  }
  const db = await readMockDb();
  const stored = db.reviews.filter((r) => r.storeSlug === storeSlug() && r.productId === productId);
  const mineRow = user ? stored.find((r) => r.profileId === user.id) : undefined;
  const visible = [
    ...seedReviews.filter((r) => r.productId === productId),
    ...stored.filter((r) => r.status === "approved" || r.profileId === user?.id).map((r) => toReview(r, user)),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    reviews: visible,
    mine: mineRow ? toReview(mineRow, user) : null,
    canReview: Boolean(user) && !mineRow,
    signedIn: Boolean(user),
  };
}

export async function createReview(productId: string, input: ReviewInput): Promise<ReviewResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Inicia sesión para escribir una reseña." };

  if (!isMock()) {
    try {
      await apiFetch(`/v1/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        body: JSON.stringify(input),
        accessToken: user.accessToken ?? undefined,
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError && error.userMessage) return { ok: false, error: error.userMessage };
      throw error;
    }
  }

  const product = mockProducts.find((p) => p.id === productId);
  if (!product) return { ok: false, error: "Producto no encontrado." };
  return withMockDb((db): ReviewResult => {
    // UNIQUE(product_id, customer_id): one review per product.
    if (db.reviews.some((r) => r.storeSlug === storeSlug() && r.productId === productId && r.profileId === user.id)) {
      return { ok: false, error: "Ya escribiste una reseña de este producto." };
    }
    const first = user.firstName ?? "Cliente";
    const lastInitial = user.lastName ? ` ${user.lastName[0]}.` : "";
    db.reviews.push({
      id: randomUUID(),
      storeSlug: storeSlug(),
      productId,
      profileId: user.id,
      authorName: `${first}${lastInitial}`,
      ...input,
      orderNumber: deliveredOrderWith(db, user, product.slug),
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return { ok: true };
  });
}

export type MyReview = Review & { productSlug: string; productName: string };

export async function listMyReviews(user: SessionUser): Promise<MyReview[]> {
  if (!isMock()) return apiFetch<MyReview[]>("/v1/me/reviews", { accessToken: user.accessToken ?? undefined });
  const db = await readMockDb();
  return db.reviews
    .filter((r) => r.storeSlug === storeSlug() && r.profileId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const p = mockProducts.find((x) => x.id === r.productId);
      return { ...toReview(r, user), productSlug: p?.slug ?? "", productName: p?.name ?? "" };
    });
}

/** Delivered products the customer hasn't reviewed yet. */
export async function listReviewable(user: SessionUser): Promise<ReviewableProduct[]> {
  if (!isMock()) return apiFetch<ReviewableProduct[]>("/v1/me/reviewable", { accessToken: user.accessToken ?? undefined });
  const db = await readMockDb();
  const reviewed = new Set(db.reviews.filter((r) => r.storeSlug === storeSlug() && r.profileId === user.id).map((r) => r.productId));
  const out = new Map<string, ReviewableProduct>();
  for (const o of db.orders) {
    if (o.storeSlug !== storeSlug() || o.profileId !== user.id || !deliveredAt(o)) continue;
    for (const l of o.lines) {
      const p = mockProducts.find((x) => x.slug === l.productSlug);
      if (!p || reviewed.has(p.id) || out.has(p.id)) continue;
      out.set(p.id, { productId: p.id, productSlug: p.slug, productName: p.name, imageUrl: l.image?.url ?? null, orderNumber: o.number });
    }
  }
  return [...out.values()];
}

/** Mock mode only: stands in for moderation in the admin panel. */
export async function approveMockReview(reviewId: string): Promise<void> {
  if (!isMock()) throw new Error("approveMockReview is only available with API_MODE=mock");
  const user = await getSessionUser();
  if (!user) return;
  await withMockDb((db) => {
    const r = db.reviews.find((x) => x.id === reviewId && x.profileId === user.id);
    if (r) r.status = "approved";
  });
}
