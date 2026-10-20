import { Container } from "@/components/layout/container";

const block = "animate-pulse rounded-lg bg-surface-container-low";

export function ProductGridSkeleton({ count = 8, layout = "catalog" }: { count?: number; layout?: "full" | "catalog" }) {
  const cols = layout === "full" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 md:grid-cols-3 2xl:grid-cols-4";
  return (
    <ul className={`grid gap-gutter-mobile md:gap-gutter-tablet lg:gap-gutter ${cols}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="space-y-space-sm">
          <div className={`${block} aspect-square rounded-xl`} />
          <div className={`${block} h-3 w-1/3`} />
          <div className={`${block} h-4 w-4/5`} />
          <div className={`${block} h-5 w-1/2`} />
        </li>
      ))}
    </ul>
  );
}

export function CatalogSkeleton() {
  return (
    <Container className="py-space-md lg:py-space-lg" aria-busy="true">
      <span className="sr-only">Cargando productos…</span>
      <div className={`${block} mb-space-md h-4 w-48`} />
      <div className="flex gap-gutter">
        <div className={`${block} hidden h-[32rem] w-72 shrink-0 rounded-xl lg:block`} />
        <div className="min-w-0 flex-1 space-y-space-md">
          <div className={`${block} h-9 w-64`} />
          <ProductGridSkeleton />
        </div>
      </div>
    </Container>
  );
}
