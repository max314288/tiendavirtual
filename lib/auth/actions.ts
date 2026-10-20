"use server";

import { redirect } from "next/navigation";
import { updateCustomer } from "@/lib/account/api";
import { fieldErrors, formObject, loginSchema, registerSchema } from "@/lib/account/schemas";
import { forgetGuestCart, mergeGuestCart } from "@/lib/cart/api";
import { echoValues, type FormState } from "@/lib/forms";
import { auth } from "./index";
import { safeNextPath } from "./redirect";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formObject(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: echoValues(raw) };
  }

  const provider = auth();
  const result = await provider.signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) return { status: "error", message: result.error, values: echoValues(raw) };

  const user = await provider.getUser();
  if (user) await mergeGuestCart(user);
  redirect(safeNextPath(raw.next));
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formObject(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: echoValues(raw) };
  }

  const { email, password, firstName, lastName, phone, acceptsMarketing } = parsed.data;
  const provider = auth();
  const result = await provider.signUp({ email, password, firstName, lastName, phone, acceptsMarketing });
  if (!result.ok) return { status: "error", message: result.error, values: echoValues(raw) };

  if (result.needsEmailConfirmation) {
    return {
      status: "success",
      message: `Te enviamos un correo a ${email}. Confírmalo para activar tu cuenta y luego inicia sesión.`,
    };
  }

  const user = await provider.getUser();
  if (user) {
    // Creates this store's customer record with the extra sign-up data.
    await updateCustomer(user, { firstName, lastName, phone, acceptsMarketing });
    await mergeGuestCart(user);
  }
  redirect(safeNextPath(raw.next));
}

export async function logoutAction(): Promise<void> {
  await auth().signOut();
  await forgetGuestCart();
  redirect("/");
}
