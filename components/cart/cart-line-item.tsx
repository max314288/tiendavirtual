"use client";

import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateCartLineAction } from "@/lib/cart/actions";
import { MAX_LINE_QUANTITY, type CartLine } from "@/lib/cart/types";
import { formatMoney } from "@/lib/money";

type Props = {
  line: CartLine;
  currencyCode: string;
  locale: string;
  compact?: boolean;
};

function issueText(line: CartLine, money: (m: string) => string): string | null {
  switch (line.issue) {
    case "out_of_stock":
      return "Agotado. Quítalo para continuar.";
    case "insufficient_stock":
      return `Solo quedan ${line.available}. Reduce la cantidad para continuar.`;
    case "price_changed":
      return `El precio cambió de ${money(line.unitPriceSnapshot)} a ${money(line.unitPrice)}.`;
    case "unavailable":
      return "Este producto ya no está disponible.";
    default:
      return null;
  }
}

function StepButton({ label, disabled, children }: { label: string; disabled?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      disabled={disabled || pending}
      className="flex size-touch items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function CartLineItem({ line, currencyCode, locale, compact }: Props) {
  const [state, action] = useActionState(updateCartLineAction, {});
  const money = (m: string) => formatMoney(m, currencyCode, locale);
  const maxQty = line.allowBackorder ? MAX_LINE_QUANTITY : Math.min(MAX_LINE_QUANTITY, line.available);
  const issue = issueText(line, money);
  const href = line.productSlug ? `/producto/${line.productSlug}?variante=${line.variantId}` : undefined;

  const qtyForm = (quantity: number, label: string, icon: React.ReactNode, disabled?: boolean) => (
    <form action={action}>
      <input type="hidden" name="lineId" value={line.id} />
      <input type="hidden" name="quantity" value={quantity} />
      <StepButton label={label} disabled={disabled}>
        {icon}
      </StepButton>
    </form>
  );

  return (
    <li className={`flex gap-space-md rounded-xl ${compact ? "bg-surface-container-low/40 p-space-sm" : "border-b border-outline-variant/30 py-space-md last:border-b-0"}`}>
      <div className={`relative shrink-0 overflow-hidden rounded-lg bg-surface-container ${compact ? "size-20" : "size-24 md:size-28"}`}>
        {line.image && (
          <Image src={line.image.url} alt={line.image.alt} fill sizes="112px" className="object-cover mix-blend-multiply" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="min-w-0">
            {href ? (
              <Link href={href} className="line-clamp-2 text-label-lg text-on-surface hover:text-secondary">
                {line.productName}
              </Link>
            ) : (
              <p className="text-label-lg text-on-surface">{line.productName}</p>
            )}
            {line.variantTitle && line.variantTitle !== "Única" && (
              <p className="text-label-sm text-on-surface-variant">{line.variantTitle}</p>
            )}
            {!compact && <p className="text-label-sm text-on-surface-variant">SKU: {line.sku}</p>}
          </div>
          <form action={action} className="-mt-2 -mr-2">
            <input type="hidden" name="lineId" value={line.id} />
            <input type="hidden" name="quantity" value={0} />
            <StepButton label={`Quitar ${line.productName}`}>
              <Trash2 className="size-4" aria-hidden />
            </StepButton>
          </form>
        </div>

        {(issue || state.error) && (
          <p role="status" className="flex items-start gap-1 text-label-sm text-error">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
            {state.error ?? issue}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-space-sm">
          {line.issue !== "unavailable" ? (
            <div className="flex items-center rounded-lg bg-surface-container-lowest shadow-surface-1" role="group" aria-label={`Cantidad de ${line.productName}`}>
              {qtyForm(line.quantity - 1, "Disminuir cantidad", <Minus className="size-4" aria-hidden />, line.quantity <= 1)}
              <output className="w-8 text-center text-label-lg" aria-live="polite">
                {line.quantity}
              </output>
              {qtyForm(line.quantity + 1, "Aumentar cantidad", <Plus className="size-4" aria-hidden />, line.quantity >= maxQty)}
            </div>
          ) : (
            <span />
          )}
          <div className="text-right">
            <p className="text-title-md text-on-surface">{money(line.lineTotal)}</p>
            {line.quantity > 1 && <p className="text-label-sm text-on-surface-variant">{money(line.unitPrice)} c/u</p>}
          </div>
        </div>
      </div>
    </li>
  );
}
