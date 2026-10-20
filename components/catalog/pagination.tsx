import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
};

/** Page numbers around the current one, with gaps: 1 … 4 5 6 … 12. */
export function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const cell = "inline-flex size-touch items-center justify-center rounded-lg text-label-lg";

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginación" className="mt-space-xl flex items-center justify-center gap-space-xs">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${cell} hover:bg-surface-container-low`} aria-label="Página anterior">
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : (
        <span className={`${cell} text-outline-variant`} aria-hidden>
          <ChevronLeft className="size-5" />
        </span>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-on-surface-variant" aria-hidden>
            …
          </span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${cell} bg-primary text-on-primary`}>
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={`${cell} hover:bg-surface-container-low`}>
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={`${cell} hover:bg-surface-container-low`} aria-label="Página siguiente">
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      ) : (
        <span className={`${cell} text-outline-variant`} aria-hidden>
          <ChevronRight className="size-5" />
        </span>
      )}
    </nav>
  );
}
