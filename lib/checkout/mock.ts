import { fromCents, includedTaxCents, toCents } from "@/lib/cart/totals";
import type { CartLine } from "@/lib/cart/types";
import type { Money } from "@/lib/catalog/types";
import type { OrderLine, ShippingRate } from "./types";

// Pure pieces of the mock checkout; the backend does this with
// shipping_zones / shipping_rates and store_sequences.

const LIMA_ZONE = new Set(["Lima", "Callao"]);

type RateSeed = Omit<ShippingRate, "finalPrice"> & { freeEligible: boolean };

/** `freeShippingCoupon`: an ENVIOGRATIS-style promotion makes eligible rates free. */
export function mockShippingRates(
  province: string | null,
  subtotal: Money,
  freeOver: Money | null,
  freeShippingCoupon = false,
): ShippingRate[] {
  if (!province) return [];
  const seeds: RateSeed[] = LIMA_ZONE.has(province)
    ? [
        { id: "lima-std", name: "Envío estándar", price: "12.00", estimatedDays: "2 a 3 días hábiles", freeEligible: true },
        { id: "lima-exp", name: "Envío express", price: "25.00", estimatedDays: "24 horas hábiles", freeEligible: false },
      ]
    : [{ id: "prov-std", name: "Envío a provincia", price: "20.00", estimatedDays: "3 a 6 días hábiles", freeEligible: true }];
  const free = freeShippingCoupon || (freeOver !== null && toCents(subtotal) >= toCents(freeOver));
  return seeds.map(({ freeEligible, ...rate }) => ({ ...rate, finalPrice: free && freeEligible ? "0.00" : rate.price }));
}

/** Order totals: prices and shipping include IGV, extracted per line after its discount share. */
export function orderTotals(
  lines: (Pick<CartLine, "unitPrice" | "quantity"> & { discountAmount?: Money })[],
  shipping: Money,
  taxRate: number,
) {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  for (const l of lines) {
    const cents = toCents(l.unitPrice) * l.quantity;
    const lineDiscount = toCents(l.discountAmount ?? "0");
    subtotal += cents;
    discount += lineDiscount;
    tax += includedTaxCents(cents - lineDiscount, taxRate);
  }
  const shippingCents = toCents(shipping);
  tax += includedTaxCents(shippingCents, taxRate);
  return {
    subtotal: fromCents(subtotal),
    discountTotal: fromCents(discount),
    shippingTotal: fromCents(shippingCents),
    taxTotal: fromCents(tax),
    grandTotal: fromCents(subtotal - discount + shippingCents),
  };
}

export function toOrderLines(lines: CartLine[]): OrderLine[] {
  return lines.map((l) => ({
    id: l.id,
    productSlug: l.productSlug,
    productName: l.productName,
    variantTitle: l.variantTitle,
    sku: l.sku,
    image: l.image,
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    lineTotal: l.lineTotal,
    quantityFulfilled: 0,
    quantityReturned: 0,
  }));
}

/** Gapless numbering like store_sequences (SELECT … FOR UPDATE in the backend). */
export function nextSequence(sequences: Record<string, number>, key: string): number {
  const next = (sequences[key] ?? 0) + 1;
  sequences[key] = next;
  return next;
}

export function formatOrderNumber(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

/** "B001-00000042" style SUNAT series + correlative. */
export function formatInvoiceNumber(series: string, n: number) {
  return `${series}-${String(n).padStart(8, "0")}`;
}
