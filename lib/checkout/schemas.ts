import { z } from "zod";
import { email, pePhone } from "@/lib/account/schemas";
import { PE_DEPARTMENTS } from "@/lib/account/types";

/**
 * SUNAT: a boleta above this total must identify the buyer (DNI/CE).
 * Kept as a constant so it can move to store_settings if the rule changes.
 */
export const RECEIPT_ID_REQUIRED_FROM = 700;

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);
const required = (label: string, max = 120) => text(max).min(1, `Ingresa ${label}`);
/** Absent (field not rendered) or blank → null. */
const optional = (max: number) =>
  text(max)
    .optional()
    .transform((v) => v || null);
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

export const newAddressSchema = z.object({
  recipientName: required("quién recibe"),
  line1: required("la dirección", 200),
  line2: optional(200),
  city: required("el distrito", 80),
  province: z.enum(PE_DEPARTMENTS, "Elige un departamento"),
  postalCode: optional(10).pipe(z.union([z.null(), z.string().regex(/^\d{5}$/, "El código postal tiene 5 dígitos")])),
});

export const checkoutSchema = z
  .object({
    email,
    firstName: required("tu nombre", 80),
    lastName: required("tus apellidos", 80),
    phone: pePhone,
    /** A saved address id (signed-in), or empty for a new one. */
    addressId: optional(64),
    recipientName: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    saveAddress: checkbox,
    shippingRateId: z.string().trim().min(1, "Elige un método de envío"),
    invoiceKind: z.enum(["receipt", "invoice"], "Elige boleta o factura"),
    receiptDocType: z
      .union([z.enum(["DNI", "CE"]), z.literal("")])
      .optional()
      .transform((v) => v || null),
    receiptDocNumber: optional(12),
    ruc: optional(11),
    companyName: optional(200),
    fiscalAddress: optional(250),
    customerNote: optional(500),
  })
  .superRefine((d, ctx) => {
    if (!d.addressId) {
      const parsed = newAddressSchema.safeParse(d);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
    }
    if (d.invoiceKind === "receipt" && d.receiptDocType) {
      const ok = d.receiptDocType === "DNI" ? /^\d{8}$/.test(d.receiptDocNumber ?? "") : /^[A-Za-z0-9]{9,12}$/.test(d.receiptDocNumber ?? "");
      if (!ok) {
        ctx.addIssue({
          code: "custom",
          path: ["receiptDocNumber"],
          message: d.receiptDocType === "DNI" ? "El DNI tiene 8 dígitos" : "El carné de extranjería tiene de 9 a 12 caracteres",
        });
      }
    }
    if (d.invoiceKind === "invoice") {
      if (!/^(10|15|16|17|20)\d{9}$/.test(d.ruc ?? "")) {
        ctx.addIssue({ code: "custom", path: ["ruc"], message: "El RUC tiene 11 dígitos y empieza con 10, 15, 16, 17 o 20" });
      }
      if (!d.companyName) ctx.addIssue({ code: "custom", path: ["companyName"], message: "Ingresa la razón social" });
      if (!d.fiscalAddress) ctx.addIssue({ code: "custom", path: ["fiscalAddress"], message: "Ingresa la dirección fiscal" });
    }
  });

export type CheckoutForm = z.infer<typeof checkoutSchema>;

/** Extra rule that needs the order total. Returns an error message or null. */
export function receiptIdentityError(form: CheckoutForm, grandTotal: number): string | null {
  if (form.invoiceKind !== "receipt" || form.receiptDocType) return null;
  return grandTotal >= RECEIPT_ID_REQUIRED_FROM
    ? `Para boletas desde S/ ${RECEIPT_ID_REQUIRED_FROM} necesitamos tu DNI o carné de extranjería.`
    : null;
}
