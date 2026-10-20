"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { email } from "@/lib/account/schemas";
import { RETURN_REASONS } from "@/lib/checkout/types";
import type { FormState } from "@/lib/forms";
import { advanceMockOrder, lookupOrder, requestReturn, type MockOrderStep } from "./api";

const orderUrl = (number: string, token: string | null, extra = "") =>
  `/pedido/${encodeURIComponent(number)}${token ? `?t=${encodeURIComponent(token)}${extra}` : extra.replace(/^&/, "?")}`;

const lookupSchema = z.object({
  number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^ORD-\d{6}$/, "El número tiene el formato ORD-000123"),
  email,
});

export async function lookupOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { number: String(formData.get("number") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = lookupSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };
  const token = await lookupOrder(parsed.data.number, parsed.data.email);
  // Same message whether the number or the email is wrong.
  if (!token) return { status: "error", message: "No encontramos un pedido con ese número y correo.", values: raw };
  redirect(orderUrl(parsed.data.number, token));
}

export type ReturnFormState = FormState;

const conditionSchema = z.enum(["new", "damaged"]);

export async function requestReturnAction(_prev: ReturnFormState, formData: FormData): Promise<ReturnFormState> {
  const number = String(formData.get("orderNumber") ?? "");
  const token = (formData.get("t") as string | null) || null;
  const reason = String(formData.get("reason") ?? "");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500) || null;

  if (!(RETURN_REASONS as readonly string[]).includes(reason)) {
    return { status: "error", fieldErrors: { reason: ["Elige el motivo de la devolución"] } };
  }

  const items: { orderLineId: string; quantity: number; condition: "new" | "damaged" }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty:")) continue;
    const orderLineId = key.slice(4);
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) continue;
    const condition = conditionSchema.safeParse(formData.get(`cond:${orderLineId}`));
    items.push({ orderLineId, quantity, condition: condition.success ? condition.data : "new" });
  }

  const result = await requestReturn(number, token, { items, reason, comment });
  if (!result.ok) return { status: "error", message: result.error };
  redirect(orderUrl(number, token, `&devolucion=${encodeURIComponent(result.returnNumber)}`));
}

const STEPS: MockOrderStep[] = ["process", "ship", "deliver", "approve_return", "receive_return", "reject_return"];

/** Mock mode demo tools on the order page (simulate admin panel / carrier). */
export async function mockOrderStepAction(formData: FormData): Promise<void> {
  const step = formData.get("step") as MockOrderStep;
  if (!STEPS.includes(step)) return;
  await advanceMockOrder(String(formData.get("orderNumber") ?? ""), (formData.get("t") as string | null) || null, step);
  refresh();
}
