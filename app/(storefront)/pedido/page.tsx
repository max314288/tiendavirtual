import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { LookupForm } from "@/components/orders/lookup-form";

export const metadata: Metadata = { title: "Rastrear mi pedido" };

export default function TrackOrderPage() {
  return (
    <Container className="py-space-xl lg:py-16">
      <div className="mx-auto max-w-md">
        <PackageSearch className="mb-space-md size-10 text-secondary" aria-hidden />
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Rastrear mi pedido</h1>
        <p className="mt-space-xs mb-space-lg text-body-lg text-on-surface-variant">
          Ingresa el número de pedido y el correo con el que compraste.
        </p>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:p-space-lg">
          <LookupForm />
        </div>
        <p className="mt-space-md text-center text-body-md text-on-surface-variant">
          ¿Tienes cuenta?{" "}
          <Link href="/cuenta/pedidos" className="text-secondary hover:underline">
            Mira todos tus pedidos
          </Link>
        </p>
      </div>
    </Container>
  );
}
