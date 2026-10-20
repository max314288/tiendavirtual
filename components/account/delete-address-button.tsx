"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteAddressAction } from "@/lib/account/actions";

/** Two-step delete: first click asks for confirmation inline. */
export function DeleteAddressButton({ id, alias }: { id: string; alias: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ml-auto inline-flex min-h-touch items-center gap-1 rounded-lg px-space-sm text-label-md text-error hover:bg-error-container/40"
      >
        <Trash2 className="size-4" aria-hidden />
        Eliminar
      </button>
    );
  }

  return (
    <form action={deleteAddressAction} className="ml-auto flex items-center gap-space-xs" role="group" aria-label={`Eliminar ${alias}`}>
      <input type="hidden" name="id" value={id} />
      <span className="text-label-md text-on-surface">¿Eliminar?</span>
      <button type="submit" className="min-h-touch rounded-lg bg-error px-space-sm text-label-md text-on-error">
        Sí, eliminar
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="min-h-touch rounded-lg px-space-sm text-label-md text-on-surface-variant">
        Cancelar
      </button>
    </form>
  );
}
