import "server-only";
import { randomUUID } from "node:crypto";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/types";
import { formatOrderNumber, nextSequence } from "@/lib/checkout/mock";
import type { ReturnCondition, ReturnRequest } from "@/lib/checkout/types";
import { getServerEnv } from "@/lib/env";
import { readMockDb, withMockDb, type MockDb, type MockOrder } from "@/lib/mock-db";
import { creditNoteSeries, refundAmount, returnEligibility, validateReturnItems } from "./post-sale";

// Post-sale: order lookup, return requests and the customer's returns.
// Shipping updates, return approval and refunds happen in the admin panel
// (another project); in mock mode `advanceMockOrder` simulates them.

const isMock = () => getServerEnv().API_MODE === "mock";
const storeSlug = () => getServerEnv().STORE_SLUG;

function findAccessible(db: MockDb, number: string, accessToken: string | null, user: SessionUser | null): MockOrder | undefined {
  const order = db.orders.find((o) => o.storeSlug === storeSlug() && o.number === number);
  if (!order) return undefined;
  const allowed = (user && order.profileId === user.id) || (accessToken !== null && accessToken === order.accessToken);
  return allowed ? order : undefined;
}

/** "Rastrear mi pedido": number + purchase email → access token. Same answer for any mismatch. */
export async function lookupOrder(number: string, email: string): Promise<string | null> {
  if (isMock()) {
    const db = await readMockDb();
    const order = db.orders.find(
      (o) => o.storeSlug === storeSlug() && o.number === number.trim().toUpperCase() && o.email.toLowerCase() === email.trim().toLowerCase(),
    );
    return order?.accessToken ?? null;
  }
  try {
    const res = await apiFetch<{ accessToken: string }>("/v1/orders/lookup", { method: "POST", body: JSON.stringify({ number, email }) });
    return res.accessToken;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return null;
    throw error;
  }
}

export type ReturnInput = {
  items: { orderLineId: string; quantity: number; condition: ReturnCondition }[];
  reason: string;
  comment: string | null;
};

export type ReturnResult = { ok: true; returnNumber: string } | { ok: false; error: string };

export async function requestReturn(number: string, accessToken: string | null, input: ReturnInput): Promise<ReturnResult> {
  const user = await getSessionUser();
  if (!isMock()) {
    try {
      const qs = accessToken ? `?t=${encodeURIComponent(accessToken)}` : "";
      const res = await apiFetch<{ returnNumber: string }>(`/v1/orders/${encodeURIComponent(number)}/returns${qs}`, {
        method: "POST",
        body: JSON.stringify(input),
        accessToken: user?.accessToken ?? undefined,
      });
      return { ok: true, returnNumber: res.returnNumber };
    } catch (error) {
      if (error instanceof ApiError && error.userMessage) return { ok: false, error: error.userMessage };
      throw error;
    }
  }

  return withMockDb((db): ReturnResult => {
    const order = findAccessible(db, number, accessToken, user);
    if (!order) return { ok: false, error: "No encontramos el pedido." };
    const eligibility = returnEligibility(order, new Date());
    if (!eligibility.eligible) return { ok: false, error: eligibility.reason };
    const items = input.items.filter((i) => i.quantity > 0);
    const invalid = validateReturnItems(order, items);
    if (invalid) return { ok: false, error: invalid };

    const returnNumber = formatOrderNumber("DEV", nextSequence(db.sequences, `${storeSlug()}:return:DEV`));
    const request: ReturnRequest = {
      id: randomUUID(),
      number: returnNumber,
      orderNumber: order.number,
      status: "requested",
      reason: input.reason,
      comment: input.comment,
      createdAt: new Date().toISOString(),
      items: items.map((i) => ({
        ...i,
        productName: order.lines.find((l) => l.id === i.orderLineId)?.productName ?? "",
      })),
      refundAmount: refundAmount(order, items),
    };
    order.returns.push(request);
    return { ok: true, returnNumber };
  });
}

export type ReturnWithOrder = ReturnRequest & { orderAccessToken: string };

export async function listReturns(user: SessionUser): Promise<ReturnWithOrder[]> {
  if (isMock()) {
    const db = await readMockDb();
    return db.orders
      .filter((o) => o.storeSlug === storeSlug() && o.profileId === user.id)
      .flatMap((o) => (o.returns ?? []).map((r) => ({ ...r, orderAccessToken: o.accessToken })))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return apiFetch<ReturnWithOrder[]>("/v1/me/returns", { accessToken: user.accessToken ?? undefined });
}

// ---------------------------------------------------------------------------
// Mock-only simulation of what the admin panel and carriers do.

export type MockOrderStep = "process" | "ship" | "deliver" | "approve_return" | "receive_return" | "reject_return";

export async function advanceMockOrder(number: string, accessToken: string | null, step: MockOrderStep): Promise<void> {
  if (!isMock()) throw new Error("advanceMockOrder is only available with API_MODE=mock");
  const user = await getSessionUser();
  await withMockDb((db) => {
    const order = findAccessible(db, number, accessToken, user);
    if (!order) return;
    const now = new Date().toISOString();
    const log = (field: "status" | "payment_status" | "fulfillment_status", to: string, note: string | null = null) =>
      order.history.push({ field, to, at: now, note });

    switch (step) {
      case "process":
        if (order.status === "confirmed") {
          order.status = "processing";
          log("status", "processing");
        }
        break;
      case "ship":
        if (order.shipments.length === 0) {
          order.status = "processing";
          order.shipments.push({
            id: randomUUID(),
            carrier: "Olva Courier",
            trackingNumber: `OLV${String(Date.now()).slice(-9)}`,
            trackingUrl: null,
            status: "in_transit",
            shippedAt: now,
            deliveredAt: null,
            items: order.lines.map((l) => ({ orderLineId: l.id, quantity: l.quantity })),
          });
          for (const l of order.lines) l.quantityFulfilled = l.quantity;
          order.fulfillmentStatus = "fulfilled";
          log("fulfillment_status", "fulfilled", "Despachado con Olva Courier");
        }
        break;
      case "deliver":
        for (const s of order.shipments) {
          s.status = "delivered";
          s.deliveredAt ??= now;
        }
        if (order.shipments.length > 0 && order.status !== "completed") {
          order.status = "completed";
          log("status", "completed", "Entregado");
        }
        break;
      case "approve_return":
      case "reject_return":
      case "receive_return": {
        const ret = order.returns.find((r) => r.status === (step === "receive_return" ? "approved" : "requested"));
        if (!ret) break;
        if (step === "approve_return") ret.status = "approved";
        if (step === "reject_return") ret.status = "rejected";
        if (step === "receive_return") {
          // Receiving the goods refunds them and issues the credit note.
          ret.status = "refunded";
          for (const item of ret.items) {
            const line = order.lines.find((l) => l.id === item.orderLineId);
            if (line) line.quantityReturned += item.quantity;
          }
          const series = creditNoteSeries(order.invoice?.kind ?? "receipt");
          const creditNumber = nextSequence(db.sequences, `${storeSlug()}:credit_note:${series}`);
          order.refunds.push({
            id: randomUUID(),
            amount: ret.refundAmount,
            status: "processed",
            reason: ret.reason,
            createdAt: now,
            returnNumber: ret.number,
            creditNote: { series, number: creditNumber, status: "accepted" },
          });
          order.refundedTotal = (Number(order.refundedTotal) + Number(ret.refundAmount)).toFixed(2);
          order.paymentStatus = Number(order.refundedTotal) >= Number(order.grandTotal) ? "refunded" : "partially_refunded";
          log("payment_status", order.paymentStatus, `Reembolso por ${ret.number}`);
          if (order.lines.every((l) => l.quantityReturned >= l.quantity)) {
            order.fulfillmentStatus = "returned";
            log("fulfillment_status", "returned");
          }
        }
        break;
      }
    }
  });
}
