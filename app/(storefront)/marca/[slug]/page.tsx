import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getBrand, listProducts } from "@/lib/catalog/api";
import { parseCatalogQuery } from "@/lib/catalog/query";
import { getStore } from "@/lib/store/get-store";

type Props = PageProps<"/marca/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await getBrand((await params).slug);
  return brand ? { title: brand.name } : {};
}

export default function BrandPage(props: Props) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <BrandContent {...props} />
    </Suspense>
  );
}

async function BrandContent({ params, searchParams }: Props) {
  const [{ slug }, rawQuery, store] = await Promise.all([params, searchParams, getStore()]);
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const query = parseCatalogQuery(rawQuery);
  const result = await listProducts(query, { brandSlug: brand.slug });

  return (
    <CatalogView
      store={store}
      basePath={`/marca/${brand.slug}`}
      title={brand.name}
      breadcrumb={[{ label: "Inicio", href: "/" }, { label: "Marcas" }, { label: brand.name }]}
      query={query}
      defaultSort="populares"
      result={result}
      showBrandFacet={false}
    />
  );
}
