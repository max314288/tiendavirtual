import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth/redirect";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <LoginContent {...props} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: PageProps<"/login">) {
  const [params, store, user] = await Promise.all([searchParams, getStore(), getSessionUser()]);
  const next = safeNextPath([params.next].flat()[0]);
  if (user) redirect(next);

  return (
    <AuthShell active="login" storeName={store.name} next={next}>
      <div className="mb-space-lg">
        <h2 className="text-headline-sm text-on-surface">Bienvenido de vuelta</h2>
        <p className="text-body-md text-on-surface-variant">Ingresa para ver tus pedidos y direcciones.</p>
      </div>
      <LoginForm next={next} />
    </AuthShell>
  );
}
