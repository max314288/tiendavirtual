import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/types";
import { currentMockCartId, forgetGuestCart, getCart, mockTimesUsed } from "@/lib/cart/api";
import { mockPromotions } from "@/lib/promotions/mock-data";
import type { Cart } from "@/lib/cart/types";
import { getServerEnv } from "@/lib/env";
import { readMockDb, withMockDb, type MockOrder } from "@/lib/mock-db";
import { getStore } from "@/lib/store/get-store";
import { formatOrderNumber, mockShippingRates, nextSequence, orderTotals, toOrderLines } from "./mock";
import type { CheckoutRequest, CheckoutResult, Order, OrderSummary, ShippingRate } from "./types";

// Checkout and orders. Live mode: the backend charges the Culqi token, creates
// the order, reserves stock and queues the SUNAT invoice (outbox). Mock mode
// simulates it in .data/mock-db.json. Never cached.

const isMock = () => getServerEnv().API_MODE === "mock";
const BLOCKING = new Set(["out_of_stock", "insufficient_stock", "unavailable"]);

export function cartBlocked(cart: Cart | null): boolean {
  return !cart || cart.lines.length === 0 || cart.lines.some((l) => l.issue && BLOCKING.has(l.issue));
}

async function liveAuth() {
  const user = await getSessionUser();
  return { accessToken: user?.accessToken ?? undefined };
}

export async function getShippingRates(province: string | null): Promise<ShippingRate[]> {
  if (!province) return [];
  if (isMock()) {
    const [cart, store] = await Promise.all([getCart(), getStore()]);
    return mockShippingRates(province, cart?.subtotal ?? "0", store.freeShippingThreshold, Boolean(cart?.promotion?.freeShipping));
  }
  return apiFetch<ShippingRate[]>(`/v1/checkout/shipping-rates?province=${encodeURIComponent(province)}`, await liveAuth());
}

/**
 * Places the order. `expectedTotal` is the amount the shopper saw; if prices
 * or shipping changed meanwhile the order is refused instead of charging more.
 */
export async function placeOrder(request: CheckoutRequest, expectedTotal: string, idempotencyKey: string): Promise<CheckoutResult> {
  if (!isMock()) {
    try {
      const result = await apiFetch<CheckoutResult>("/v1/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ ...request, expectedTotal }),
        ...(await liveAuth()),
      });
      if (result.ok) await forgetGuestCart();
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.userMessage) return { ok: false, code: "invalid", error: error.userMessage };
      throw error;
    }
  }

  const [user, cart, store, cartId] = await Promise.all([getSessionUser(), getCart(), getStore(), currentMockCartId()]);
  const storeSlug = getServerEnv().STORE_SLUG;
  const idemKey = `${storeSlug}:${idempotencyKey}`;

  const result = await withMockDb((db): CheckoutResult => {
    const previous = db.idempotency[idemKey];
    if (previous) return previous; // retry or double click: same answer, no second charge

    if (!cart || !cartId || cartBlocked(cart)) {
      return { ok: false, code: "cart_changed", error: "Tu carrito cambió. Revísalo antes de pagar." };
    }
    const promo = cart.promotion ? mockPromotions.find((p) => p.code === cart.promotion!.code) : undefined;
    if (promo?.usageLimitPerCustomer != null) {
      const used = mockTimesUsed(db, user?.id ?? null, request.email)[promo.id] ?? 0;
      if (used >= promo.usageLimitPerCustomer) {
        return { ok: false, code: "invalid", error: `Ya usaste el cupón ${promo.code} con este correo. Quítalo para continuar.` };
      }
    }
    const rate = mockShippingRates(
      request.shippingAddress.province,
      cart.subtotal,
      store.freeShippingThreshold,
      Boolean(cart.promotion?.freeShipping),
    ).find(
      (r) => r.id === request.shippingRateId,
    );
    if (!rate) return { ok: false, code: "invalid", error: "Elige un método de envío disponible para tu dirección." };
    const totals = orderTotals(cart.lines, rate.finalPrice, store.taxRate);
    if (totals.grandTotal !== expectedTotal) {
      return { ok: false, code: "cart_changed", error: "El total cambió. Revisa el resumen y vuelve a intentarlo." };
    }
    if (request.payment.token === "mock_declined") {
      const declined: CheckoutResult = {
        ok: false,
        code: "payment_declined",
        error: "Tu banco rechazó el pago. Prueba con otra tarjeta o medio de pago.",
      };
      return declined; // not stored: the shopper retries with a new token
    }

    const placedAt = new Date().toISOString();
    const number = formatOrderNumber("ORD", nextSequence(db.sequences, `${storeSlug}:order:ORD`));
    const series = request.invoice.kind === "invoice" ? "F001" : "B001";
    const sequenceName = request.invoice.kind === "invoice" ? "invoice" : "receipt";
    const invoiceNumber = nextSequence(db.sequences, `${storeSlug}:${sequenceName}:${series}`);
    const receiver =
      request.invoice.kind === "invoice"
        ? { name: request.invoice.companyName, document: `RUC ${request.invoice.ruc}` }
        : {
            name: request.invoice.name,
            document: request.invoice.documentType ? `${request.invoice.documentType} ${request.invoice.documentNumber}` : null,
          };

    const order: MockOrder = {
      id: randomUUID(),
      storeSlug,
      profileId: user?.id ?? null,
      cartId,
      accessToken: randomBytes(18).toString("base64url"),
      number,
      status: "confirmed",
      paymentStatus: "paid",
      fulfillmentStatus: "unfulfilled",
      placedAt,
      email: request.email,
      customerName: `${request.firstName} ${request.lastName}`,
      currencyCode: store.currencyCode,
      lines: toOrderLines(cart.lines),
      ...totals,
      shippingAddress: request.shippingAddress,
      shippingMethod: { name: rate.name, estimatedDays: rate.estimatedDays },
      payment: { provider: "manual", method: "Pago simulado", brand: null, last4: null, reference: `SIM-${number}` },
      // Mock OSE accepts immediately; the backend emits asynchronously.
      invoice: {
        kind: request.invoice.kind,
        series,
        number: invoiceNumber,
        status: "accepted",
        pdfUrl: null,
        receiverName: receiver.name,
        receiverDocument: receiver.document,
      },
      promotion: cart.promotion ? { code: cart.promotion.code, label: cart.promotion.label } : null,
      promotionId: promo?.id ?? null,
      refundedTotal: "0.00",
      shipments: [],
      returns: [],
      refunds: [],
      history: [
        { field: "payment_status", to: "paid", at: placedAt, note: "Pago aprobado" },
        { field: "status", to: "confirmed", at: placedAt, note: null },
      ],
    };
    db.orders.push(order);
    const dbCart = db.carts.find((c) => c.id === cartId);
    if (dbCart) dbCart.status = "converted";
    const customer = user && db.customers.find((c) => c.storeSlug === storeSlug && c.profileId === user.id);
    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpent = (Number(customer.totalSpent) + Number(totals.grandTotal)).toFixed(2);
    }
    const ok: CheckoutResult = { ok: true, orderNumber: number, accessToken: order.accessToken };
    db.idempotency[idemKey] = ok;
    return ok;
  });

  if (result.ok) await forgetGuestCart();
  return result;
}

function stripMock({ id: _i, storeSlug: _s, profileId: _p, cartId: _c, accessToken: _a, promotionId: _pr, ...order }: MockOrder): Order {
  void [_i, _s, _p, _c, _a, _pr];
  return order;
}

/** Owner (signed in) or anyone with the order's access token. */
export async function getOrder(number: string, accessToken: string | null): Promise<Order | null> {
  const user = await getSessionUser();
  if (isMock()) {
    const db = await readMockDb();
    const order = db.orders.find((o) => o.storeSlug === getServerEnv().STORE_SLUG && o.number === number);
    if (!order) return null;
    const allowed = (user && order.profileId === user.id) || (accessToken !== null && accessToken === order.accessToken);
    return allowed ? stripMock(order) : null;
  }
  try {
    const qs = accessToken ? `?t=${encodeURIComponent(accessToken)}` : "";
    return await apiFetch<Order>(`/v1/orders/${encodeURIComponent(number)}${qs}`, { accessToken: user?.accessToken ?? undefined });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
}

export async function listOrders(user: SessionUser): Promise<OrderSummary[]> {
  if (isMock()) {
    const db = await readMockDb();
    return db.orders
      .filter((o) => o.storeSlug === getServerEnv().STORE_SLUG && o.profileId === user.id)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .map((o) => ({
        number: o.number,
        status: o.status,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        placedAt: o.placedAt,
        grandTotal: o.grandTotal,
        currencyCode: o.currencyCode,
        itemCount: o.lines.reduce((n, l) => n + l.quantity, 0),
        accessToken: o.accessToken,
      }));
  }
  return apiFetch<OrderSummary[]>("/v1/me/orders", { accessToken: user.accessToken ?? undefined });
}
