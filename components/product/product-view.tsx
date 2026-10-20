"use client";

import { BadgeCheck, Check, Minus, Plus, RotateCcw, Truck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useCartUI } from "@/components/cart/cart-ui";
import { HeartButton } from "@/components/wishlist/wishlist-provider";
import { addToCartAction, type AddToCartState } from "@/lib/cart/actions";
import { discountPercent, savings } from "@/lib/catalog/pricing";
import type { ProductDetail, Variant } from "@/lib/catalog/types";
import {
  defaultVariant,
  isPurchasable,
  isValuePurchasable,
  selectionFor,
  stockStatus,
  variantForChoice,
  type StockStatus,
} from "@/lib/catalog/variants";
import { formatMoney } from "@/lib/money";
import { Price } from "./price";
import { ProductGallery } from "./product-gallery";
import { Rating } from "./rating";

type ProductViewProps = {
  product: ProductDetail;
  initialVariantId: string | null;
  currencyCode: string;
  locale: string;
};

const MAX_QUANTITY = 10;

const stockCopy: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "En stock", className: "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" },
  low_stock: { label: "Últimas unidades", className: "bg-amber-100 text-amber-900" },
  backorder: { label: "Disponible bajo pedido", className: "bg-secondary-fixed text-on-secondary-fixed-variant" },
  out_of_stock: { label: "Agotado", className: "bg-surface-container-high text-on-surface-variant" },
};

const benefits = [
  { icon: Truck, title: "Envío a todo el Perú", text: "Despacho a Lima y provincias" },
  { icon: BadgeCheck, title: "Garantía oficial", text: "Cobertura del fabricante" },
  { icon: RotateCcw, title: "30 días de prueba", text: "Cambios y devoluciones" },
];

function galleryFor(product: ProductDetail, variant: Variant) {
  if (!variant.image) return product.gallery;
  return [variant.image, ...product.gallery.filter((m) => m.url !== variant.image!.url)];
}

export function ProductView({ product, initialVariantId, currencyCode, locale }: ProductViewProps) {
  const [variant, setVariant] = useState(() => defaultVariant(product, initialVariantId));
  const [quantity, setQuantity] = useState(1);
  const [cartState, addAction, adding] = useActionState(addToCartAction, { status: "idle" } as AddToCartState);
  const cartUI = useCartUI();
  const selection = selectionFor(product, variant);
  const status = stockStatus(variant);
  const purchasable = isPurchasable(variant);
  const maxQuantity = variant.allowBackorder ? MAX_QUANTITY : Math.min(MAX_QUANTITY, Math.max(variant.available, 1));
  const discount = discountPercent(variant.price, variant.compareAtPrice);
  const saved = savings(variant.price, variant.compareAtPrice);
  const money = (amount: string) => formatMoney(amount, currencyCode, locale);

  // Open the drawer and show the toast after each successful add.
  const { open: openCart, notify } = cartUI;
  useEffect(() => {
    if (cartState.status === "success" && cartState.addedAt) {
      openCart();
      notify(cartState.message ?? "Producto agregado al carrito");
    }
  }, [cartState.addedAt, cartState.status, cartState.message, openCart, notify]);

  function choose(optionId: string, valueId: string) {
    const next = variantForChoice(product, selection, optionId, valueId);
    setVariant(next);
    setQuantity(1);
    // Shareable URL without a server round trip.
    const url = new URL(window.location.href);
    url.searchParams.set("variante", next.id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-space-xl pb-24 lg:grid-cols-12 lg:gap-12 lg:pb-0">
      <div className="lg:sticky lg:top-40 lg:col-span-7">
        <ProductGallery images={galleryFor(product, variant)} badges={discount ? [`Ahorra ${discount}%`] : []} />
      </div>

      <div className="flex flex-col gap-space-lg lg:col-span-5">
        <div className="space-y-space-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/marca/${product.brand.slug}`}
              className="text-label-md tracking-wide text-secondary uppercase hover:underline"
            >
              {product.brand.name}
            </Link>
            <span className="text-label-sm text-on-surface-variant">SKU: {variant.sku}</span>
          </div>
          <div className="flex items-start justify-between gap-space-sm">
            <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{product.name}</h1>
            <HeartButton productId={product.id} productName={product.name} variantId={variant.id} className="shrink-0 border border-outline-variant/40" />
          </div>
          <p className="text-body-lg text-on-surface-variant">{product.shortDescription}</p>
          <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
            <Rating average={product.ratingAvg} count={product.ratingCount} countLabel="reseñas" />
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm ${stockCopy[status].className}`}>
              {stockCopy[status].label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-space-sm rounded-xl bg-surface-container-low p-space-md">
          <Price price={variant.price} compareAtPrice={variant.compareAtPrice} currencyCode={currencyCode} locale={locale} size="lg" />
          <div className="text-right">
            {saved && <p className="text-label-md text-on-tertiary-container">Ahorras {money(saved)}</p>}
            <p className="text-label-sm text-on-surface-variant">Precio incluye IGV</p>
          </div>
        </div>

        {product.options.map((option) => {
          const selected = option.values.find((v) => v.id === selection[option.id]);
          const isSwatch = option.values.every((v) => v.swatchHex);
          return (
            <fieldset key={option.id} className="space-y-space-sm">
              <legend className="flex w-full items-center justify-between text-label-lg text-on-surface">
                <span>
                  {option.name}: <span className="font-normal text-on-surface-variant">{selected?.value}</span>
                </span>
              </legend>
              <div className="flex flex-wrap gap-space-sm">
                {option.values.map((value) => {
                  const isSelected = value.id === selection[option.id];
                  const available = isValuePurchasable(product, selection, option.id, value.id);
                  const label = `${option.name} ${value.value}${available ? "" : " (agotado)"}`;
                  return isSwatch ? (
                    <button
                      key={value.id}
                      type="button"
                      onClick={() => choose(option.id, value.id)}
                      aria-pressed={isSelected}
                      aria-label={label}
                      title={value.value}
                      className={`relative flex size-touch items-center justify-center rounded-full ring-2 ring-offset-2 transition-shadow ${
                        isSelected ? "ring-primary" : "ring-transparent hover:ring-outline-variant"
                      } ${available ? "" : "opacity-40"}`}
                      style={{ backgroundColor: value.swatchHex ?? undefined }}
                    >
                      {isSelected && <Check className="size-4 text-white mix-blend-difference" aria-hidden />}
                    </button>
                  ) : (
                    <button
                      key={value.id}
                      type="button"
                      onClick={() => choose(option.id, value.id)}
                      aria-pressed={isSelected}
                      aria-label={label}
                      className={`min-h-touch min-w-touch rounded-xl border px-space-md text-label-lg transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary"
                      } ${available ? "" : "text-on-surface-variant line-through decoration-1"}`}
                    >
                      {value.value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="space-y-space-sm">
          <div className="flex items-center justify-between">
            <span id="quantity-label" className="text-label-lg text-on-surface">
              Cantidad
            </span>
            {status === "low_stock" && (
              <span className="text-label-sm text-error">
                ¡Solo quedan {variant.available} {variant.available === 1 ? "unidad" : "unidades"}!
              </span>
            )}
          </div>
          <div className="flex items-center gap-space-md">
            <div
              role="group"
              aria-labelledby="quantity-label"
              className="flex items-center rounded-xl bg-surface-container-low p-1"
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || !purchasable}
                aria-label="Disminuir cantidad"
                className="flex size-touch items-center justify-center rounded-lg hover:bg-surface-container-high disabled:opacity-40"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <output aria-live="polite" className="w-10 text-center text-label-lg">
                {quantity}
              </output>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity || !purchasable}
                aria-label="Aumentar cantidad"
                className="flex size-touch items-center justify-center rounded-lg hover:bg-surface-container-high disabled:opacity-40"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <form id="add-to-cart" action={addAction} className="hidden flex-col gap-space-xs lg:flex">
          <input type="hidden" name="variantId" value={variant.id} />
          <input type="hidden" name="quantity" value={quantity} />
          <AddToCartButton purchasable={purchasable} pending={adding} />
          <CartError state={cartState} />
        </form>

        <ul className="grid grid-cols-1 gap-space-sm rounded-xl bg-surface-container-low p-space-md sm:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-space-sm sm:flex-col sm:text-center">
              <Icon className="size-5 shrink-0 text-secondary" aria-hidden />
              <div>
                <p className="text-label-md text-on-surface">{title}</p>
                <p className="text-label-sm text-on-surface-variant">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Sticky purchase bar on mobile and tablet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/40 bg-surface-container-lowest/95 px-margin-mobile py-space-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:px-margin-tablet lg:hidden">
        <div className="mx-auto flex max-w-page items-center gap-space-md">
          <div className="min-w-0">
            <p className="text-headline-sm text-on-surface">{money(variant.price)}</p>
            <p className="truncate text-label-sm text-on-surface-variant">{variant.title !== "Única" ? variant.title : "Precio incluye IGV"}</p>
          </div>
          <div className="flex-1">
            {/* Same form as the desktop button, via the form attribute. */}
            <AddToCartButton purchasable={purchasable} pending={adding} form="add-to-cart" />
          </div>
        </div>
        <div className="mx-auto max-w-page empty:hidden">
          <CartError state={cartState} />
        </div>
      </div>
    </div>
  );
}

function AddToCartButton({ purchasable, pending, form }: { purchasable: boolean; pending: boolean; form?: string }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={!purchasable || pending}
      aria-busy={pending}
      className="h-12 w-full rounded-xl bg-primary px-space-md text-label-lg text-on-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {!purchasable ? "Agotado" : pending ? "Agregando…" : "Agregar al carrito"}
    </button>
  );
}

function CartError({ state }: { state: AddToCartState }) {
  if (state.status !== "error") return null;
  return (
    <p role="alert" className="text-center text-label-sm text-error">
      {state.message}
    </p>
  );
}
