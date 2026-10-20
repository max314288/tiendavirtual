import { ExternalLink, FileText, RotateCcw, Truck } from "lucide-react";
import Link from "next/link";
import { formatInvoiceNumber } from "@/lib/checkout/mock";
import { INVOICE_STATUS_LABEL } from "@/lib/checkout/order-status";
import type { Order, ReturnRequest, ShipmentStatus } from "@/lib/checkout/types";
import { formatMoney } from "@/lib/money";
import { RETURN_STATUS_LABEL, RETURN_STEPS, returnEligibility, returnProgress } from "@/lib/orders/post-sale";

const card = "rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg";

const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  pending: "Por despachar",
  shipped: "Despachado",
  in_transit: "En camino",
  delivered: "Entregado",
  failed: "Incidencia en la entrega",
};

type Fmt = { locale: string; timezone: string };

function dateFmt({ locale, timezone }: Fmt) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
}

export function ShipmentsSection({ order, fmt }: { order: Order; fmt: Fmt }) {
  if (order.shipments.length === 0) return null;
  const date = dateFmt(fmt);
  return (
    <section aria-labelledby="envios" className={card}>
      <h2 id="envios" className="mb-space-md flex items-center gap-space-sm text-headline-sm text-on-surface">
        <Truck className="size-5 text-secondary" aria-hidden />
        Envíos
      </h2>
      <ul className="space-y-space-sm">
        {order.shipments.map((s, i) => (
          <li key={s.id} className="rounded-lg bg-surface-container-low p-space-md">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <p className="text-label-lg text-on-surface">
                Paquete {i + 1} · {s.carrier}
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-label-sm ${s.status === "delivered" ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : s.status === "failed" ? "bg-error-container text-on-error-container" : "bg-secondary-fixed text-on-secondary-fixed-variant"}`}>
                {SHIPMENT_LABEL[s.status]}
              </span>
            </div>
            <dl className="mt-space-xs grid gap-x-space-md text-body-md text-on-surface-variant sm:grid-cols-2">
              {s.trackingNumber && (
                <div>
                  <dt className="inline">Guía: </dt>
                  <dd className="inline text-on-surface">{s.trackingNumber}</dd>
                </div>
              )}
              {s.shippedAt && (
                <div>
                  <dt className="inline">Despachado: </dt>
                  <dd className="inline">{date.format(new Date(s.shippedAt))}</dd>
                </div>
              )}
              {s.deliveredAt && (
                <div>
                  <dt className="inline">Entregado: </dt>
                  <dd className="inline">{date.format(new Date(s.deliveredAt))}</dd>
                </div>
              )}
            </dl>
            {s.trackingUrl && (
              <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-space-xs inline-flex items-center gap-1 text-label-lg text-secondary hover:underline">
                Seguir en {s.carrier}
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(abre en otra pestaña)</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReturnCard({ ret, money, fmt, orderHref }: { ret: ReturnRequest; money: (m: string) => string; fmt: Fmt; orderHref?: string }) {
  const progress = returnProgress(ret.status);
  const date = new Intl.DateTimeFormat(fmt.locale, { dateStyle: "long", timeZone: fmt.timezone });
  return (
    <article className="rounded-lg border border-outline-variant/40 p-space-md">
      <header className="flex flex-wrap items-start justify-between gap-space-sm">
        <div>
          <h3 className="text-title-md text-on-surface">Devolución {ret.number}</h3>
          <p className="text-label-sm text-on-surface-variant">
            {orderHref ? (
              <>
                Pedido{" "}
                <Link href={orderHref} className="text-secondary hover:underline">
                  {ret.orderNumber}
                </Link>{" "}
                ·{" "}
              </>
            ) : null}
            Solicitada el {date.format(new Date(ret.createdAt))}
          </p>
        </div>
        <p className="text-right">
          <span className="block text-label-sm text-on-surface-variant">Reembolso</span>
          <span className="text-title-md text-on-surface">{money(ret.refundAmount)}</span>
        </p>
      </header>
      <ul className="mt-space-sm text-body-md text-on-surface-variant">
        {ret.items.map((i) => (
          <li key={i.orderLineId}>
            {i.quantity} × {i.productName}
            {i.condition === "damaged" ? " (dañado)" : ""}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-label-sm text-on-surface-variant">Motivo: {ret.reason}</p>
      {progress === null ? (
        <p className="mt-space-sm text-label-md text-error">{RETURN_STATUS_LABEL[ret.status]}. Te escribimos con el detalle.</p>
      ) : (
        <ol className="mt-space-md grid grid-cols-4 gap-1" aria-label={`Estado: ${RETURN_STATUS_LABEL[ret.status]}`}>
          {RETURN_STEPS.map((step, i) => (
            <li key={step} className="space-y-1" aria-current={i === progress ? "step" : undefined}>
              <span className={`block h-1.5 rounded-full ${i <= progress ? "bg-secondary" : "bg-surface-container-high"}`} aria-hidden />
              <span className={`block text-label-sm ${i <= progress ? "text-on-surface" : "text-on-surface-variant"}`}>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function ReturnsSection({ order, fmt, returnHref }: { order: Order; fmt: Fmt; returnHref: string }) {
  const money = (m: string) => formatMoney(m, order.currencyCode, fmt.locale);
  const eligibility = returnEligibility(order, new Date());
  const until = eligibility.eligible
    ? new Intl.DateTimeFormat(fmt.locale, { dateStyle: "long", timeZone: fmt.timezone }).format(new Date(eligibility.until))
    : null;

  return (
    <section aria-labelledby="devoluciones" className={card}>
      <h2 id="devoluciones" className="mb-space-md flex items-center gap-space-sm text-headline-sm text-on-surface">
        <RotateCcw className="size-5 text-secondary" aria-hidden />
        Devoluciones y reembolsos
      </h2>

      {order.returns.length > 0 && (
        <div className="mb-space-md space-y-space-sm">
          {order.returns.map((r) => (
            <ReturnCard key={r.id} ret={r} money={money} fmt={fmt} />
          ))}
        </div>
      )}

      {order.refunds.length > 0 && (
        <ul className="mb-space-md space-y-space-xs">
          {order.refunds.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg bg-surface-container-low p-space-sm text-body-md">
              <span className="flex items-center gap-space-xs text-on-surface">
                <FileText className="size-4 text-secondary" aria-hidden />
                Reembolso {r.returnNumber ? `de ${r.returnNumber}` : ""}
                {r.creditNote && (
                  <span className="text-on-surface-variant">
                    · Nota de crédito {formatInvoiceNumber(r.creditNote.series, r.creditNote.number)} ({INVOICE_STATUS_LABEL[r.creditNote.status]})
                  </span>
                )}
              </span>
              <span className="text-label-lg text-on-surface">{money(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {eligibility.eligible ? (
        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-md text-on-surface-variant">Puedes solicitar una devolución hasta el {until}.</p>
          <Link
            href={returnHref}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant px-space-md text-label-lg text-on-surface hover:bg-surface-container-low"
          >
            Solicitar devolución
          </Link>
        </div>
      ) : (
        order.returns.length === 0 && <p className="text-body-md text-on-surface-variant">{eligibility.reason}</p>
      )}
    </section>
  );
}
