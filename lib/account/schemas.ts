import { z } from "zod";
import { PE_DEPARTMENTS, TAX_DOCUMENT_TYPES } from "./types";

// Form validation shared by server actions (authoritative) and tests.

const trimmed = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);
const required = (label: string, max = 120) => trimmed(max).min(1, `Ingresa ${label}`);

/** Peruvian mobile: 9 digits starting with 9; "+51" and spaces allowed. */
export const pePhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?51(?=9\d{8}$)/, ""))
  .pipe(z.string().regex(/^9\d{8}$/, "Ingresa un celular válido de 9 dígitos (ej. 987 654 321)"));

const optionalPhone = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.union([z.null(), pePhone]));

export const email = z.string().trim().toLowerCase().pipe(z.email("Ingresa un correo válido"));

export const password = z
  .string()
  .min(8, "Usa al menos 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Za-z]/, "Incluye al menos una letra")
  .regex(/\d/, "Incluye al menos un número");

/** Unchecked checkboxes are absent from FormData, hence optional. */
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const registerSchema = z
  .object({
    firstName: required("tu nombre", 80),
    lastName: required("tus apellidos", 80),
    phone: optionalPhone,
    email,
    password,
    passwordConfirm: z.string(),
    acceptsMarketing: checkbox,
    acceptsTerms: checkbox.refine((v) => v, "Debes aceptar los términos y la política de privacidad"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Las contraseñas no coinciden",
  });

export const profileSchema = z.object({
  firstName: required("tu nombre", 80),
  lastName: required("tus apellidos", 80),
  phone: optionalPhone,
  acceptsMarketing: checkbox,
});

const DOC_RULES: Record<(typeof TAX_DOCUMENT_TYPES)[number], { re: RegExp; message: string }> = {
  DNI: { re: /^\d{8}$/, message: "El DNI tiene 8 dígitos" },
  CE: { re: /^[A-Za-z0-9]{9,12}$/, message: "El carné de extranjería tiene de 9 a 12 caracteres" },
  RUC: { re: /^(10|15|16|17|20)\d{9}$/, message: "El RUC tiene 11 dígitos y empieza con 10, 15, 16, 17 o 20" },
};

export const addressSchema = z
  .object({
    alias: required("un nombre para la dirección", 40),
    recipientName: required("quién recibe", 120),
    phone: pePhone,
    line1: required("la dirección", 200),
    line2: trimmed(200).transform((v) => v || null),
    city: required("el distrito", 80),
    province: z.enum(PE_DEPARTMENTS, "Elige un departamento"),
    postalCode: trimmed(10)
      .transform((v) => v || null)
      .pipe(z.union([z.null(), z.string().regex(/^\d{5}$/, "El código postal tiene 5 dígitos")])),
    taxDocumentType: z
      .union([z.enum(TAX_DOCUMENT_TYPES), z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    taxDocumentNumber: trimmed(12).transform((v) => v || null),
    companyName: trimmed(200).transform((v) => v || null),
    isDefaultShipping: checkbox,
    isDefaultBilling: checkbox,
  })
  .superRefine((a, ctx) => {
    if (!a.taxDocumentType) return;
    const rule = DOC_RULES[a.taxDocumentType];
    if (!a.taxDocumentNumber || !rule.re.test(a.taxDocumentNumber)) {
      ctx.addIssue({ code: "custom", path: ["taxDocumentNumber"], message: rule.message });
    }
    if (a.taxDocumentType === "RUC" && !a.companyName) {
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Ingresa la razón social para facturar con RUC" });
    }
  })
  .transform((a) => ({
    ...a,
    countryCode: "PE",
    // Without a document type, number and company name are meaningless.
    taxDocumentNumber: a.taxDocumentType ? a.taxDocumentNumber : null,
    companyName: a.taxDocumentType === "RUC" ? a.companyName : null,
  }));

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/** FormData → plain object; checkboxes absent from the form come back undefined. */
export function formObject(formData: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}
