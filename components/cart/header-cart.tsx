import { getCart } from "@/lib/cart/api";
import type { Store } from "@/lib/store/types";
import { CartDrawer } from "./cart-drawer";

/** Reads the cart (request-time): render inside <Suspense fallback={<HeaderCartFallback />}>. */
export async function HeaderCart({ store }: { store: Store }) {
  const cart = await getCart();
  return (
    <CartDrawer
      cart={cart}
      currencyCode={store.currencyCode}
      locale={store.locale}
      freeShippingThreshold={store.freeShippingThreshold}
    />
  );
}

export function HeaderCartFallback({ store }: { store: Store }) {
  return (
    <CartDrawer cart={null} currencyCode={store.currencyCode} locale={store.locale} freeShippingThreshold={store.freeShippingThreshold} />
  );
}
