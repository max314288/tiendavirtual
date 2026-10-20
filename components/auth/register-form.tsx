"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CheckboxField, FormMessage, PasswordField, SubmitButton, TextField } from "@/components/ui/form";
import { registerAction } from "@/lib/auth/actions";
import { passwordStrength } from "@/lib/auth/password-strength";
import { initialFormState } from "@/lib/forms";

const strengthCopy = ["Muy corta", "Débil", "Aceptable", "Fuerte"] as const;

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, initialFormState);
  const [password, setPassword] = useState("");
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const strength = passwordStrength(password);

  if (state.status === "success") {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} noValidate className="space-y-space-md">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <TextField
          label="Nombres"
          name="firstName"
          autoComplete="given-name"
          required
          defaultValue={v.firstName}
          errors={errors.firstName}
        />
        <TextField
          label="Apellidos"
          name="lastName"
          autoComplete="family-name"
          required
          defaultValue={v.lastName}
          errors={errors.lastName}
        />
      </div>
      <TextField
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="nombre@correo.com"
        defaultValue={v.email}
        errors={errors.email}
      />
      <TextField
        label="Celular"
        name="phone"
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        optional
        placeholder="987 654 321"
        hint="Para coordinar tus entregas."
        defaultValue={v.phone}
        errors={errors.phone}
      />
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          required
          placeholder="Mínimo 8 caracteres"
          onChange={(e) => setPassword(e.target.value)}
          errors={errors.password}
        />
        <PasswordField
          label="Confirmar contraseña"
          name="passwordConfirm"
          autoComplete="new-password"
          required
          placeholder="Repite tu contraseña"
          errors={errors.passwordConfirm}
        />
      </div>
      <div className="space-y-1.5 rounded-lg bg-surface-container-low p-space-sm" aria-live="polite">
        <div className="flex items-center justify-between text-label-sm">
          <span className="text-on-surface-variant">Seguridad de la contraseña</span>
          <span className="text-on-surface">{strengthCopy[strength]}</span>
        </div>
        <div className="flex h-1.5 gap-1" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`flex-1 rounded-full ${strength >= n ? "bg-secondary" : "bg-surface-container-highest"}`} />
          ))}
        </div>
        <p className="text-label-sm font-normal text-on-surface-variant">Usa 8 o más caracteres con letras y números.</p>
      </div>
      <div>
        <CheckboxField name="acceptsMarketing" defaultChecked={v.acceptsMarketing === "on"}>
          Quiero recibir ofertas y novedades por correo.
        </CheckboxField>
        <CheckboxField name="acceptsTerms" required defaultChecked={v.acceptsTerms === "on"} errors={errors.acceptsTerms}>
          He leído y acepto los{" "}
          <Link href="/terminos" className="text-secondary underline">
            Términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="text-secondary underline">
            Política de privacidad
          </Link>
          .
        </CheckboxField>
      </div>
      <SubmitButton pendingLabel="Creando cuenta…" className="w-full">
        Crear cuenta
      </SubmitButton>
      <p className="text-center text-body-md text-on-surface-variant">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/login${next !== "/cuenta" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-secondary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
