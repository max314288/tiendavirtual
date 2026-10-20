import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { Suspense } from "react";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";
import { ReturnCard } from "@/components/orders/post-sale-sections";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { listReturns } from "@/lib/orders/api";
import { RETURN_WINDOW_DAYS } from "@/lib/orders/post-sale";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = { title: "Devoluciones" };

async function ReturnsContent() {
  const user = await requireUser("/cuenta/devoluciones");
  const [returns, store] = await Promise.all([listReturns(user), getStore()]);
  const fmt = { locale: store.locale, timezone: store.timezone };
  const money = (m: string) => formatMoney(m, store.currencyCode, store.locale);

  return (
    <section aria-labelledby="mis-devoluciones" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
      <h2 id="mis-devoluciones" className="mb-space-xs text-headline-sm text-on-surface">
        Devoluciones
      </h2>
      <p className="mb-space-md text-body-md text-on-surface-variant">
        Tienes {RETURN_WINDOW_DAYS} días desde la entrega para devolver un producto. Inicia la solicitud desde el detalle del pedido.
      </p>
      {returns.length > 0 ? (
        <div className="space-y-space-sm">
          {returns.map((r) => (
            <ReturnCard
              key={r.id}
              ret={r}
              money={money}
              fmt={fmt}
              orderHref={`/pedido/${encodeURIComponent(r.orderNumber)}?t=${encodeURIComponent(r.orderAccessToken)}`}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-space-xl text-center">
          <RotateCcw className="mb-space-md size-10 text-on-surface-variant" aria-hidden />
          <p className="text-title-md text-on-surface">No tienes devoluciones</p>
        </div>
      )}
    </section>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <ReturnsContent />
    </Suspense>
  );
}
