"use server";

import { redirect } from "next/navigation";
import { createAddress, getAddress } from "@/lib/account/api";
import { fieldErrors, formObject, type FieldErrors } from "@/lib/account/schemas";
import { getSessionUser } from "@/lib/auth";
import { getCart } from "@/lib/cart/api";
import { getStore } from "@/lib/store/get-store";
import { cartBlocked, getShippingRates, placeOrder } from "./api";
import { orderTotals } from "./mock";
import { checkoutSchema, newAddressSchema, receiptIdentityError } from "./schemas";
import type { CheckoutRequest, OrderAddress, ShippingRate } from "./types";

export async function shippingRatesAction(province: string): Promise<ShippingRate[]> {
  return getShippingRates(province || null);
}

export type CheckoutState = {
  status: "idle" | "error" | "ready";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Amount to charge, in cents (Culqi expects cents). */
  amountCents?: number;
  /** Decimal total the shopper confirmed; sent back with the payment token. */
  total?: string;
};

type Built =
  | { ok: false; state: CheckoutState }
  | { ok: true; request: Omit<CheckoutRequest, "payment">; total: string; isNewAddress: boolean };

async function buildRequest(formData: FormData): Promise<Built> {
  const raw = formObject(formData);
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, state: { status: "error", message: "Revisa los campos marcados.", fieldErrors: fieldErrors(parsed.error) } };
  }
  const form = parsed.data;
  const [user, cart, store] = await Promise.all([getSessionUser(), getCart(), getStore()]);
  if (cartBlocked(cart)) {
    return { ok: false, state: { status: "error", message: "Tu carrito cambió o tiene productos sin stock. Revísalo antes de pagar." } };
  }

  let shippingAddress: OrderAddress;
  if (form.addressId) {
    // Saved addresses are re-read on the server; the client only sends the id.
    const saved = user ? await getAddress(user, form.addressId) : null;
    if (!saved) return { ok: false, state: { status: "error", message: "Elige una dirección de entrega válida." } };
    const { recipientName, phone, line1, line2, city, province, postalCode, countryCode } = saved;
    shippingAddress = { recipientName, phone, line1, line2, city, province, postalCode, countryCode };
  } else {
    const a = newAddressSchema.parse(form);
    shippingAddress = { ...a, phone: form.phone, countryCode: "PE" };
  }

  const rate = (await getShippingRates(shippingAddress.province)).find((r) => r.id === form.shippingRateId);
  if (!rate) {
    return {
      ok: false,
      state: { status: "error", fieldErrors: { shippingRateId: ["Elige un método de envío disponible para tu dirección"] } },
    };
  }
  const totals = orderTotals(cart!.lines.filter((l) => l.issue !== "unavailable"), rate.finalPrice, store.taxRate);
  const idError = receiptIdentityError(form, Number(totals.grandTotal));
  if (idError) return { ok: false, state: { status: "error", fieldErrors: { receiptDocType: [idError] } } };

  const fullName = `${form.firstName} ${form.lastName}`;
  return {
    ok: true,
    isNewAddress: !form.addressId,
    total: totals.grandTotal,
    request: {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      shippingAddress,
      saveAddress: Boolean(user) && !form.addressId && form.saveAddress,
      shippingRateId: rate.id,
      invoice:
        form.invoiceKind === "invoice"
          ? { kind: "invoice", ruc: form.ruc!, companyName: form.companyName!, fiscalAddress: form.fiscalAddress! }
          : { kind: "receipt", documentType: form.receiptDocType, documentNumber: form.receiptDocNumber, name: fullName },
      customerNote: form.customerNote,
    },
  };
}

/** Step 1: validate everything before opening the payment window. */
export async function prepareCheckoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const built = await buildRequest(formData);
  if (!built.ok) return built.state;
  return { status: "ready", total: built.total, amountCents: Math.round(Number(built.total) * 100) };
}

export type PlaceOrderState = { error?: string; code?: string };

/** Step 2: called with the payment token from Culqi (or the simulated payment). */
export async function placeOrderAction(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const token = String(formData.get("paymentToken") ?? "");
  const provider = formData.get("paymentProvider") === "culqi" ? "culqi" : "manual";
  const expectedTotal = String(formData.get("expectedTotal") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!token || !expectedTotal || !/^[\w-]{16,64}$/.test(idempotencyKey)) {
    return { error: "No pudimos procesar el pago. Inténtalo de nuevo." };
  }

  const built = await buildRequest(formData);
  if (!built.ok) return { error: built.state.message ?? "Revisa los datos del checkout." };

  const result = await placeOrder({ ...built.request, payment: { provider, token } }, expectedTotal, idempotencyKey);
  if (!result.ok) return { error: result.error, code: result.code };

  const user = await getSessionUser();
  if (user && built.request.saveAddress) {
    const a = built.request.shippingAddress;
    await createAddress(user, { alias: "Dirección de compra", ...a, taxDocumentType: null, taxDocumentNumber: null, companyName: null }).catch(
      () => null, // saving the address must never fail a paid order
    );
  }
  redirect(`/pedido/${encodeURIComponent(result.orderNumber)}?t=${encodeURIComponent(result.accessToken)}&nuevo=1`);
}
