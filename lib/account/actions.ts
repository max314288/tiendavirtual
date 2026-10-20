"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { echoValues, type FormState } from "@/lib/forms";
import { createAddress, deleteAddress, updateAddress, updateCustomer } from "./api";
import { addressSchema, fieldErrors, formObject, profileSchema } from "./schemas";

// Every action re-reads the session: never trust identity sent by the client.

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/cuenta");
  const raw = formObject(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: echoValues(raw) };
  }
  await updateCustomer(user, parsed.data);
  refresh();
  return { status: "success", message: "Tus datos se guardaron.", values: echoValues(raw) };
}

export async function saveAddressAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/cuenta/direcciones");
  const raw = formObject(formData);
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
      values: echoValues(raw),
    };
  }

  const id = raw.id;
  if (id) {
    const updated = await updateAddress(user, id, parsed.data);
    if (!updated) return { status: "error", message: "No encontramos esa dirección.", values: echoValues(raw) };
  } else {
    await createAddress(user, parsed.data);
  }
  redirect("/cuenta/direcciones?guardada=1");
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cuenta/direcciones");
  const id = formData.get("id");
  if (typeof id === "string" && id) await deleteAddress(user, id);
  refresh();
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cuenta/direcciones");
  const id = formData.get("id");
  const kind = formData.get("kind");
  if (typeof id !== "string" || !id) return;
  if (kind === "shipping") await updateAddress(user, id, { isDefaultShipping: true });
  if (kind === "billing") await updateAddress(user, id, { isDefaultBilling: true });
  refresh();
}
