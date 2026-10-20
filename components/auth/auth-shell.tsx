import { BadgeCheck, Lock, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

type AuthShellProps = {
  active: "login" | "registro";
  storeName: string;
  next: string;
  children: ReactNode;
};

const perks = [
  { icon: PackageCheck, title: "Sigue tus pedidos", text: "Estado y comprobantes en un solo lugar." },
  { icon: Truck, title: "Compra más rápido", text: "Guarda tus direcciones de envío y facturación." },
  { icon: BadgeCheck, title: "Ofertas para clientes", text: "Entérate primero de promociones y novedades." },
];

/** Login / registro layout: tab switcher card + perks column (Stitch "Iniciar Sesión & Registro"). */
export function AuthShell({ active, storeName, next, children }: AuthShellProps) {
  const qs = next !== "/cuenta" ? `?next=${encodeURIComponent(next)}` : "";
  const tab = (key: AuthShellProps["active"], href: string, label: string) => (
    <Link
      href={`${href}${qs}`}
      aria-current={active === key ? "page" : undefined}
      className={`flex min-h-touch flex-1 items-center justify-center rounded-lg px-space-sm text-label-lg transition-colors ${
        active === key ? "bg-surface-container-lowest text-on-surface shadow-surface-1" : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-10 size-96 rounded-full bg-secondary/10 blur-3xl" aria-hidden />
      <Container className="relative py-space-xl">
        <div className="mb-space-lg flex flex-col justify-between gap-space-sm md:flex-row md:items-end">
          <div>
            <p className="text-label-md tracking-wider text-secondary uppercase">Portal de clientes</p>
            <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Tu cuenta en {storeName}</h1>
          </div>
          <p className="flex w-fit items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-1.5 text-label-md text-on-surface-variant">
            <Lock className="size-4 text-on-tertiary-container" aria-hidden />
            Conexión cifrada
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md shadow-surface-1 md:p-space-lg lg:col-span-7 lg:p-space-xl">
            <nav aria-label="Acceso" className="mb-space-lg flex rounded-xl bg-surface-container-low p-1.5">
              {tab("login", "/login", "Iniciar sesión")}
              {tab("registro", "/registro", "Crear cuenta")}
            </nav>
            {children}
          </div>

          <aside className="space-y-space-md lg:col-span-5">
            <div className="rounded-xl bg-primary p-space-lg text-on-primary">
              <h2 className="text-headline-sm">Beneficios de tu cuenta</h2>
              <ul className="mt-space-md space-y-space-md">
                {perks.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-start gap-space-sm">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-on-primary/10">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-label-lg">{title}</p>
                      <p className="text-body-md text-on-primary/70">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
