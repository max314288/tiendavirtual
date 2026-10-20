import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getSessionUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth/redirect";
import { getStore } from "@/lib/store/get-store";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default function RegisterPage(props: PageProps<"/registro">) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <RegisterContent {...props} />
    </Suspense>
  );
}

async function RegisterContent({ searchParams }: PageProps<"/registro">) {
  const [params, store, user] = await Promise.all([searchParams, getStore(), getSessionUser()]);
  const next = safeNextPath([params.next].flat()[0]);
  if (user) redirect(next);

  return (
    <AuthShell active="registro" storeName={store.name} next={next}>
      <div className="mb-space-lg">
        <h2 className="text-headline-sm text-on-surface">Crea tu cuenta</h2>
        <p className="text-body-md text-on-surface-variant">Te toma menos de un minuto.</p>
      </div>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
