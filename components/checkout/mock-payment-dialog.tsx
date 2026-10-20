"use client";

import { FlaskConical, X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  amount: string;
  onResult: (token: string | null) => void;
};

/**
 * Mock mode only: stands in for Culqi Checkout. It collects no card data,
 * it just lets you choose the payment outcome.
 */
export function MockPaymentDialog({ open, amount, onResult }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="mock-pay-title"
      onCancel={() => onResult(null)}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl bg-surface-container-lowest p-0 text-on-surface shadow-surface-2 backdrop:bg-backdrop backdrop:backdrop-blur-[4px]"
    >
      <div className="space-y-space-md p-space-lg">
        <div className="flex items-start justify-between gap-space-sm">
          <h2 id="mock-pay-title" className="flex items-center gap-space-sm text-headline-sm">
            <FlaskConical className="size-5 text-secondary" aria-hidden />
            Pago simulado
          </h2>
          <button
            type="button"
            onClick={() => onResult(null)}
            aria-label="Cerrar"
            className="-mt-2 -mr-2 flex size-touch items-center justify-center rounded-lg hover:bg-surface-container-low"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p className="text-body-md text-on-surface-variant">
          Estás en modo demo: aquí se abrirá Culqi para pagar <strong className="text-on-surface">{amount}</strong> con tarjeta o Yape.
          Elige el resultado del pago:
        </p>
        <div className="grid gap-space-sm">
          <button type="button" onClick={() => onResult("mock_ok")} className="h-12 rounded-xl bg-secondary text-label-lg text-on-secondary">
            Aprobar pago
          </button>
          <button
            type="button"
            onClick={() => onResult("mock_declined")}
            className="h-12 rounded-xl border border-outline-variant text-label-lg text-on-surface hover:bg-surface-container-low"
          >
            Simular rechazo del banco
          </button>
        </div>
      </div>
    </dialog>
  );
}
