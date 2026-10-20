import { ArrowRight, BadgeCheck, FileText, Lock, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { categoryHref } from "@/components/catalog/breadcrumbs";
import { Container } from "@/components/layout/container";
import { ProductGrid } from "@/components/product/product-grid";
import { getCategories, listProducts } from "@/lib/catalog/api";
import { parseCatalogQuery } from "@/lib/catalog/query";
import { getStore } from "@/lib/store/get-store";

const benefits = [
  { icon: Truck, title: "Envíos a todo el Perú", text: "Despacho a Lima y provincias" },
  { icon: BadgeCheck, title: "Garantía de 30 días", text: "Cambios y devoluciones simples" },
  { icon: Lock, title: "Pago 100% seguro", text: "Tarjetas y Yape" },
  { icon: FileText, title: "Boleta o factura", text: "Comprobante electrónico SUNAT" },
];

export default async function HomePage() {
  const [store, categories, popular, latest] = await Promise.all([
    getStore(),
    getCategories(),
    listProducts(parseCatalogQuery({ orden: "populares" })),
    listProducts(parseCatalogQuery({ orden: "novedades" })),
  ]);
  const featuredCategories = categories.filter((c) => c.depth === 0 && c.productCount > 0);
  const { currencyCode, locale } = store;

  return (
    <>
      <section className="bg-surface-container-low">
        <Container className="grid items-center gap-space-xl py-space-xl md:grid-cols-2 md:py-16 lg:py-20">
          <div>
            <p className="mb-space-sm text-label-md tracking-wider text-secondary uppercase">Colección esencial</p>
            <h1 className="text-display-lg-mobile text-on-surface md:text-display-lg">
              Diseño, tecnología y esenciales para el día a día
              <span className="text-secondary">.</span>
            </h1>
            <p className="mt-space-md max-w-xl text-body-lg text-on-surface-variant">
              Productos seleccionados en {store.name}, con envío a todo el Perú, pago seguro y comprobante electrónico.
            </p>
            <div className="mt-space-lg flex flex-col gap-space-sm sm:flex-row">
              <Link
                href="/buscar"
                className="inline-flex h-12 items-center justify-center gap-space-sm rounded-xl bg-primary px-space-lg text-label-lg text-on-primary transition-colors hover:bg-surface-tint"
              >
                Explorar catálogo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/buscar?oferta=1"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest px-space-lg text-label-lg text-on-surface hover:bg-surface"
              >
                Ver ofertas
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-container shadow-surface-1">
            <Image
              src="/mock/catalog/hero.jpg"
              alt="Audífonos y reloj inteligente sobre fondo neutro"
              fill
              preload
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      <section aria-label="Beneficios" className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <Container className="grid grid-cols-2 gap-space-md py-space-lg lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-space-sm">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-secondary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-label-lg text-on-surface">{title}</p>
                <p className="text-body-md text-on-surface-variant">{text}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {featuredCategories.length > 0 && (
        <section className="py-space-xl lg:py-16">
          <Container>
            <h2 className="mb-space-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">Categorías destacadas</h2>
            <ul className="grid grid-cols-2 gap-gutter-mobile md:gap-gutter-tablet lg:grid-cols-4 lg:gap-gutter">
              {featuredCategories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={categoryHref(c.path)}
                    className="group block overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:shadow-surface-2"
                  >
                    <div className="relative aspect-[4/3] bg-surface-container-low">
                      {c.image && (
                        <Image
                          src={c.image.url}
                          alt={c.image.alt}
                          fill
                          sizes="(min-width: 1024px) 25vw, 50vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-space-sm md:p-space-md">
                      <p className="text-title-md text-on-surface group-hover:text-secondary">{c.name}</p>
                      <p className="text-body-md text-on-surface-variant">{c.productCount} productos</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="bg-surface-container-low/40 py-space-xl lg:py-16">
        <Container>
          <div className="mb-space-lg flex items-end justify-between gap-space-md">
            <h2 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Los más populares</h2>
            <Link href="/buscar" className="shrink-0 text-label-lg text-secondary hover:underline">
              Ver todo
            </Link>
          </div>
          <ProductGrid products={popular.items.slice(0, 8)} currencyCode={currencyCode} locale={locale} />
        </Container>
      </section>

      <section className="py-space-xl lg:py-16">
        <Container>
          <div className="mb-space-lg flex items-end justify-between gap-space-md">
            <h2 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Novedades</h2>
            <Link href="/buscar?orden=novedades" className="shrink-0 text-label-lg text-secondary hover:underline">
              Ver todo
            </Link>
          </div>
          <ProductGrid products={latest.items.slice(0, 4)} currencyCode={currencyCode} locale={locale} />
        </Container>
      </section>
    </>
  );
}
