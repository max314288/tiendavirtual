"use client";

import { Tag, X } from "lucide-react";
import { useActionState } from "react";
import { applyCouponAction, removeCouponAction, type CouponState } from "@/lib/cart/actions";
import type { Cart } from "@/lib/cart/types";

/** Apply or remove a coupon code (promotion_codes). */
export function CouponForm({ promotion, promotionError }: Pick<Cart, "promotion" | "promotionError">) {
  const [state, action, pending] = useActionState(applyCouponAction, { status: "idle" } as CouponState);

  if (promotion) {
    return (
      <form action={removeCouponAction} className="flex items-center justify-between gap-space-sm rounded-lg bg-tertiary-fixed/30 px-space-sm py-1.5">
        <span className="flex min-w-0 items-center gap-space-xs text-label-md text-on-tertiary-fixed-variant">
          <Tag className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {promotion.code} · {promotion.label}
          </span>
        </span>
        <button type="submit" aria-label={`Quitar cupón ${promotion.code}`} className="flex size-touch shrink-0 items-center justify-center rounded-lg hover:bg-surface-container-low">
          <X className="size-4" aria-hidden />
        </button>
      </form>
    );
  }

  const message = state.status === "error" ? state.message : promotionError;
  return (
    <form action={action} className="space-y-1">
      <label htmlFor="coupon-code" className="text-label-md text-on-surface">
        Cupón de descuento
      </label>
      <div className="flex gap-space-xs">
        <input
          id="coupon-code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="BIENVENIDA10"
          aria-invalid={Boolean(message)}
          aria-describedby={message ? "coupon-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-space-sm text-body-md uppercase placeholder:normal-case focus:border-secondary focus:ring-2 focus:ring-secondary/15 focus:outline-none"
        />
        <button type="submit" disabled={pending} className="h-11 shrink-0 rounded-lg border border-outline-variant px-space-md text-label-lg text-on-surface hover:bg-surface-container-low disabled:opacity-60">
          {pending ? "…" : "Aplicar"}
        </button>
      </div>
      {message && (
        <p id="coupon-error" role="alert" className="text-label-sm text-error">
          {message}
        </p>
      )}
    </form>
  );
}
