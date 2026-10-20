import type { Metadata } from "next";
import { ShieldCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { CouponForm } from "@/components/cart/coupon-form";
import { CartTotals, CheckoutButton, FreeShippingBar } from "@/components/cart/cart-summary";
import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Container } from "@/components/layout/container";
import { getCart } from "@/lib/cart/api";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="py-space-md lg:py-space-xl">
      <div className="mb-space-md">
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Carrito" }]} />
      </div>
      <h1 className="mb-space-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">Tu carrito</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContent />
      </Suspense>
    </Container>
  );
}

async function CartContent() {
  const [cart, store] = await Promise.all([getCart(), getStore()]);
  const { currencyCode, locale, freeShippingThreshold } = store;

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-outline-variant px-space-lg py-16 text-center">
        <ShoppingBag className="mb-space-md size-10 text-on-surface-variant" aria-hidden />
        <p className="text-title-md text-on-surface">Tu carrito está vacío</p>
        <p className="mt-space-xs max-w-sm text-body-md text-on-surface-variant">Explora el catálogo y agrega tus favoritos.</p>
        <Link href="/buscar" className="mt-space-lg inline-flex h-12 items-center rounded-xl bg-primary px-space-lg text-label-lg text-on-primary hover:bg-surface-tint">
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12 lg:gap-gutter">
      <section aria-label="Productos" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-space-md lg:col-span-8">
        <ul>
          {cart.lines.map((line) => (
            <CartLineItem key={line.id} line={line} currencyCode={currencyCode} locale={locale} />
          ))}
        </ul>
      </section>

      <aside aria-label="Resumen del pedido" className="space-y-space-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg lg:sticky lg:top-40 lg:col-span-4">
        <h2 className="text-headline-sm text-on-surface">Resumen</h2>
        <FreeShippingBar subtotal={cart.subtotal} threshold={freeShippingThreshold} locale={locale} currencyCode={currencyCode} />
        <CouponForm promotion={cart.promotion} promotionError={cart.promotionError} />
        <CartTotals cart={cart} locale={locale} freeShippingThreshold={freeShippingThreshold} />
        <CheckoutButton cart={cart} />
        <p className="flex items-center justify-center gap-space-xs text-label-sm text-on-surface-variant">
          <ShieldCheck className="size-4" aria-hidden />
          Pago seguro · Boleta o factura electrónica
        </p>
        <Link href="/buscar" className="block text-center text-label-lg text-secondary hover:underline">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  const block = "animate-pulse rounded-lg bg-surface-container-low";
  return (
    <div className="grid gap-gutter lg:grid-cols-12" aria-busy="true">
      <span className="sr-only">Cargando carrito…</span>
      <div className="space-y-space-md lg:col-span-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className={`${block} h-72 lg:col-span-4`} />
    </div>
  );
}
