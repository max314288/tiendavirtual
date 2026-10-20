"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, PasswordField, SubmitButton, TextField } from "@/components/ui/form";
import { loginAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/forms";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-space-md">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="nombre@correo.com"
        defaultValue={state.values?.email}
        errors={errors.email}
      />
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="current-password"
        required
        placeholder="Ingresa tu contraseña"
        errors={errors.password}
      />
      <SubmitButton pendingLabel="Ingresando…" variant="secondary" className="w-full">
        Iniciar sesión
      </SubmitButton>
      <p className="text-center text-body-md text-on-surface-variant">
        ¿No tienes cuenta?{" "}
        <Link href={`/registro${next !== "/cuenta" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-secondary hover:underline">
          Crea una aquí
        </Link>
      </p>
    </form>
  );
}
