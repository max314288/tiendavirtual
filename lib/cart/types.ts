import type { Media, Money } from "@/lib/catalog/types";

/**
 * Cart contract (Modelo BD v2 §6: carts, cart_items; stock from
 * inventory_levels / inventory_reservations), as returned by /v1/cart.
 */

/** Why a line can't be bought as-is. Computed by the backend on every read. */
export type CartLineIssue = "price_changed" | "insufficient_stock" | "out_of_stock" | "unavailable";

export type CartLine = {
  id: string;
  variantId: string;
  productSlug: string;
  productName: string;
  /** "Negro mate" or "Única" for single-variant products. */
  variantTitle: string;
  sku: string;
  image: Media | null;
  quantity: number;
  /** Current variant price. */
  unitPrice: Money;
  /** Price when the line was added (cart_items.unit_price_snapshot). */
  unitPriceSnapshot: Money;
  compareAtPrice: Money | null;
  lineTotal: Money;
  /** Share of the coupon discount allocated to this line (for exact tax and refunds). */
  discountAmount: Money;
  /** Units the shopper can still get (on hand − reserved by others). */
  available: number;
  allowBackorder: boolean;
  issue: CartLineIssue | null;
};

export type Cart = {
  id: string;
  currencyCode: string;
  lines: CartLine[];
  itemCount: number;
  /** Before discounts. */
  subtotal: Money;
  discountTotal: Money;
  /** Applied coupon (carts.promotion_code_id), if it currently qualifies. */
  promotion: { code: string; label: string; freeShipping: boolean } | null;
  /** Why the saved coupon doesn't apply right now (e.g. subtotal too low). */
  promotionError: string | null;
  /** Tax already included in the prices (IGV), for display. */
  taxIncluded: Money;
  /** subtotal − discountTotal (shipping is added at checkout). */
  total: Money;
  updatedAt: string;
};

export const MAX_LINE_QUANTITY = 10;
