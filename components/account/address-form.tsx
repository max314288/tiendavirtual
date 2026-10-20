"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { CheckboxField, FormMessage, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { saveAddressAction } from "@/lib/account/actions";
import { PE_DEPARTMENTS, type Address } from "@/lib/account/types";
import { initialFormState } from "@/lib/forms";

function initialValues(address?: Address): Record<string, string> {
  if (!address) return { province: "Lima", taxDocumentType: "" };
  return {
    alias: address.alias,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    province: address.province,
    postalCode: address.postalCode ?? "",
    taxDocumentType: address.taxDocumentType ?? "",
    taxDocumentNumber: address.taxDocumentNumber ?? "",
    companyName: address.companyName ?? "",
    isDefaultShipping: address.isDefaultShipping ? "on" : "",
    isDefaultBilling: address.isDefaultBilling ? "on" : "",
  };
}

export function AddressForm({ address }: { address?: Address }) {
  const [state, action, pending] = useActionState(saveAddressAction, initialFormState);
  const v = state.values ?? initialValues(address);
  const errors = state.fieldErrors ?? {};
  const [docType, setDocType] = useState(v.taxDocumentType ?? "");

  return (
    <form
      action={action}
      // Submit through a transition so React doesn't reset the form: after a
      // validation error the conditional tax fields must keep their values.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      noValidate
      className="space-y-space-lg"
    >
      {address && <input type="hidden" name="id" value={address.id} />}
      <FormMessage state={state} />

      <fieldset className="space-y-space-md">
        <legend className="mb-space-sm text-title-md text-on-surface">Datos de entrega</legend>
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          <TextField
            label="Nombre de la dirección"
            name="alias"
            placeholder="Casa, Oficina…"
            required
            defaultValue={v.alias}
            errors={errors.alias}
          />
          <TextField
            label="¿Quién recibe?"
            name="recipientName"
            autoComplete="name"
            required
            defaultValue={v.recipientName}
            errors={errors.recipientName}
          />
          <TextField
            label="Celular de contacto"
            name="phone"
            type="tel"
            autoComplete="tel-national"
            inputMode="tel"
            required
            placeholder="987 654 321"
            defaultValue={v.phone}
            errors={errors.phone}
          />
          <SelectField label="Departamento" name="province" autoComplete="address-level1" required defaultValue={v.province} errors={errors.province}>
            {PE_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Distrito"
            name="city"
            autoComplete="address-level2"
            required
            placeholder="Miraflores"
            defaultValue={v.city}
            errors={errors.city}
          />
          <TextField
            label="Código postal"
            name="postalCode"
            autoComplete="postal-code"
            inputMode="numeric"
            optional
            placeholder="15074"
            defaultValue={v.postalCode}
            errors={errors.postalCode}
          />
        </div>
        <TextField
          label="Dirección"
          name="line1"
          autoComplete="address-line1"
          required
          placeholder="Av. Larco 1234"
          defaultValue={v.line1}
          errors={errors.line1}
        />
        <TextField
          label="Referencia, piso o departamento"
          name="line2"
          autoComplete="address-line2"
          optional
          placeholder="Dpto. 502, frente al parque"
          defaultValue={v.line2}
          errors={errors.line2}
        />
      </fieldset>

      <fieldset className="space-y-space-md">
        <legend className="mb-space-xs text-title-md text-on-surface">Datos para comprobante</legend>
        <p className="text-body-md text-on-surface-variant">
          Opcional. Con DNI o CE emitimos boleta; con RUC, factura.
        </p>
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          <SelectField
            label="Tipo de documento"
            name="taxDocumentType"
            optional
            defaultValue={v.taxDocumentType}
            onChange={(e) => setDocType(e.target.value)}
            errors={errors.taxDocumentType}
          >
            <option value="">Sin documento</option>
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
            <option value="RUC">RUC</option>
          </SelectField>
          {docType && (
            <TextField
              label={`Número de ${docType}`}
              name="taxDocumentNumber"
              inputMode={docType === "CE" ? "text" : "numeric"}
              required
              defaultValue={v.taxDocumentNumber}
              errors={errors.taxDocumentNumber}
            />
          )}
        </div>
        {docType === "RUC" && (
          <TextField
            label="Razón social"
            name="companyName"
            autoComplete="organization"
            required
            defaultValue={v.companyName}
            errors={errors.companyName}
          />
        )}
      </fieldset>

      <div>
        <CheckboxField name="isDefaultShipping" defaultChecked={v.isDefaultShipping === "on"}>
          Usar como dirección de envío predeterminada
        </CheckboxField>
        <CheckboxField name="isDefaultBilling" defaultChecked={v.isDefaultBilling === "on"}>
          Usar como dirección de facturación predeterminada
        </CheckboxField>
      </div>

      <div className="flex flex-col-reverse gap-space-sm sm:flex-row">
        <Link
          href="/cuenta/direcciones"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-outline-variant px-space-lg text-label-lg text-on-surface hover:bg-surface-container-low"
        >
          Cancelar
        </Link>
        <SubmitButton pending={pending}>{address ? "Guardar cambios" : "Agregar dirección"}</SubmitButton>
      </div>
    </form>
  );
}
