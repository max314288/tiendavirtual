import type { ProductDetail, Variant } from "./types";

/** optionId → selected valueId */
export type Selection = Record<string, string>;

export type StockStatus = "in_stock" | "low_stock" | "backorder" | "out_of_stock";

export const LOW_STOCK_THRESHOLD = 5;

export function defaultVariant(product: ProductDetail, preferredId?: string | null): Variant {
  return (
    product.variants.find((v) => v.id === preferredId) ??
    product.variants.find((v) => v.isDefault && isPurchasable(v)) ??
    product.variants.find(isPurchasable) ??
    product.variants[0]
  );
}

export function selectionFor(product: ProductDetail, variant: Variant): Selection {
  const selection: Selection = {};
  for (const option of product.options) {
    const value = option.values.find((v) => variant.optionValueIds.includes(v.id));
    if (value) selection[option.id] = value.id;
  }
  return selection;
}

export function findVariant(product: ProductDetail, selection: Selection): Variant | undefined {
  const wanted = Object.values(selection);
  return product.variants.find((v) => wanted.every((id) => v.optionValueIds.includes(id)));
}

export function isPurchasable(variant: Variant): boolean {
  return variant.available > 0 || variant.allowBackorder;
}

/**
 * Whether picking `valueId` for `optionId`, keeping the other choices, leads
 * to a variant that can be bought. Used to mark unavailable sizes/colors.
 */
export function isValuePurchasable(product: ProductDetail, selection: Selection, optionId: string, valueId: string): boolean {
  const variant = findVariant(product, { ...selection, [optionId]: valueId });
  return variant ? isPurchasable(variant) : false;
}

/**
 * Selecting a value that has no exact match with the other choices falls back
 * to the first purchasable variant that has it, so the shopper never lands on
 * a non-existent combination.
 */
export function variantForChoice(product: ProductDetail, selection: Selection, optionId: string, valueId: string): Variant {
  const exact = findVariant(product, { ...selection, [optionId]: valueId });
  if (exact) return exact;
  const withValue = product.variants.filter((v) => v.optionValueIds.includes(valueId));
  return withValue.find(isPurchasable) ?? withValue[0] ?? product.variants[0];
}

export function stockStatus(variant: Variant): StockStatus {
  if (variant.available <= 0) return variant.allowBackorder ? "backorder" : "out_of_stock";
  return variant.available <= LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock";
}

/** True when variants differ in price ("Desde S/ …" on cards). */
export function hasPriceRange(product: ProductDetail): boolean {
  return new Set(product.variants.map((v) => v.price)).size > 1;
}
