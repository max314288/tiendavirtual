import { Pencil } from "lucide-react";
import Link from "next/link";
import type { Address } from "@/lib/account/types";
import { setDefaultAddressAction } from "@/lib/account/actions";
import { DeleteAddressButton } from "./delete-address-button";

export function formatAddressLines(a: Address): string[] {
  return [
    [a.line1, a.line2].filter(Boolean).join(", "),
    [a.city, a.province, a.postalCode].filter(Boolean).join(", "),
  ];
}

const docLabel = { DNI: "DNI", CE: "CE", RUC: "RUC" } as const;

export function AddressCard({ address, actions = true }: { address: Address; actions?: boolean }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-space-md">
      <header className="mb-space-sm flex flex-wrap items-center gap-space-xs">
        <h3 className="mr-auto text-title-md text-on-surface">{address.alias}</h3>
        {address.isDefaultShipping && (
          <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 text-label-sm text-on-secondary-fixed-variant">Envío predeterminado</span>
        )}
        {address.isDefaultBilling && (
          <span className="rounded-full bg-tertiary-fixed/40 px-2.5 py-0.5 text-label-sm text-on-tertiary-fixed-variant">
            Facturación predeterminada
          </span>
        )}
      </header>
      <address className="space-y-0.5 text-body-md text-on-surface-variant not-italic">
        <p className="text-on-surface">{address.recipientName}</p>
        {formatAddressLines(address).map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>Cel. {address.phone}</p>
        {address.taxDocumentType && (
          <p>
            {docLabel[address.taxDocumentType]} {address.taxDocumentNumber}
            {address.companyName ? ` · ${address.companyName}` : ""}
          </p>
        )}
      </address>

      {actions && (
        <footer className="mt-auto flex flex-wrap items-center gap-x-space-sm gap-y-space-xs border-t border-outline-variant/30 pt-space-sm">
          <Link
            href={`/cuenta/direcciones/${address.id}`}
            className="inline-flex min-h-touch items-center gap-1 rounded-lg px-space-sm text-label-lg text-secondary hover:bg-surface-container-low"
          >
            <Pencil className="size-4" aria-hidden />
            Editar
          </Link>
          {!address.isDefaultShipping && (
            <form action={setDefaultAddressAction}>
              <input type="hidden" name="id" value={address.id} />
              <input type="hidden" name="kind" value="shipping" />
              <button type="submit" className="min-h-touch rounded-lg px-space-sm text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface">
                Usar para envíos
              </button>
            </form>
          )}
          {!address.isDefaultBilling && (
            <form action={setDefaultAddressAction}>
              <input type="hidden" name="id" value={address.id} />
              <input type="hidden" name="kind" value="billing" />
              <button type="submit" className="min-h-touch rounded-lg px-space-sm text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface">
                Usar para facturación
              </button>
            </form>
          )}
          <DeleteAddressButton id={address.id} alias={address.alias} />
        </footer>
      )}
    </article>
  );
}
