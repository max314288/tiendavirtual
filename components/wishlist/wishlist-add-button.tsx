"use client";

import { useActionState, useEffect } from "react";
import { useCartUI } from "@/components/cart/cart-ui";
import { addToCartAction, type AddToCartState } from "@/lib/cart/actions";

export function WishlistAddButton({ variantId, disabled }: { variantId: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(addToCartAction, { status: "idle" } as AddToCartState);
  const { open, notify } = useCartUI();

  useEffect(() => {
    if (state.status === "success" && state.addedAt) {
      open();
      notify(state.message ?? "Producto agregado al carrito");
    }
  }, [state.addedAt, state.status, state.message, open, notify]);

  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={1} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="h-11 w-full rounded-xl bg-primary px-space-md text-label-lg text-on-primary hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? "Agotado" : pending ? "Agregando…" : "Agregar al carrito"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="text-label-sm text-error">
          {state.message}
        </p>
      )}
    </form>
  );
}
