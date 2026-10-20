import type { InvoiceKind, InvoiceStatus, Order } from "./types";

export const ORDER_STEPS = ["Pedido confirmado", "En preparación", "En camino", "Entregado"] as const;

/** Index of the last completed step (−1 for pending payment), or null when cancelled. */
export function orderProgress(
  order: Pick<Order, "status" | "paymentStatus" | "fulfillmentStatus"> & { shipments?: Order["shipments"] },
): number | null {
  if (order.status === "cancelled") return null;
  const shipments = order.shipments ?? [];
  const allDelivered = shipments.length > 0 && shipments.every((s) => s.status === "delivered");
  if (order.status === "completed" || allDelivered) return 3;
  if (shipments.some((s) => s.status !== "pending" && s.status !== "failed") || order.fulfillmentStatus !== "unfulfilled") return 2;
  if (order.status === "processing") return 1;
  if (order.paymentStatus === "paid" || order.paymentStatus === "authorized" || order.status === "confirmed") return 0;
  return -1;
}

export const ORDER_STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pendiente de pago",
  confirmed: "Confirmado",
  processing: "En preparación",
  completed: "Entregado",
  cancelled: "Cancelado",
};

export const INVOICE_KIND_LABEL: Record<InvoiceKind, string> = {
  receipt: "Boleta electrónica",
  invoice: "Factura electrónica",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: "En emisión",
  signed: "Firmada",
  accepted: "Aceptada por SUNAT",
  rejected: "Observada por SUNAT",
  cancelled: "Anulada",
};
