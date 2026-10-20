"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { approveMockReview, createReview } from "./api";

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int("Elige de 1 a 5 estrellas").min(1, "Elige de 1 a 5 estrellas").max(5, "Elige de 1 a 5 estrellas"),
  title: z.string().trim().min(3, "Escribe un título de al menos 3 caracteres").max(100, "Máximo 100 caracteres"),
  body: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)").max(2000, "Máximo 2000 caracteres"),
});

export async function createReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    productId: String(formData.get("productId") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  };
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  const { productId, ...input } = parsed.data;
  const result = await createReview(productId, input);
  if (!result.ok) return { status: "error", message: result.error, values: raw };
  refresh();
  return { status: "success", message: "¡Gracias! Publicaremos tu reseña cuando la revisemos." };
}

/** Mock mode only (demo moderation). */
export async function approveMockReviewAction(formData: FormData): Promise<void> {
  await approveMockReview(String(formData.get("reviewId") ?? ""));
  refresh();
}
