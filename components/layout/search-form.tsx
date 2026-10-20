import { Search } from "lucide-react";

type SearchFormProps = {
  autoFocus?: boolean;
  className?: string;
};

/** GET form to /buscar (route arrives in Phase 1). */
export function SearchForm({ autoFocus, className = "" }: SearchFormProps) {
  return (
    <form action="/buscar" role="search" className={className}>
      <label className="flex h-11 w-full items-center rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-space-md transition-all focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15">
        <Search className="mr-space-sm size-5 shrink-0 text-on-surface-variant" aria-hidden />
        <span className="sr-only">Buscar productos</span>
        <input
          type="search"
          name="q"
          autoFocus={autoFocus}
          enterKeyHint="search"
          placeholder="Buscar productos, marcas y más..."
          className="w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
        />
      </label>
    </form>
  );
}
