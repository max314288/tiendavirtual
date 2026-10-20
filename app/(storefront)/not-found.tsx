import { SearchX } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SearchForm } from "@/components/layout/search-form";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-16 text-center lg:py-24">
      <SearchX className="mb-space-md size-12 text-on-surface-variant" aria-hidden />
      <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">No encontramos esta página</h1>
      <p className="mt-space-sm max-w-md text-body-lg text-on-surface-variant">
        Puede que el producto ya no esté disponible o que el enlace haya cambiado.
      </p>
      <SearchForm className="mt-space-lg w-full max-w-md" />
      <Link href="/" className="mt-space-md text-label-lg text-secondary hover:underline">
        Volver al inicio
      </Link>
    </Container>
  );
}
