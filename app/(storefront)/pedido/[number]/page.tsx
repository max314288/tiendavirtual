import type { Metadata } from "next";
import { Check, CheckCircle2, FileText, MapPin, Package, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { MockOrderTools } from "@/components/orders/mock-tools";
import { ReturnsSection, ShipmentsSection } from "@/components/orders/post-sale-sections";
import { getServerEnv } from "@/lib/env";
import { getOrder } from "@/lib/checkout/api";
import { formatInvoiceNumber } from "@/lib/checkout/mock";
import { INVOICE_KIND_LABEL, INVOICE_STATUS_LABEL, ORDER_STATUS_LABEL, ORDER_STEPS, orderProgress } from "@/lib/checkout/order-status";
import type { Order } from "@/lib/checkout/types";
import { formatMoney } from "@/lib/money";
import { getStore } from "@/lib/store/get-store";

type Props = PageProps<"/pedido/[number]">;

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

export default function OrderPage(props: Props) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent {...props} />
    </Suspense>
  );
}

const card = "rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg";

async function OrderContent({ params, searchParams }: Props) {
  const [{ number }, query, store] = await Promise.all([params, searchParams, getStore()]);
  const token = [query.t].flat()[0] ?? null;
  const order = await getOrder(decodeURIComponent(number), token);
  if (!order) notFound();

  const isNew = query.nuevo === "1";
  const newReturn = [query.devolucion].flat()[0];
  const fmt = { locale: store.locale, timezone: store.timezone };
  const tokenQs = token ? `?t=${encodeURIComponent(token)}` : "";
  const money = (m: string) => formatMoney(m, order.currencyCode, store.locale);
  const placedAt = new Intl.DateTimeFormat(store.locale, { dateStyle: "long", timeStyle: "short", timeZone: store.timezone }).format(
    new Date(order.placedAt),
  );
  const firstName = order.customerName.split(" ")[0];

  return (
    <>
      <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <Container className="py-space-xl">
          {isNew ? (
            <div className="flex flex-col gap-space-md md:flex-row md:items-center">
              <CheckCircle2 className="size-12 shrink-0 text-on-tertiary-container" aria-hidden />
              <div>
                <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">¡Gracias por tu compra, {firstName}!</h1>
                <p className="mt-1 text-body-lg text-on-surface-variant">
                  Tu pedido <strong className="text-on-surface">{order.number}</strong> está confirmado. Te enviamos el detalle y tu comprobante a{" "}
                  <strong className="text-on-surface">{order.email}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-label-md tracking-wider text-secondary uppercase">{ORDER_STATUS_LABEL[order.status]}</p>
              <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Pedido {order.number}</h1>
            </div>
          )}

          <dl className="mt-space-lg grid grid-cols-2 gap-space-md md:grid-cols-4">
            <Fact label="Número de pedido" value={order.number} />
            <Fact label="Fecha" value={placedAt} />
            <Fact label="Pago" value={paymentText(order)} />
            <Fact label="Entrega estimada" value={order.shippingMethod.estimatedDays} />
          </dl>
        </Container>
      </section>

      <Container className="grid grid-cols-1 items-start gap-space-lg py-space-lg lg:grid-cols-12 lg:gap-gutter lg:py-space-xl">
        <div className="space-y-space-lg lg:col-span-7 xl:col-span-8">
          <section aria-labelledby="seguimiento" className={card}>
            <h2 id="seguimiento" className="mb-space-lg text-headline-sm text-on-surface">
              Seguimiento
            </h2>
            <Timeline order={order} />
          </section>

          {newReturn && (
            <p role="status" className="flex items-center gap-space-sm rounded-xl bg-tertiary-fixed/40 p-space-md text-body-md text-on-tertiary-fixed-variant">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden />
              Recibimos tu solicitud {newReturn}. Te avisaremos por correo cuando la revisemos.
            </p>
          )}

          <ShipmentsSection order={order} fmt={fmt} />

          <section aria-labelledby="articulos" className={card}>
            <h2 id="articulos" className="mb-space-md text-headline-sm text-on-surface">
              Productos
            </h2>
            <ul className="divide-y divide-outline-variant/30">
              {order.lines.map((l) => (
                <li key={l.id} className="flex items-center gap-space-md py-space-sm">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    {l.image && <Image src={l.image.url} alt="" fill sizes="64px" className="object-cover mix-blend-multiply" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/producto/${l.productSlug}`} className="line-clamp-2 text-label-lg text-on-surface hover:text-secondary">
                      {l.productName}
                    </Link>
                    <span className="block text-label-sm text-on-surface-variant">
                      {l.variantTitle !== "Única" ? `${l.variantTitle} · ` : ""}
                      {l.quantity} × {money(l.unitPrice)}
                    </span>
                  </span>
                  <span className="text-label-lg text-on-surface">{money(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </section>

          <ReturnsSection order={order} fmt={fmt} returnHref={`/pedido/${encodeURIComponent(order.number)}/devolucion${tokenQs}`} />
        </div>

        <aside className="space-y-space-md lg:col-span-5 xl:col-span-4">
          {getServerEnv().API_MODE === "mock" && <MockOrderTools order={order} token={token} />}
          <section aria-labelledby="resumen" className={card}>
            <h2 id="resumen" className="mb-space-md text-headline-sm text-on-surface">
              Resumen
            </h2>
            <dl className="space-y-1.5 text-body-md text-on-surface-variant">
              <Row label="Subtotal" value={money(order.subtotal)} />
              {order.discountTotal !== "0.00" && (
                <Row label={`Descuento${order.promotion ? ` (${order.promotion.code})` : ""}`} value={`−${money(order.discountTotal)}`} />
              )}
              <Row label={`Envío · ${order.shippingMethod.name}`} value={order.shippingTotal === "0.00" ? "Gratis" : money(order.shippingTotal)} />
              <div className="flex justify-between pt-space-xs text-title-md text-on-surface">
                <dt>Total</dt>
                <dd>{money(order.grandTotal)}</dd>
              </div>
              <Row label="IGV incluido" value={money(order.taxTotal)} small />
              {order.refundedTotal !== "0.00" && <Row label="Reembolsado" value={`−${money(order.refundedTotal)}`} />}
            </dl>
          </section>

          {order.invoice && (
            <section aria-labelledby="comprobante" className={card}>
              <h2 id="comprobante" className="mb-space-sm flex items-center gap-space-sm text-headline-sm text-on-surface">
                <FileText className="size-5 text-secondary" aria-hidden />
                {INVOICE_KIND_LABEL[order.invoice.kind]}
              </h2>
              <p className="text-title-md text-on-surface">{formatInvoiceNumber(order.invoice.series, order.invoice.number)}</p>
              <p className="text-body-md text-on-surface-variant">
                {order.invoice.receiverName}
                {order.invoice.receiverDocument ? ` · ${order.invoice.receiverDocument}` : ""}
              </p>
              <p className="mt-space-xs text-label-md text-on-tertiary-container">{INVOICE_STATUS_LABEL[order.invoice.status]}</p>
              {order.invoice.pdfUrl ? (
                <a href={order.invoice.pdfUrl} className="mt-space-sm inline-flex text-label-lg text-secondary hover:underline">
                  Descargar PDF
                </a>
              ) : (
                <p className="mt-space-sm text-label-sm text-on-surface-variant">Te enviamos el PDF y el XML a tu correo.</p>
              )}
            </section>
          )}

          <section aria-labelledby="entrega" className={card}>
            <h2 id="entrega" className="mb-space-sm flex items-center gap-space-sm text-headline-sm text-on-surface">
              <MapPin className="size-5 text-secondary" aria-hidden />
              Entrega
            </h2>
            <address className="text-body-md text-on-surface-variant not-italic">
              <span className="block text-on-surface">{order.shippingAddress.recipientName}</span>
              <span className="block">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
              </span>
              <span className="block">
                {order.shippingAddress.city}, {order.shippingAddress.province}
              </span>
              <span className="block">Cel. {order.shippingAddress.phone}</span>
            </address>
          </section>

          <Link href="/buscar" className="flex h-12 items-center justify-center rounded-xl bg-primary text-label-lg text-on-primary hover:bg-surface-tint">
            Seguir comprando
          </Link>
        </aside>
      </Container>
    </>
  );
}

function paymentText(order: Order) {
  const p = order.payment;
  if (p.brand && p.last4) return `${p.brand} •••• ${p.last4}`;
  return p.method;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-surface-container-low p-space-sm md:p-space-md">
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd className="text-label-lg break-words text-on-surface">{value}</dd>
    </div>
  );
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={`flex justify-between gap-space-sm ${small ? "text-label-sm" : ""}`}>
      <dt>{label}</dt>
      <dd className={small ? "" : "text-on-surface"}>{value}</dd>
    </div>
  );
}

function Timeline({ order }: { order: Order }) {
  const progress = orderProgress(order);
  if (progress === null) return <p className="text-body-md text-error">Este pedido fue cancelado.</p>;
  const icons = [Check, Package, Truck, CheckCircle2];
  return (
    <ol className="grid gap-space-md md:grid-cols-4">
      {ORDER_STEPS.map((step, i) => {
        const Icon = icons[i];
        const done = i <= progress;
        const current = i === progress + 1;
        return (
          <li key={step} className="flex items-center gap-space-sm md:flex-col md:text-center" aria-current={current ? "step" : undefined}>
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-secondary text-on-secondary" : current ? "border-2 border-secondary text-secondary" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className={`block text-label-lg ${done || current ? "text-on-surface" : "text-on-surface-variant"}`}>{step}</span>
              <span className="block text-label-sm text-on-surface-variant">{done ? "Listo" : current ? "En curso" : "Pendiente"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderSkeleton() {
  const block = "animate-pulse rounded-xl bg-surface-container-low";
  return (
    <Container className="space-y-space-lg py-space-xl" aria-busy="true">
      <span className="sr-only">Cargando pedido…</span>
      <div className={`${block} h-24`} />
      <div className="grid gap-gutter lg:grid-cols-12">
        <div className={`${block} h-80 lg:col-span-8`} />
        <div className={`${block} h-80 lg:col-span-4`} />
      </div>
    </Container>
  );
}
