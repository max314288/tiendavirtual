"use client";

import { Star } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui/form";
import { initialFormState } from "@/lib/forms";
import { createReviewAction } from "@/lib/reviews/actions";

const labels = ["", "Malo", "Regular", "Bueno", "Muy bueno", "Excelente"];

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(createReviewAction, initialFormState);
  const [rating, setRating] = useState(Number(state.values?.rating) || 0);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form action={action} noValidate className="space-y-space-md">
      <input type="hidden" name="productId" value={productId} />
      <FormMessage state={state} />
      <fieldset>
        <legend className="mb-1 text-label-md text-on-surface">Tu calificación</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
                aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}: ${labels[n]}`}
              />
              <span className="flex size-touch items-center justify-center rounded-lg peer-focus-visible:outline-2 peer-focus-visible:outline-secondary">
                <Star className={`size-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-outline-variant"}`} aria-hidden />
              </span>
            </label>
          ))}
          <span className="ml-space-xs text-label-md text-on-surface-variant" aria-hidden>
            {labels[rating]}
          </span>
        </div>
        {errors.rating && <p className="text-label-sm text-error">{errors.rating[0]}</p>}
      </fieldset>
      <TextField label="Título" name="title" maxLength={100} required defaultValue={state.values?.title} errors={errors.title} />
      <div className="space-y-1">
        <label htmlFor="review-body" className="text-label-md text-on-surface">
          Tu opinión
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={2000}
          required
          defaultValue={state.values?.body}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={errors.body ? "review-body-error" : undefined}
          className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-space-sm text-body-md focus:border-secondary focus:ring-2 focus:ring-secondary/15 focus:outline-none aria-[invalid=true]:border-error"
        />
        {errors.body && (
          <p id="review-body-error" className="text-label-sm text-error">
            {errors.body[0]}
          </p>
        )}
      </div>
      <SubmitButton pendingLabel="Enviando…">Publicar reseña</SubmitButton>
    </form>
  );
}
