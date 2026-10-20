import { CreditCard, FileText, Headset, ShieldCheck, Wallet } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import type { Store } from "@/lib/store/types";
import { Container } from "./container";
import { Logo } from "./logo";

const helpLinks = [
  { label: "Preguntas frecuentes", href: "/ayuda" },
  { label: "Rastrear mi pedido", href: "/pedido" },
  { label: "Política de devoluciones", href: "/ayuda/devoluciones" },
  { label: "Libro de reclamaciones", href: "/libro-de-reclamaciones" },
  { label: "Términos y condiciones", href: "/terminos" },
];

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer({ store }: { store: Store }) {
  const year = await currentYear();

  return (
    <footer className="mt-space-xl border-t border-outline-variant/40 bg-surface-container-lowest pt-space-xl pb-space-xl lg:pt-margin">
      <Container>
        <div className="mb-space-xl grid grid-cols-1 gap-space-xl md:grid-cols-2 lg:mb-margin lg:grid-cols-3 lg:gap-margin">
          <div className="space-y-space-md">
            <Logo branding={store.branding} storeName={store.name} />
            <p className="max-w-sm text-body-md text-on-surface-variant">
              Productos seleccionados con envío a todo el Perú y atención personalizada.
            </p>
            <p className="flex items-center gap-space-sm text-label-sm text-on-surface-variant">
              <Headset className="size-[18px]" aria-hidden />
              Atención lun–vie de 9:00 a 20:00
            </p>
          </div>

          <nav aria-label="Explorar catálogo">
            <h2 className="mb-space-md text-title-md text-on-surface">Explorar catálogo</h2>
            <ul className="space-y-space-xs text-body-md text-on-surface-variant">
              {store.navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex min-h-touch items-center hover:text-on-surface md:min-h-0 md:py-1">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Atención y ayuda">
            <h2 className="mb-space-md text-title-md text-on-surface">Atención y ayuda</h2>
            <ul className="space-y-space-xs text-body-md text-on-surface-variant">
              {helpLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex min-h-touch items-center hover:text-on-surface md:min-h-0 md:py-1">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-space-md border-t border-outline-variant/30 pt-space-lg md:flex-row">
          <p className="text-center text-body-md text-on-surface-variant md:text-left">
            © {year} {store.name}. Todos los derechos reservados.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-space-md gap-y-space-xs text-label-sm text-on-surface-variant">
            <li className="flex items-center gap-space-xs">
              <CreditCard className="size-[18px]" aria-hidden />
              Visa / Mastercard
            </li>
            <li className="flex items-center gap-space-xs">
              <Wallet className="size-[18px]" aria-hidden />
              Yape
            </li>
            <li className="flex items-center gap-space-xs">
              <FileText className="size-[18px]" aria-hidden />
              Boleta o factura electrónica
            </li>
            <li className="flex items-center gap-space-xs">
              <ShieldCheck className="size-[18px]" aria-hidden />
              Pago seguro
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
