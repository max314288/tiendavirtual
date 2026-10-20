import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="min-w-0">
      <ol className="flex items-center gap-1 overflow-x-auto text-label-sm whitespace-nowrap text-on-surface-variant [scrollbar-width:none]">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="inline-flex min-h-8 items-center hover:text-secondary">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-on-surface">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** "/categoria/a/b" for ltree path "a.b". */
export function categoryHref(path: string): string {
  return `/categoria/${path.split(".").join("/")}`;
}
