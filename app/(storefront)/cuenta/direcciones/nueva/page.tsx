import type { Metadata } from "next";
import { AddressForm } from "@/components/account/address-form";
import { requireUser } from "@/lib/auth";
import { Suspense } from "react";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";

export const metadata: Metadata = { title: "Nueva dirección" };

async function NewAddressContent() {
  await requireUser("/cuenta/direcciones/nueva");
  return (
    <section aria-labelledby="nueva-direccion" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
      <h2 id="nueva-direccion" className="mb-space-lg text-headline-sm text-on-surface">
        Nueva dirección
      </h2>
      <AddressForm />
    </section>
  );
}

export default function NewAddressPage() {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <NewAddressContent />
    </Suspense>
  );
}
