import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddressForm } from "@/components/account/address-form";
import { getAddress } from "@/lib/account/api";
import { requireUser } from "@/lib/auth";
import { Suspense } from "react";
import { AccountPanelSkeleton } from "@/components/account/panel-skeleton";

export const metadata: Metadata = { title: "Editar dirección" };

async function EditAddressContent({ params }: PageProps<"/cuenta/direcciones/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/cuenta/direcciones/${id}`);
  const address = await getAddress(user, id);
  if (!address) notFound();

  return (
    <section aria-labelledby="editar-direccion" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
      <h2 id="editar-direccion" className="mb-space-lg text-headline-sm text-on-surface">
        Editar {address.alias}
      </h2>
      <AddressForm address={address} />
    </section>
  );
}

export default function EditAddressPage(props: PageProps<"/cuenta/direcciones/[id]">) {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <EditAddressContent {...props} />
    </Suspense>
  );
}
