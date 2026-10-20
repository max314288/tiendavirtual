"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { FormMessage, SelectField, SubmitButton } from "@/components/ui/form";
import { fromCents, toCents } from "@/lib/cart/totals";
import { RETURN_REASONS, type OrderLine } from "@/lib/checkout/types";
import { initialFormState } from "@/lib/forms";
import { formatMoney } from "@/lib/money";
import { requestReturnAction } from "@/lib/orders/actions";

type Props = {
  orderNumber: string;
  token: string | null;
  lines: (OrderLine & { returnable: number })[];
  currencyCode: string;
  locale: string;
  cancelHref: string;
};

export function ReturnForm({ orderNumber, token, lines, currencyCode, locale, cancelHref }: Props) {
  const [state, action, pending] = useActionState(requestReturnAction, initialFormState);
  const [qty, setQty] = useState<Record<string, number>>({});
  const money = (m: string) => formatMoney(m, currencyCode, locale);
  const refund = fromCents(lines.reduce((sum, l) => sum + toCents(l.unitPrice) * (qty[l.id] ?? 0), 0));
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={action}
      // Avoid React's post-action form reset, which would desync the
      // controlled quantity selects from the estimated refund.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-space-lg"
    >
      <input type="hidden" name="orderNumber" value={orderNumber} />
      {token && <input type="hidden" name="t" value={token} />}
      <FormMessage state={state} />

      <fieldset>
        <legend className="mb-space-sm text-title-md text-on-surface">¿Qué quieres devolver?</legend>
        <ul className="divide-y divide-outline-variant/30 rounded-xl border border-outline-variant/30">
          {lines.map((l) => {
            const disabled = l.returnable === 0;
            return (
              <li key={l.id} className={`flex flex-wrap items-center gap-space-md p-space-sm md:p-space-md ${disabled ? "opacity-50" : ""}`}>
                <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                  {l.image && <Image src={l.image.url} alt="" fill sizes="64px" className="object-cover mix-blend-multiply" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-label-lg text-on-surface">{l.productName}</span>
                  <span className="block text-label-sm text-on-surface-variant">
                    {l.variantTitle !== "Única" ? `${l.variantTitle} · ` : ""}
                    {money(l.unitPrice)} c/u · {disabled ? "Sin unidades por devolver" : `Puedes devolver ${l.returnable}`}
                  </span>
                </span>
                <span className="flex w-full items-center gap-space-sm sm:w-auto">
                  <label className="sr-only" htmlFor={`qty-${l.id}`}>
                    Cantidad a devolver de {l.productName}
                  </label>
                  <select
                    id={`qty-${l.id}`}
                    name={`qty:${l.id}`}
                    disabled={disabled}
                    value={qty[l.id] ?? 0}
                    onChange={(e) => setQty((q) => ({ ...q, [l.id]: Number(e.target.value) }))}
                    className="h-11 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-space-sm text-body-md"
                  >
                    {Array.from({ length: l.returnable + 1 }, (_, n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`cond-${l.id}`}>
                    Estado de {l.productName}
                  </label>
                  <select
                    id={`cond-${l.id}`}
                    name={`cond:${l.id}`}
                    disabled={disabled || !qty[l.id]}
                    defaultValue="new"
                    className="h-11 flex-1 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-space-sm text-body-md sm:flex-none"
                  >
                    <option value="new">Sin usar, en su empaque</option>
                    <option value="damaged">Dañado o con fallas</option>
                  </select>
                </span>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="grid gap-space-md sm:grid-cols-2">
        <SelectField label="Motivo" name="reason" required defaultValue="" errors={errors.reason}>
          <option value="" disabled>
            Elige un motivo
          </option>
          {RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
        <div className="space-y-1">
          <label htmlFor="return-comment" className="text-label-md text-on-surface">
            Comentario <span className="font-normal text-on-surface-variant">(opcional)</span>
          </label>
          <textarea
            id="return-comment"
            name="comment"
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-space-sm text-body-md focus:border-secondary focus:ring-2 focus:ring-secondary/15 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-md sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-md text-on-surface-variant">
          Reembolso estimado: <strong className="text-title-md text-on-surface">{money(refund)}</strong>
          <span className="block text-label-sm">Se devuelve al mismo medio de pago con una nota de crédito. El envío no se reembolsa.</span>
        </p>
        <div className="flex flex-col-reverse gap-space-sm sm:flex-row">
          <Link href={cancelHref} className="inline-flex h-12 items-center justify-center rounded-xl border border-outline-variant px-space-lg text-label-lg text-on-surface hover:bg-surface-container-lowest">
            Cancelar
          </Link>
          <SubmitButton pendingLabel="Enviando…" pending={pending}>
            Solicitar devolución
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
