import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { categoryHref } from "@/components/catalog/breadcrumbs";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getCategories, getCategoryByPath, listProducts } from "@/lib/catalog/api";
import { parseCatalogQuery } from "@/lib/catalog/query";
import { getStore } from "@/lib/store/get-store";

type Props = PageProps<"/categoria/[...path]">;

const toLtree = (segments: string[]) => segments.map(decodeURIComponent).join(".");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryByPath(toLtree((await params).path));
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default function CategoryPage(props: Props) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}

async function CategoryContent({ params, searchParams }: Props) {
  const [{ path }, rawQuery, store, categories] = await Promise.all([params, searchParams, getStore(), getCategories()]);
  const ltree = toLtree(path);
  const category = categories.find((c) => c.path === ltree);
  if (!category) notFound();

  const query = parseCatalogQuery(rawQuery);
  const result = await listProducts(query, { categoryPath: category.path });

  const segments = category.path.split(".");
  const ancestors = segments.slice(0, -1).map((_, i) => {
    const p = segments.slice(0, i + 1).join(".");
    return { label: categories.find((c) => c.path === p)?.name ?? p, href: categoryHref(p) };
  });

  return (
    <CatalogView
      store={store}
      basePath={categoryHref(category.path)}
      title={category.name}
      description={category.description}
      breadcrumb={[{ label: "Inicio", href: "/" }, ...ancestors, { label: category.name }]}
      query={query}
      defaultSort="populares"
      result={result}
      subcategories={categories.filter((c) => c.parentId === category.id && c.productCount > 0)}
    />
  );
}
