import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { CatalogView } from "@/components/catalog/catalog-view";
import { listProducts } from "@/lib/catalog/api";
import { parseCatalogQuery, type CatalogQuery } from "@/lib/catalog/query";
import { getStore } from "@/lib/store/get-store";

type Props = PageProps<"/buscar">;

export const metadata: Metadata = {
  title: "Buscar",
  robots: { index: false },
};

function titleFor(query: CatalogQuery) {
  if (query.q) return `Resultados para “${query.q}”`;
  if (query.onSale) return "Ofertas";
  if (query.sort === "novedades") return "Novedades";
  return "Todos los productos";
}

export default function SearchPage(props: Props) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <SearchContent {...props} />
    </Suspense>
  );
}

async function SearchContent({ searchParams }: Props) {
  const [rawQuery, store] = await Promise.all([searchParams, getStore()]);
  const hasText = Boolean([rawQuery.q].flat()[0]?.trim());
  const defaultSort = hasText ? "relevancia" : "populares";
  const query = parseCatalogQuery(rawQuery, defaultSort);
  const result = await listProducts(query);
  const title = titleFor(query);

  return (
    <CatalogView
      store={store}
      basePath="/buscar"
      title={title}
      breadcrumb={[{ label: "Inicio", href: "/" }, { label: query.q ? "Búsqueda" : title }]}
      query={query}
      defaultSort={defaultSort}
      result={result}
    />
  );
}
