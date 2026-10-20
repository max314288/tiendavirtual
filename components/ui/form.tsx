"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";

const inputClass =
  "h-11 w-full rounded-lg border bg-surface-container-lowest px-space-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-shadow focus:outline-none focus:ring-2 disabled:bg-surface-container-low aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/15 border-outline-variant/60 focus:border-secondary focus:ring-secondary/15";

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  optional?: boolean;
  labelAside?: ReactNode;
  children: ReactNode;
};

function FieldShell({ id, label, hint, errors, optional, labelAside, children }: FieldShellProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-space-sm">
        <label htmlFor={id} className="text-label-md text-on-surface">
          {label}
          {optional && <span className="ml-1 font-normal text-on-surface-variant">(opcional)</span>}
        </label>
        {labelAside}
      </div>
      {children}
      {errors?.length ? (
        <p id={`${id}-error`} className="flex items-start gap-1 text-label-sm text-error">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-label-sm font-normal text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
  optional?: boolean;
  labelAside?: ReactNode;
};

export function TextField({ label, hint, errors, optional, labelAside, className = "", ...input }: TextFieldProps) {
  const id = useId();
  const invalid = Boolean(errors?.length);
  return (
    <FieldShell id={id} label={label} hint={hint} errors={errors} optional={optional} labelAside={labelAside}>
      <input
        id={id}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${inputClass} ${className}`}
        {...input}
      />
    </FieldShell>
  );
}

export function PasswordField({ label, hint, errors, labelAside, ...input }: Omit<TextFieldProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const invalid = Boolean(errors?.length);
  return (
    <FieldShell id={id} label={label} hint={hint} errors={errors} labelAside={labelAside}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${inputClass} pr-12`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-on-surface-variant hover:text-on-surface"
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
    </FieldShell>
  );
}

type SelectFieldProps = Omit<ComponentProps<"select">, "id"> & {
  label: string;
  name: string;
  errors?: string[];
  optional?: boolean;
  children: ReactNode;
};

export function SelectField({ label, errors, optional, children, ...select }: SelectFieldProps) {
  const id = useId();
  const invalid = Boolean(errors?.length);
  return (
    <FieldShell id={id} label={label} errors={errors} optional={optional}>
      <select
        id={id}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`${inputClass} pr-space-sm`}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  );
}

type CheckboxFieldProps = Omit<ComponentProps<"input">, "type" | "id"> & {
  name: string;
  children: ReactNode;
  errors?: string[];
};

export function CheckboxField({ children, errors, ...input }: CheckboxFieldProps) {
  const id = useId();
  const invalid = Boolean(errors?.length);
  return (
    <div>
      <label htmlFor={id} className="flex min-h-touch cursor-pointer items-start gap-space-sm py-space-xs text-body-md text-on-surface">
        <input
          id={id}
          type="checkbox"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="mt-0.5 size-4 shrink-0 accent-secondary"
          {...input}
        />
        <span>{children}</span>
      </label>
      {invalid && (
        <p id={`${id}-error`} className="flex items-start gap-1 pl-6 text-label-sm text-error">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {errors![0]}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  variant = "primary",
  className = "",
  pending: pendingOverride,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  className?: string;
  /** For forms submitted through startTransition, where useFormStatus can't see the action. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingOverride ?? status.pending;
  const color =
    variant === "primary"
      ? "bg-primary text-on-primary hover:bg-surface-tint"
      : "bg-secondary text-on-secondary hover:bg-secondary-container";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-12 items-center justify-center rounded-xl px-space-lg text-label-lg transition-colors disabled:cursor-wait disabled:opacity-70 ${color} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  const success = state.status === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-space-sm rounded-lg p-space-sm text-body-md ${
        success ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : "bg-error-container text-on-error-container"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      {state.message}
    </div>
  );
}
