import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { CheckoutForm, type PaymentConfig } from "@/components/checkout/checkout-form";
import { Container } from "@/components/layout/container";
import { getCustomer, listAddresses } from "@/lib/account/api";
import { getSessionUser } from "@/lib/auth";
import { getCart } from "@/lib/cart/api";
import { cartBlocked } from "@/lib/checkout/api";
import { getServerEnv } from "@/lib/env";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container className="py-space-md lg:py-space-xl">
      <div className="mb-space-md">
        <Breadcrumbs items={[{ label: "Carrito", href: "/carrito" }, { label: "Checkout" }, { label: "Confirmación" }]} />
      </div>
      <h1 className="mb-space-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">Finalizar compra</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContent />
      </Suspense>
    </Container>
  );
}

async function CheckoutContent() {
  const [cart, store, user] = await Promise.all([getCart(), getStore(), getSessionUser()]);
  // Empty carts and carts with stock problems go back to the cart page.
  if (!cart || cartBlocked(cart)) redirect("/carrito");

  const [customer, addresses] = user ? await Promise.all([getCustomer(user), listAddresses(user)]) : [null, []];
  const env = getServerEnv();
  const payment: PaymentConfig =
    env.API_MODE === "live" && env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
      ? { provider: "culqi", publicKey: env.NEXT_PUBLIC_CULQI_PUBLIC_KEY }
      : { provider: "mock" };

  return (
    <CheckoutForm
      cart={cart}
      storeName={store.name}
      currencyCode={store.currencyCode}
      locale={store.locale}
      customer={customer && { email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone }}
      addresses={addresses}
      payment={payment}
    />
  );
}

function CheckoutSkeleton() {
  const block = "animate-pulse rounded-xl bg-surface-container-low";
  return (
    <div className="grid gap-gutter lg:grid-cols-12" aria-busy="true">
      <span className="sr-only">Cargando checkout…</span>
      <div className="space-y-space-md lg:col-span-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-40`} />
        ))}
      </div>
      <div className={`${block} h-80 lg:col-span-4`} />
    </div>
  );
}
