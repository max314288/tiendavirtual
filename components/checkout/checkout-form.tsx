"use client";

import { CreditCard, FileText, Lock, MapPin, Truck, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CheckboxField, FormMessage, SelectField, TextField } from "@/components/ui/form";
import { PE_DEPARTMENTS, type Address } from "@/lib/account/types";
import { fromCents, toCents } from "@/lib/cart/totals";
import type { Cart } from "@/lib/cart/types";
import { placeOrderAction, prepareCheckoutAction, shippingRatesAction, type CheckoutState } from "@/lib/checkout/actions";
import { payWithCulqi } from "@/lib/checkout/culqi-client";
import { RECEIPT_ID_REQUIRED_FROM } from "@/lib/checkout/schemas";
import type { ShippingRate } from "@/lib/checkout/types";
import { formatMoney } from "@/lib/money";
import { CouponForm } from "@/components/cart/coupon-form";
import { MockPaymentDialog } from "./mock-payment-dialog";

export type PaymentConfig = { provider: "culqi"; publicKey: string } | { provider: "mock" };

type Props = {
  cart: Cart;
  storeName: string;
  currencyCode: string;
  locale: string;
  customer: { email: string; firstName: string; lastName: string; phone: string | null } | null;
  addresses: Address[];
  payment: PaymentConfig;
};

function Section({ step, title, icon, children }: { step: number; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`paso-${step}`} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
      <h2 id={`paso-${step}`} className="mb-space-md flex items-center gap-space-sm text-headline-sm text-on-surface">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-label-lg text-on-primary" aria-hidden>
          {step}
        </span>
        {title}
        <span className="ml-auto text-on-surface-variant" aria-hidden>
          {icon}
        </span>
      </h2>
      {children}
    </section>
  );
}

const choice =
  "flex cursor-pointer items-start gap-space-sm rounded-xl border p-space-md transition-colors has-[:checked]:border-secondary has-[:checked]:bg-secondary-fixed/30 border-outline-variant/50 hover:bg-surface-container-low";

export function CheckoutForm({ cart, storeName, currencyCode, locale, customer, addresses, payment }: Props) {
  const money = (m: string) => formatMoney(m, currencyCode, locale);
  const defaultAddress = addresses.find((a) => a.isDefaultShipping) ?? addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  const [newProvince, setNewProvince] = useState("Lima");
  const [rateState, setRateState] = useState<{ province: string; rates: ShippingRate[] }>({ province: "", rates: [] });
  const [rateId, setRateId] = useState("");
  const [invoiceKind, setInvoiceKind] = useState<"receipt" | "invoice">("receipt");
  const [docType, setDocType] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [mockOpen, setMockOpen] = useState(false);
  /** The place-order result shown is only the one from the current attempt. */
  const [attempt, setAttempt] = useState(0);
  const attemptRef = useRef(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const formDataRef = useRef<FormData | null>(null);

  const [prep, setPrep] = useState<CheckoutState>({ status: "idle" });
  const [preparing, startPreparing] = useTransition();
  const [placedState, place, placing] = useActionState(placeOrderAction, {});
  const [placedAttempt, setPlacedAttempt] = useState(-1);
  const placed = placedAttempt === attempt ? placedState : {};
  const errors = prep.status === "error" ? (prep.fieldErrors ?? {}) : {};

  const province = addressId ? addresses.find((a) => a.id === addressId)?.province ?? "" : newProvince;

  // Shipping options depend on the destination department and on a free-shipping coupon.
  const couponFreeShipping = Boolean(cart.promotion?.freeShipping);
  useEffect(() => {
    let cancelled = false;
    shippingRatesAction(province).then((r) => {
      if (cancelled) return;
      setRateState({ province: `${province}|${couponFreeShipping}`, rates: r });
      setRateId((current) => (r.some((x) => x.id === current) ? current : (r[0]?.id ?? "")));
    });
    return () => {
      cancelled = true;
    };
  }, [province, couponFreeShipping]);
  // Stale rates belong to a previous department: hide them while reloading.
  const ratesKey = `${province}|${couponFreeShipping}`;
  const ratesLoading = rateState.province !== ratesKey;
  const rates = ratesLoading ? [] : rateState.rates;

  const rate = rates.find((r) => r.id === rateId);
  const shipping = rate?.finalPrice ?? "0.00";
  const total = fromCents(toCents(cart.total) + toCents(shipping));
  const busy = preparing || placing || mockOpen;

  function submitPayment(token: string, provider: "culqi" | "manual", expectedTotal: string) {
    const data = formDataRef.current;
    if (!data) return;
    const fd = new FormData();
    data.forEach((v, k) => fd.append(k, v));
    fd.set("paymentToken", token);
    fd.set("paymentProvider", provider);
    fd.set("expectedTotal", expectedTotal);
    fd.set("idempotencyKey", idempotencyKey);
    setPlacedAttempt(attemptRef.current);
    startTransition(() => place(fd));
  }

  /** Validate on the server first, then open the payment window with the confirmed amount. */
  function handleSubmit(fd: FormData) {
    formDataRef.current = fd;
    setPaymentError(null);
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    startPreparing(async () => {
      const result = await prepareCheckoutAction(prep, fd);
      setPrep(result);
      if (result.status !== "ready" || !result.amountCents || !result.total) return;
      if (payment.provider === "mock") {
        setMockOpen(true);
        return;
      }
      const confirmedTotal = result.total;
      try {
        const token = await payWithCulqi({ publicKey: payment.publicKey, title: storeName, amountCents: result.amountCents });
        submitPayment(token, "culqi", confirmedTotal);
      } catch (e) {
        setPaymentError((e as Error).message);
      }
    });
  }

  const errorMessage = paymentError ?? placed.error ?? (prep.status === "error" ? prep.message : undefined);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="grid grid-cols-1 items-start gap-space-lg pb-28 lg:grid-cols-12 lg:gap-gutter lg:pb-0"
    >
      <div className="space-y-space-md lg:col-span-7 xl:col-span-8">
        {errorMessage && (
          <div className="lg:hidden">
            <FormMessage state={{ status: "error", message: errorMessage }} />
          </div>
        )}

        <Section step={1} title="Tus datos" icon={<User className="size-5" />}>
          {!customer && (
            <p className="mb-space-md text-body-md text-on-surface-variant">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login?next=/checkout" className="text-secondary hover:underline">
                Inicia sesión
              </Link>{" "}
              para usar tus direcciones guardadas.
            </p>
          )}
          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
            <TextField label="Nombres" name="firstName" autoComplete="given-name" required defaultValue={customer?.firstName} errors={errors.firstName} />
            <TextField label="Apellidos" name="lastName" autoComplete="family-name" required defaultValue={customer?.lastName} errors={errors.lastName} />
            <TextField
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              defaultValue={customer?.email}
              hint="Aquí te enviamos la confirmación y tu comprobante."
              errors={errors.email}
            />
            <TextField
              label="Celular"
              name="phone"
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              required
              placeholder="987 654 321"
              defaultValue={customer?.phone ?? undefined}
              hint="Para coordinar la entrega."
              errors={errors.phone}
            />
          </div>
        </Section>

        <Section step={2} title="Dirección de entrega" icon={<MapPin className="size-5" />}>
          {addresses.length > 0 && (
            <fieldset className="mb-space-md grid grid-cols-1 gap-space-sm md:grid-cols-2">
              <legend className="sr-only">Elige una dirección</legend>
              {addresses.map((a) => (
                <label key={a.id} className={choice}>
                  <input
                    type="radio"
                    name="addressId"
                    value={a.id}
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1 accent-secondary"
                  />
                  <span className="min-w-0 text-body-md">
                    <span className="block text-label-lg text-on-surface">{a.alias}</span>
                    <span className="block text-on-surface-variant">{a.recipientName}</span>
                    <span className="block truncate text-on-surface-variant">
                      {a.line1}, {a.city}, {a.province}
                    </span>
                  </span>
                </label>
              ))}
              <label className={choice}>
                <input
                  type="radio"
                  name="addressId"
                  value=""
                  checked={addressId === ""}
                  onChange={() => setAddressId("")}
                  className="mt-1 accent-secondary"
                />
                <span className="text-label-lg text-on-surface">Usar otra dirección</span>
              </label>
            </fieldset>
          )}

          {addressId === "" && (
            <div className="space-y-space-md">
              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                <TextField label="¿Quién recibe?" name="recipientName" autoComplete="name" required errors={errors.recipientName} />
                <SelectField
                  label="Departamento"
                  name="province"
                  autoComplete="address-level1"
                  required
                  value={newProvince}
                  onChange={(e) => setNewProvince(e.target.value)}
                  errors={errors.province}
                >
                  {PE_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </SelectField>
                <TextField label="Distrito" name="city" autoComplete="address-level2" required placeholder="Miraflores" errors={errors.city} />
                <TextField
                  label="Código postal"
                  name="postalCode"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  optional
                  errors={errors.postalCode}
                />
              </div>
              <TextField label="Dirección" name="line1" autoComplete="address-line1" required placeholder="Av. Larco 1234" errors={errors.line1} />
              <TextField
                label="Referencia, piso o departamento"
                name="line2"
                autoComplete="address-line2"
                optional
                placeholder="Dpto. 502, frente al parque"
                errors={errors.line2}
              />
              {customer && <CheckboxField name="saveAddress">Guardar esta dirección en mi cuenta</CheckboxField>}
            </div>
          )}
        </Section>

        <Section step={3} title="Método de envío" icon={<Truck className="size-5" />}>
          <fieldset aria-busy={ratesLoading} className="space-y-space-sm">
            <legend className="sr-only">Elige el envío</legend>
            {rates.length === 0 && (
              <p className="text-body-md text-on-surface-variant">{ratesLoading ? "Calculando opciones de envío…" : "Elige tu departamento para ver las opciones."}</p>
            )}
            {rates.map((r) => (
              <label key={r.id} className={`${choice} items-center justify-between`}>
                <span className="flex items-start gap-space-sm">
                  <input
                    type="radio"
                    name="shippingRateId"
                    value={r.id}
                    checked={rateId === r.id}
                    onChange={() => setRateId(r.id)}
                    className="mt-1 accent-secondary"
                  />
                  <span>
                    <span className="block text-label-lg text-on-surface">{r.name}</span>
                    <span className="block text-body-md text-on-surface-variant">{r.estimatedDays}</span>
                  </span>
                </span>
                <span className="text-right text-label-lg">
                  {r.finalPrice === "0.00" ? (
                    <>
                      <span className="block text-on-tertiary-container">Gratis</span>
                      {r.price !== "0.00" && <s className="text-label-sm text-on-surface-variant">{money(r.price)}</s>}
                    </>
                  ) : (
                    money(r.finalPrice)
                  )}
                </span>
              </label>
            ))}
            {errors.shippingRateId && <p className="text-label-sm text-error">{errors.shippingRateId[0]}</p>}
          </fieldset>
        </Section>

        <Section step={4} title="Comprobante electrónico" icon={<FileText className="size-5" />}>
          <div role="radiogroup" aria-label="Tipo de comprobante" className="mb-space-md grid grid-cols-2 gap-1 rounded-xl bg-surface-container-low p-1">
            {(
              [
                ["receipt", "Boleta"],
                ["invoice", "Factura"],
              ] as const
            ).map(([kind, label]) => (
              <label
                key={kind}
                className={`flex min-h-touch cursor-pointer items-center justify-center rounded-lg text-label-lg transition-colors ${
                  invoiceKind === kind ? "bg-surface-container-lowest text-on-surface shadow-surface-1" : "text-on-surface-variant"
                }`}
              >
                <input
                  type="radio"
                  name="invoiceKind"
                  value={kind}
                  checked={invoiceKind === kind}
                  onChange={() => setInvoiceKind(kind)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>

          {invoiceKind === "receipt" ? (
            <div className="space-y-space-md">
              <p className="text-body-md text-on-surface-variant">
                Emitimos una boleta electrónica a tu nombre. Desde {money(String(RECEIPT_ID_REQUIRED_FROM))} SUNAT exige tu documento.
              </p>
              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                <SelectField
                  label="Documento"
                  name="receiptDocType"
                  optional={Number(total) < RECEIPT_ID_REQUIRED_FROM}
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  errors={errors.receiptDocType}
                >
                  <option value="">Sin documento</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de extranjería</option>
                </SelectField>
                {docType && (
                  <TextField
                    label={`Número de ${docType}`}
                    name="receiptDocNumber"
                    inputMode={docType === "DNI" ? "numeric" : "text"}
                    required
                    errors={errors.receiptDocNumber}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-space-md">
              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                <TextField label="RUC" name="ruc" inputMode="numeric" required placeholder="20123456789" errors={errors.ruc} />
                <TextField label="Razón social" name="companyName" autoComplete="organization" required errors={errors.companyName} />
              </div>
              <TextField label="Dirección fiscal" name="fiscalAddress" required errors={errors.fiscalAddress} />
            </div>
          )}
        </Section>

        <Section step={5} title="Pago" icon={<CreditCard className="size-5" />}>
          <p className="text-body-md text-on-surface-variant">
            Pagas con tarjeta de crédito, débito o Yape en la ventana segura de Culqi. Tus datos de pago no pasan por nuestra tienda.
          </p>
          {payment.provider === "mock" && (
            <p className="mt-space-sm rounded-lg bg-secondary-fixed/40 p-space-sm text-label-md text-on-secondary-fixed-variant">
              Modo demo: el pago se simula, no se cobra nada.
            </p>
          )}
          <div className="mt-space-md">
            <TextField label="Nota para el pedido" name="customerNote" optional placeholder="Indicaciones para la entrega" errors={errors.customerNote} />
          </div>
        </Section>
      </div>

      <aside aria-label="Resumen del pedido" className="space-y-space-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg lg:sticky lg:top-40 lg:col-span-5 xl:col-span-4">
        <details open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-headline-sm text-on-surface lg:pointer-events-none">
            Tu pedido
            <span className="text-body-md text-on-surface-variant">
              {cart.itemCount} {cart.itemCount === 1 ? "producto" : "productos"}
            </span>
          </summary>
          <ul className="mt-space-md space-y-space-sm">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-space-sm">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                  {l.image && <Image src={l.image.url} alt="" fill sizes="56px" className="object-cover mix-blend-multiply" />}
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-label-sm text-on-primary">
                    {l.quantity}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-label-md text-on-surface">{l.productName}</span>
                  {l.variantTitle !== "Única" && <span className="block text-label-sm text-on-surface-variant">{l.variantTitle}</span>}
                </span>
                <span className="text-label-md text-on-surface">{money(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </details>

        <dl className="space-y-1.5 border-t border-outline-variant/30 pt-space-md text-body-md text-on-surface-variant">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="text-on-surface">{money(cart.subtotal)}</dd>
          </div>
          {cart.discountTotal !== "0.00" && (
            <div className="flex justify-between text-on-tertiary-container">
              <dt>Descuento{cart.promotion ? ` (${cart.promotion.code})` : ""}</dt>
              <dd>−{money(cart.discountTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd className="text-on-surface">{rate ? (rate.finalPrice === "0.00" ? "Gratis" : money(rate.finalPrice)) : "—"}</dd>
          </div>
          <div className="flex justify-between pt-space-xs text-title-md text-on-surface">
            <dt>Total</dt>
            <dd>{money(total)}</dd>
          </div>
          <div className="flex justify-between text-label-sm">
            <dt>Precios con IGV incluido</dt>
          </div>
        </dl>

        <CouponForm promotion={cart.promotion} promotionError={cart.promotionError} />

        <div className="hidden space-y-space-sm lg:block">
          {errorMessage && <FormMessage state={{ status: "error", message: errorMessage }} />}
          <PayButton busy={busy} label={`Pagar ${money(total)}`} />
        </div>
        <p className="flex items-center justify-center gap-space-xs text-label-sm text-on-surface-variant">
          <Lock className="size-3.5" aria-hidden />
          Pago seguro con Culqi
        </p>
      </aside>

      {/* Sticky pay bar on mobile and tablet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/40 bg-surface-container-lowest/95 px-margin-mobile py-space-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:px-margin-tablet lg:hidden">
        <div className="mx-auto flex max-w-page items-center gap-space-md">
          <div>
            <p className="text-label-sm text-on-surface-variant">Total</p>
            <p className="text-headline-sm text-on-surface">{money(total)}</p>
          </div>
          <div className="flex-1">
            <PayButton busy={busy} label="Pagar" />
          </div>
        </div>
      </div>

      {payment.provider === "mock" && (
        <MockPaymentDialog
          open={mockOpen}
          amount={money(prep.total ?? total)}
          onResult={(token) => {
            setMockOpen(false);
            if (token && prep.total) submitPayment(token, "manual", prep.total);
          }}
        />
      )}
    </form>
  );
}

function PayButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      aria-busy={busy}
      className="flex h-12 w-full items-center justify-center gap-space-sm rounded-xl bg-secondary text-label-lg text-on-secondary transition-colors hover:bg-secondary-container disabled:cursor-wait disabled:opacity-70"
    >
      <Lock className="size-4" aria-hidden />
      {busy ? "Procesando…" : label}
    </button>
  );
}
