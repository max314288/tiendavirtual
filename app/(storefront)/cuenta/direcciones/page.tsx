import type { Metadata } from "next";
import { CheckCircle2, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { AddressCard } from "@/components/account/address-card";
import { listAddresses } from "@/lib/account/api";
import { requireUser } from "@/lib/auth";
import { Suspense } from "react";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";

export const metadata: Metadata = { title: "Direcciones" };

async function AddressesContent({ searchParams }: PageProps<"/cuenta/direcciones">) {
  const [user, params] = await Promise.all([requireUser("/cuenta/direcciones"), searchParams]);
  const addresses = await listAddresses(user);
  const saved = params.guardada === "1";

  return (
    <section aria-labelledby="direcciones" className="space-y-space-md">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h2 id="direcciones" className="text-headline-sm text-on-surface">
          Mis direcciones
        </h2>
        <Link
          href="/cuenta/direcciones/nueva"
          className="inline-flex h-11 items-center gap-space-xs rounded-xl bg-primary px-space-md text-label-lg text-on-primary hover:bg-surface-tint"
        >
          <Plus className="size-4" aria-hidden />
          Agregar dirección
        </Link>
      </div>

      {saved && (
        <p role="status" className="flex items-center gap-space-sm rounded-lg bg-tertiary-fixed/40 p-space-sm text-body-md text-on-tertiary-fixed-variant">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Dirección guardada.
        </p>
      )}

      {addresses.length > 0 ? (
        <ul className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id}>
              <AddressCard address={a} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-space-lg py-16 text-center">
          <MapPin className="mb-space-md size-10 text-on-surface-variant" aria-hidden />
          <p className="text-title-md text-on-surface">Aún no tienes direcciones</p>
          <p className="mt-space-xs max-w-sm text-body-md text-on-surface-variant">
            Guarda tu dirección de envío y tus datos de facturación para comprar más rápido.
          </p>
        </div>
      )}
    </section>
  );
}

export default function AddressesPage(props: PageProps<"/cuenta/direcciones">) {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <AddressesContent {...props} />
    </Suspense>
  );
}
