"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/ui/form";
import { initialFormState } from "@/lib/forms";
import { lookupOrderAction } from "@/lib/orders/actions";

export function LookupForm() {
  const [state, action] = useActionState(lookupOrderAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-space-md">
      <FormMessage state={state} />
      <TextField
        label="Número de pedido"
        name="number"
        required
        placeholder="ORD-000123"
        autoCapitalize="characters"
        hint="Lo encuentras en el correo de confirmación."
        defaultValue={state.values?.number}
        errors={errors.number}
      />
      <TextField
        label="Correo de la compra"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        errors={errors.email}
      />
      <SubmitButton pendingLabel="Buscando…" className="w-full">
        Ver mi pedido
      </SubmitButton>
    </form>
  );
}
