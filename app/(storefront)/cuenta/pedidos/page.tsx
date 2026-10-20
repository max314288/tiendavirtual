import type { Metadata } from "next";
import { Package } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { OrderList } from "@/components/account/order-list";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";
import { requireUser } from "@/lib/auth";
import { listOrders } from "@/lib/checkout/api";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = { title: "Mis pedidos" };

async function OrdersContent() {
  const user = await requireUser("/cuenta/pedidos");
  const [orders, store] = await Promise.all([listOrders(user), getStore()]);

  return (
    <section aria-labelledby="mis-pedidos" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
      <h2 id="mis-pedidos" className="mb-space-md text-headline-sm text-on-surface">
        Mis pedidos
      </h2>
      {orders.length > 0 ? (
        <OrderList orders={orders} locale={store.locale} timezone={store.timezone} />
      ) : (
        <div className="flex flex-col items-center py-space-xl text-center">
          <Package className="mb-space-md size-10 text-on-surface-variant" aria-hidden />
          <p className="text-title-md text-on-surface">Todavía no has hecho pedidos</p>
          <p className="mt-space-xs max-w-sm text-body-md text-on-surface-variant">
            Cuando compres, aquí verás el estado de tus pedidos, envíos y comprobantes.
          </p>
          <Link href="/buscar" className="mt-space-lg inline-flex h-12 items-center rounded-xl bg-primary px-space-lg text-label-lg text-on-primary hover:bg-surface-tint">
            Explorar productos
          </Link>
        </div>
      )}
    </section>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}
