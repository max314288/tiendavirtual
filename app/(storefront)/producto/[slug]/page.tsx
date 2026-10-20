import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs, categoryHref } from "@/components/catalog/breadcrumbs";
import { ProductGridSkeleton } from "@/components/catalog/catalog-skeleton";
import { Container } from "@/components/layout/container";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductView } from "@/components/product/product-view";
import { ProductReviews } from "@/components/reviews/product-reviews";
import { getProduct, getRelatedProducts } from "@/lib/catalog/api";
import type { ProductDetail } from "@/lib/catalog/types";
import { getStore } from "@/lib/store/get-store";

type Props = PageProps<"/producto/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription,
    openGraph: product.featuredImage ? { images: [product.featuredImage.url] } : undefined,
  };
}

export default function ProductPage(props: Props) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent {...props} />
    </Suspense>
  );
}

async function ProductContent({ params, searchParams }: Props) {
  const [{ slug }, rawQuery, store] = await Promise.all([params, searchParams, getStore()]);
  const product = await getProduct(slug);
  if (!product) notFound();
  const variantId = [rawQuery.variante].flat()[0] ?? null;

  return (
    <>
      <div className="bg-surface-container-low">
        <Container className="py-space-sm">
          <Breadcrumbs
            items={[
              { label: "Inicio", href: "/" },
              ...product.breadcrumb.map((c) => ({ label: c.name, href: categoryHref(c.path) })),
              { label: product.name },
            ]}
          />
        </Container>
      </div>

      <Container className="py-space-lg lg:py-space-xl">
        <ProductView product={product} initialVariantId={variantId} currencyCode={store.currencyCode} locale={store.locale} />
      </Container>

      <ProductDetails product={product} />

      <Suspense
        fallback={
          <Container className="py-space-xl">
            <div className="h-48 animate-pulse rounded-xl bg-surface-container-low" />
          </Container>
        }
      >
        <ProductReviews product={product} locale={store.locale} timezone={store.timezone} />
      </Suspense>

      <Suspense
        fallback={
          <Container className="py-space-xl">
            <ProductGridSkeleton count={4} layout="full" />
          </Container>
        }
      >
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}

function ProductDetails({ product }: { product: ProductDetail }) {
  return (
    <section aria-labelledby="detalles" className="bg-surface-container-low/60 py-space-xl">
      <Container className="grid gap-space-xl lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <h2 id="detalles" className="mb-space-md text-headline-md text-on-surface">
            Descripción
          </h2>
          <p className="text-body-lg text-on-surface-variant">{product.description}</p>
        </div>
        {product.attributes.length > 0 && (
          <div className="lg:col-span-7">
            <h2 className="mb-space-md text-headline-md text-on-surface">Especificaciones</h2>
            <dl className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
              {product.attributes.map((a) => (
                <div key={a.label} className="rounded-xl bg-surface-container-lowest p-space-md">
                  <dt className="text-label-sm tracking-wide text-on-surface-variant uppercase">{a.label}</dt>
                  <dd className="mt-1 text-title-md text-on-surface">{a.value}</dd>
                  {a.detail && <dd className="mt-1 text-body-md text-on-surface-variant">{a.detail}</dd>}
                </div>
              ))}
            </dl>
          </div>
        )}
      </Container>
    </section>
  );
}

async function RelatedProducts({ product }: { product: ProductDetail }) {
  const [related, store] = await Promise.all([getRelatedProducts(product), getStore()]);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="relacionados" className="py-space-xl lg:py-16">
      <Container>
        <h2 id="relacionados" className="mb-space-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
          También te puede interesar
        </h2>
        <ProductGrid products={related} currencyCode={store.currencyCode} locale={store.locale} />
      </Container>
    </section>
  );
}

function ProductSkeleton() {
  const block = "animate-pulse rounded-lg bg-surface-container-low";
  return (
    <Container className="py-space-lg lg:py-space-xl" aria-busy="true">
      <span className="sr-only">Cargando producto…</span>
      <div className="grid gap-space-xl lg:grid-cols-12 lg:gap-12">
        <div className={`${block} aspect-square rounded-xl md:aspect-[4/3] lg:col-span-7`} />
        <div className="space-y-space-md lg:col-span-5">
          <div className={`${block} h-4 w-1/3`} />
          <div className={`${block} h-10 w-4/5`} />
          <div className={`${block} h-5 w-full`} />
          <div className={`${block} h-20 w-full rounded-xl`} />
          <div className={`${block} h-12 w-2/3`} />
        </div>
      </div>
    </Container>
  );
}
