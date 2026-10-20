import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import { Container } from "@/components/layout/container";
import { ReturnForm } from "@/components/orders/return-form";
import { getOrder } from "@/lib/checkout/api";
import { returnableQuantities, returnEligibility, RETURN_WINDOW_DAYS } from "@/lib/orders/post-sale";
import { getStore } from "@/lib/store/get-store";

type Props = PageProps<"/pedido/[number]/devolucion">;

export const metadata: Metadata = { title: "Solicitar devolución", robots: { index: false } };

export default function ReturnPage(props: Props) {
  return (
    <Container className="py-space-md lg:py-space-xl">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-container-low" aria-busy="true" />}>
        <ReturnContent {...props} />
      </Suspense>
    </Container>
  );
}

async function ReturnContent({ params, searchParams }: Props) {
  const [{ number: rawNumber }, query, store] = await Promise.all([params, searchParams, getStore()]);
  const number = decodeURIComponent(rawNumber);
  const token = [query.t].flat()[0] ?? null;
  const order = await getOrder(number, token);
  if (!order) notFound();

  const orderHref = `/pedido/${encodeURIComponent(number)}${token ? `?t=${encodeURIComponent(token)}` : ""}`;
  const eligibility = returnEligibility(order, new Date());
  const returnable = returnableQuantities(order);

  return (
    <>
      <div className="mb-space-md">
        <Breadcrumbs items={[{ label: `Pedido ${number}`, href: orderHref }, { label: "Devolución" }]} />
      </div>
      <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Solicitar devolución</h1>
      <p className="mt-space-xs mb-space-lg max-w-2xl text-body-lg text-on-surface-variant">
        Tienes {RETURN_WINDOW_DAYS} días desde la entrega. Revisaremos tu solicitud y te enviaremos las instrucciones para el recojo.
      </p>
      {eligibility.eligible ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
          <ReturnForm
            orderNumber={number}
            token={token}
            lines={order.lines.map((l) => ({ ...l, returnable: returnable[l.id] ?? 0 }))}
            currencyCode={order.currencyCode}
            locale={store.locale}
            cancelHref={orderHref}
          />
        </div>
      ) : (
        <p role="status" className="rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface">
          {eligibility.reason}
        </p>
      )}
    </>
  );
}
