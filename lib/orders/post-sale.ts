import { fromCents, toCents } from "@/lib/cart/totals";
import type { InvoiceKind, Order, ReturnRequest, ReturnStatus } from "@/lib/checkout/types";

// Post-sale rules shared by the UI and the mock backend. The real backend
// enforces the same rules; the UI uses them to show what's possible.

export const RETURN_WINDOW_DAYS = 30;
const DAY = 86_400_000;

const OPEN_RETURN: ReadonlySet<ReturnStatus> = new Set(["requested", "approved", "received"]);

/** When the whole order was delivered (latest shipment), or null. */
export function deliveredAt(order: Pick<Order, "shipments">): string | null {
  if (order.shipments.length === 0 || order.shipments.some((s) => s.status !== "delivered" || !s.deliveredAt)) return null;
  return order.shipments.map((s) => s.deliveredAt!).sort().at(-1)!;
}

/** Units per line that can still be returned: delivered − returned − in an open return. */
export function returnableQuantities(order: Pick<Order, "lines" | "returns">): Record<string, number> {
  const pending: Record<string, number> = {};
  for (const r of order.returns) {
    if (!OPEN_RETURN.has(r.status)) continue;
    for (const i of r.items) pending[i.orderLineId] = (pending[i.orderLineId] ?? 0) + i.quantity;
  }
  return Object.fromEntries(
    order.lines.map((l) => [l.id, Math.max(0, l.quantityFulfilled - l.quantityReturned - (pending[l.id] ?? 0))]),
  );
}

export type ReturnEligibility = { eligible: true; until: string } | { eligible: false; reason: string };

export function returnEligibility(order: Order, now: Date): ReturnEligibility {
  if (order.status === "cancelled") return { eligible: false, reason: "El pedido fue cancelado." };
  const delivered = deliveredAt(order);
  if (!delivered) return { eligible: false, reason: "Podrás solicitar una devolución cuando recibas tu pedido." };
  const until = new Date(new Date(delivered).getTime() + RETURN_WINDOW_DAYS * DAY);
  if (now > until) return { eligible: false, reason: `El plazo de ${RETURN_WINDOW_DAYS} días para devoluciones ya venció.` };
  const remaining = Object.values(returnableQuantities(order)).reduce((a, b) => a + b, 0);
  if (remaining === 0) return { eligible: false, reason: "Ya solicitaste la devolución de todos los productos." };
  return { eligible: true, until: until.toISOString() };
}

/** Refund for returned units at the price paid (shipping is not refunded). */
export function refundAmount(order: Pick<Order, "lines">, items: { orderLineId: string; quantity: number }[]): string {
  let cents = 0;
  for (const item of items) {
    const line = order.lines.find((l) => l.id === item.orderLineId);
    if (line) cents += toCents(line.unitPrice) * item.quantity;
  }
  return fromCents(cents);
}

/** Validates requested quantities against what's returnable. Returns an error or null. */
export function validateReturnItems(order: Order, items: { orderLineId: string; quantity: number }[]): string | null {
  const selected = items.filter((i) => i.quantity > 0);
  if (selected.length === 0) return "Elige al menos un producto para devolver.";
  const available = returnableQuantities(order);
  for (const item of selected) {
    if (!(item.orderLineId in available)) return "Uno de los productos no pertenece a este pedido.";
    if (item.quantity > available[item.orderLineId]) return "La cantidad supera lo que puedes devolver.";
  }
  return null;
}

/** SUNAT series for the credit note that modifies a boleta (BC01) or a factura (FC01). */
export function creditNoteSeries(kind: InvoiceKind): string {
  return kind === "invoice" ? "FC01" : "BC01";
}

export const RETURN_STEPS = ["Solicitada", "Aprobada", "Recibida", "Reembolsada"] as const;

/** Index of the last completed return step, or null if rejected. */
export function returnProgress(status: ReturnStatus): number | null {
  switch (status) {
    case "requested":
      return 0;
    case "approved":
      return 1;
    case "received":
      return 2;
    case "refunded":
      return 3;
    default:
      return null;
  }
}

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Solicitada",
  approved: "Aprobada",
  received: "Recibida",
  rejected: "Rechazada",
  refunded: "Reembolsada",
};

export function openReturns(returns: ReturnRequest[]) {
  return returns.filter((r) => OPEN_RETURN.has(r.status));
}
