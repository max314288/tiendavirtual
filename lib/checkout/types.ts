import type { Media, Money } from "@/lib/catalog/types";

/**
 * Checkout and order contract (Modelo BD v2 §8 orders, §9 payments, §10
 * invoices, §11 shipping), as returned by /v1/checkout and /v1/orders.
 */

export type ShippingRate = {
  id: string;
  name: string;
  price: Money;
  /** Price after free-shipping rules (shipping_rates.free_over_amount). */
  finalPrice: Money;
  estimatedDays: string;
};

/** receipt = boleta, invoice = factura (invoices.invoice_type). */
export type InvoiceKind = "receipt" | "invoice";

export type OrderAddress = {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  countryCode: string;
};

export type CheckoutPayment = { provider: "culqi"; token: string } | { provider: "manual"; token: string };

export type CheckoutRequest = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  shippingAddress: OrderAddress;
  /** Save the new address to the customer's book (signed-in only). */
  saveAddress: boolean;
  shippingRateId: string;
  invoice:
    | { kind: "receipt"; documentType: "DNI" | "CE" | null; documentNumber: string | null; name: string }
    | { kind: "invoice"; ruc: string; companyName: string; fiscalAddress: string };
  customerNote: string | null;
  payment: CheckoutPayment;
};

export type CheckoutResult =
  | { ok: true; orderNumber: string; accessToken: string }
  | { ok: false; code: "payment_declined" | "cart_changed" | "invalid"; error: string };

export type OrderStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "authorized" | "paid" | "partially_refunded" | "refunded";
export type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled" | "returned";
export type InvoiceStatus = "pending" | "signed" | "accepted" | "rejected" | "cancelled";

export type OrderLine = {
  id: string;
  productSlug: string;
  productName: string;
  variantTitle: string;
  sku: string;
  image: Media | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
  /** order_items.quantity_fulfilled / quantity_returned */
  quantityFulfilled: number;
  quantityReturned: number;
};

export type Order = {
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  placedAt: string;
  email: string;
  customerName: string;
  currencyCode: string;
  lines: OrderLine[];
  subtotal: Money;
  discountTotal: Money;
  shippingTotal: Money;
  taxTotal: Money;
  grandTotal: Money;
  shippingAddress: OrderAddress;
  shippingMethod: { name: string; estimatedDays: string };
  payment: { provider: string; method: string; brand: string | null; last4: string | null; reference: string | null };
  invoice: {
    kind: InvoiceKind;
    series: string;
    number: number;
    status: InvoiceStatus;
    pdfUrl: string | null;
    receiverName: string;
    receiverDocument: string | null;
  } | null;
  /** Coupon used (promotion_redemptions). */
  promotion: { code: string; label: string } | null;
  refundedTotal: Money;
  shipments: Shipment[];
  returns: ReturnRequest[];
  refunds: Refund[];
  history: OrderEvent[];
};

export type ShipmentStatus = "pending" | "shipped" | "in_transit" | "delivered" | "failed";

/** shipments + shipment_items (§11). */
export type Shipment = {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: { orderLineId: string; quantity: number }[];
};

export type ReturnStatus = "requested" | "approved" | "received" | "rejected" | "refunded";
export type ReturnCondition = "new" | "damaged";

export const RETURN_REASONS = [
  "No era lo que esperaba",
  "Llegó dañado o con fallas",
  "Talla o medida incorrecta",
  "Recibí un producto equivocado",
  "Otro motivo",
] as const;

/** returns + return_items (§11). */
export type ReturnRequest = {
  id: string;
  number: string;
  orderNumber: string;
  status: ReturnStatus;
  reason: string;
  comment: string | null;
  createdAt: string;
  items: { orderLineId: string; productName: string; quantity: number; condition: ReturnCondition }[];
  /** Expected refund for the returned items (shipping is not refunded). */
  refundAmount: Money;
};

/** refunds (+ credit note invoice, §9–10). */
export type Refund = {
  id: string;
  amount: Money;
  status: "pending" | "processed" | "failed";
  reason: string;
  createdAt: string;
  returnNumber: string | null;
  creditNote: { series: string; number: number; status: InvoiceStatus } | null;
};

/** order_status_history entry. */
export type OrderEvent = {
  field: "status" | "payment_status" | "fulfillment_status";
  to: string;
  at: string;
  note: string | null;
};

export type OrderSummary = Pick<Order, "number" | "status" | "paymentStatus" | "fulfillmentStatus" | "placedAt" | "grandTotal" | "currencyCode"> & {
  itemCount: number;
  /** Lets guests and links open the order page. */
  accessToken: string;
};
