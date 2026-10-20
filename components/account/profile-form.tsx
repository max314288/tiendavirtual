"use client";

import { useActionState } from "react";
import { CheckboxField, FormMessage, SubmitButton, TextField } from "@/components/ui/form";
import { updateProfileAction } from "@/lib/account/actions";
import type { Customer } from "@/lib/account/types";
import { initialFormState } from "@/lib/forms";

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  // After a submit, show what was sent; otherwise the saved values.
  const v = state.values ?? {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone ?? "",
    acceptsMarketing: customer.acceptsMarketing ? "on" : "",
  };

  return (
    <form action={action} noValidate className="space-y-space-md">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <TextField label="Nombres" name="firstName" autoComplete="given-name" required defaultValue={v.firstName} errors={errors.firstName} />
        <TextField label="Apellidos" name="lastName" autoComplete="family-name" required defaultValue={v.lastName} errors={errors.lastName} />
        <TextField
          label="Correo electrónico"
          name="emailDisplay"
          type="email"
          value={customer.email}
          readOnly
          disabled
          hint="Es tu usuario para iniciar sesión."
        />
        <TextField
          label="Celular"
          name="phone"
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          optional
          placeholder="987 654 321"
          defaultValue={v.phone}
          errors={errors.phone}
        />
      </div>
      <CheckboxField name="acceptsMarketing" defaultChecked={v.acceptsMarketing === "on"}>
        Quiero recibir ofertas y novedades por correo.
      </CheckboxField>
      <SubmitButton>Guardar cambios</SubmitButton>
    </form>
  );
}
