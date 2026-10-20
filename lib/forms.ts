import type { FieldErrors } from "@/lib/account/schemas";

/** Result of a form Server Action, consumed with useActionState. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Submitted values (never passwords) so the form can be refilled after an error. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

const SECRET_FIELDS = new Set(["password", "passwordConfirm"]);

export function echoValues(raw: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (v !== undefined && !SECRET_FIELDS.has(k)) out[k] = v;
  return out;
}
