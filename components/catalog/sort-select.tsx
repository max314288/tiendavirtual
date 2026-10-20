"use client";

import { useRouter } from "next/navigation";
import { SORT_OPTIONS, type SortOption } from "@/lib/catalog/query";

type SortSelectProps = {
  /** URL for each sort option, built on the server (keeps current filters, resets page). */
  hrefs: Record<SortOption, string>;
  value: SortOption;
  /** "relevancia" only makes sense with search text. */
  options?: SortOption[];
};

export function SortSelect({ hrefs, value, options }: SortSelectProps) {
  const router = useRouter();
  const visible = SORT_OPTIONS.filter((o) => !options || options.includes(o.value));

  return (
    <label className="flex h-11 items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm text-label-md text-on-surface-variant">
      <span className="hidden sm:inline">Ordenar por:</span>
      <span className="sr-only sm:hidden">Ordenar por</span>
      <select
        value={value}
        onChange={(e) => router.push(hrefs[e.target.value as SortOption])}
        className="h-full cursor-pointer bg-transparent pr-1 text-label-md text-on-surface focus:outline-none"
      >
        {visible.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
