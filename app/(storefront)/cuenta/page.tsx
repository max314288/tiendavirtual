import { MapPin, Package } from "lucide-react";
import Link from "next/link";
import { AddressCard } from "@/components/account/address-card";
import { OrderList } from "@/components/account/order-list";
import { ProfileForm } from "@/components/account/profile-form";
import { getCustomer, listAddresses } from "@/lib/account/api";
import { requireUser } from "@/lib/auth";
import { listOrders } from "@/lib/checkout/api";
import { getStore } from "@/lib/store/get-store";
import { Suspense } from "react";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";

const card = "rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg";

async function AccountOverview() {
  const user = await requireUser("/cuenta");
  const [customer, addresses, orders, store] = await Promise.all([getCustomer(user), listAddresses(user), listOrders(user), getStore()]);
  const shipping = addresses.find((a) => a.isDefaultShipping);

  return (
    <div className="space-y-space-lg">
      <section aria-labelledby="mis-datos" className={card}>
        <h2 id="mis-datos" className="mb-space-md text-headline-sm text-on-surface">
          Mis datos
        </h2>
        <ProfileForm customer={customer} />
      </section>

      <div className="grid grid-cols-1 gap-space-lg xl:grid-cols-2">
        <section aria-labelledby="direccion-envio" className={card}>
          <div className="mb-space-md flex items-center justify-between gap-space-sm">
            <h2 id="direccion-envio" className="text-headline-sm text-on-surface">
              Dirección de envío
            </h2>
            <Link href="/cuenta/direcciones" className="text-label-lg text-secondary hover:underline">
              Gestionar
            </Link>
          </div>
          {shipping ? (
            <AddressCard address={shipping} actions={false} />
          ) : (
            <div className="flex flex-col items-start gap-space-sm">
              <MapPin className="size-8 text-on-surface-variant" aria-hidden />
              <p className="text-body-md text-on-surface-variant">Aún no tienes direcciones guardadas.</p>
              <Link href="/cuenta/direcciones/nueva" className="text-label-lg text-secondary hover:underline">
                Agregar dirección
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="pedidos-recientes" className={card}>
          <div className="mb-space-md flex items-center justify-between gap-space-sm">
            <h2 id="pedidos-recientes" className="text-headline-sm text-on-surface">
              Pedidos recientes
            </h2>
            <Link href="/cuenta/pedidos" className="text-label-lg text-secondary hover:underline">
              Ver todos
            </Link>
          </div>
          {orders.length > 0 ? (
            <OrderList orders={orders.slice(0, 3)} locale={store.locale} timezone={store.timezone} />
          ) : (
            <div className="flex flex-col items-start gap-space-sm">
              <Package className="size-8 text-on-surface-variant" aria-hidden />
              <p className="text-body-md text-on-surface-variant">Todavía no has hecho pedidos.</p>
              <Link href="/buscar" className="text-label-lg text-secondary hover:underline">
                Explorar productos
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <AccountOverview />
    </Suspense>
  );
}
