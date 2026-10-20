import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ORDER_STATUS_LABEL } from "@/lib/checkout/order-status";
import type { OrderSummary } from "@/lib/checkout/types";
import { formatMoney } from "@/lib/money";

type Props = { orders: OrderSummary[]; locale: string; timezone: string };

/** Rows on desktop, stacked cards on mobile. */
export function OrderList({ orders, locale, timezone }: Props) {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: timezone });
  return (
    <ul className="divide-y divide-outline-variant/30">
      {orders.map((o) => (
        <li key={o.number}>
          <Link
            href={`/pedido/${encodeURIComponent(o.number)}?t=${encodeURIComponent(o.accessToken)}`}
            className="flex items-center gap-space-md py-space-sm hover:bg-surface-container-low/60 md:px-space-sm"
          >
            <span className="grid min-w-0 flex-1 grid-cols-2 gap-x-space-md gap-y-0.5 md:grid-cols-4 md:items-center">
              <span className="text-label-lg text-on-surface">{o.number}</span>
              <span className="text-right text-label-lg text-on-surface md:order-last">{formatMoney(o.grandTotal, o.currencyCode, locale)}</span>
              <span className="text-body-md text-on-surface-variant">{date.format(new Date(o.placedAt))}</span>
              <span className="text-right text-label-md text-secondary md:text-left">
                {ORDER_STATUS_LABEL[o.status]} · {o.itemCount} {o.itemCount === 1 ? "producto" : "productos"}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-on-surface-variant" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
