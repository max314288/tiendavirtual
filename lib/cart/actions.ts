"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { addToCart, applyCoupon, removeCoupon, updateCartLine } from "./api";
import { MAX_LINE_QUANTITY } from "./types";

export type AddToCartState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Changes on every successful add so the UI can react (open the drawer). */
  addedAt?: number;
};

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export async function addToCartAction(_prev: AddToCartState, formData: FormData): Promise<AddToCartState> {
  const parsed = addSchema.safeParse({ variantId: formData.get("variantId"), quantity: formData.get("quantity") });
  if (!parsed.success) return { status: "error", message: "Elige una opción y una cantidad válida." };

  const result = await addToCart(parsed.data.variantId, parsed.data.quantity);
  if (!result.ok) return { status: "error", message: result.error };
  refresh();
  return { status: "success", message: "Producto agregado al carrito", addedAt: Date.now() };
}

const lineSchema = z.object({
  lineId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(MAX_LINE_QUANTITY),
});

export type LineState = { error?: string };

/** Quantity steppers and "remove" (quantity 0). */
export async function updateCartLineAction(_prev: LineState, formData: FormData): Promise<LineState> {
  const parsed = lineSchema.safeParse({ lineId: formData.get("lineId"), quantity: formData.get("quantity") });
  if (!parsed.success) return { error: "Cantidad no válida." };
  const result = await updateCartLine(parsed.data.lineId, parsed.data.quantity);
  refresh();
  return result.ok ? {} : { error: result.error };
}

export type CouponState = { status: "idle" | "error" | "success"; message?: string };

export async function applyCouponAction(_prev: CouponState, formData: FormData): Promise<CouponState> {
  const code = String(formData.get("code") ?? "").slice(0, 40);
  const result = await applyCoupon(code);
  refresh();
  return result.ok ? { status: "success", message: `Cupón ${result.cart.promotion?.code} aplicado.` } : { status: "error", message: result.error };
}

export async function removeCouponAction(): Promise<void> {
  await removeCoupon();
  refresh();
}
