import Form from "next/form";
import Link from "next/link";
import { serializeCatalogQuery, type CatalogQuery, type SortOption } from "@/lib/catalog/query";
import type { ProductListResult } from "@/lib/catalog/types";
import { formatMoney } from "@/lib/money";

type FilterFormProps = {
  /** Path the form submits to (the current listing). */
  action: string;
  query: CatalogQuery;
  defaultSort: SortOption;
  facets: ProductListResult["facets"];
  currencyCode: string;
  locale: string;
  /** Hide the brand facet on brand pages. */
  showBrands?: boolean;
  /** Distinguishes input ids between the sidebar and the mobile drawer. */
  idPrefix: string;
};

const sectionTitle = "mb-space-sm text-label-lg text-on-surface";
const checkRow = "flex min-h-touch cursor-pointer items-center gap-space-sm text-body-md text-on-surface md:min-h-9";
const checkbox = "size-4 shrink-0 rounded border-outline accent-secondary";
const numberInput =
  "h-11 w-full min-w-0 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-space-sm text-body-md focus:border-secondary focus:ring-2 focus:ring-secondary/15 focus:outline-none";

/** Plain GET form: works without JS; next/form adds client-side navigation. */
export function FilterForm({ action, query, defaultSort, facets, currencyCode, locale, showBrands = true, idPrefix }: FilterFormProps) {
  const clearHref = `${action}${serializeCatalogQuery({ q: query.q, sort: query.sort }, defaultSort)}`;
  const range = facets.priceRange;

  return (
    <Form action={action} className="space-y-space-lg">
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.sort !== defaultSort && <input type="hidden" name="orden" value={query.sort} />}

      {showBrands && facets.brands.length > 0 && (
        <fieldset>
          <legend className={sectionTitle}>Marcas</legend>
          {facets.brands.map((b) => (
            <label key={b.slug} className={`${checkRow} justify-between`}>
              <span className="flex items-center gap-space-sm">
                <input
                  type="checkbox"
                  name="marca"
                  value={b.slug}
                  defaultChecked={query.brands.includes(b.slug)}
                  className={checkbox}
                />
                {b.name}
              </span>
              <span className="text-label-sm text-on-surface-variant">{b.count}</span>
            </label>
          ))}
        </fieldset>
      )}

      <fieldset>
        <legend className={sectionTitle}>Precio</legend>
        {range && (
          <p className="mb-space-sm text-label-sm text-on-surface-variant">
            {formatMoney(range.min, currencyCode, locale)} – {formatMoney(range.max, currencyCode, locale)}
          </p>
        )}
        <div className="flex items-center gap-space-xs">
          <label htmlFor={`${idPrefix}-precio-min`} className="sr-only">
            Precio mínimo
          </label>
          <input
            id={`${idPrefix}-precio-min`}
            type="number"
            name="precio_min"
            inputMode="numeric"
            min={0}
            placeholder="Mín."
            defaultValue={query.priceMin ?? ""}
            className={numberInput}
          />
          <span aria-hidden className="text-on-surface-variant">
            –
          </span>
          <label htmlFor={`${idPrefix}-precio-max`} className="sr-only">
            Precio máximo
          </label>
          <input
            id={`${idPrefix}-precio-max`}
            type="number"
            name="precio_max"
            inputMode="numeric"
            min={0}
            placeholder="Máx."
            defaultValue={query.priceMax ?? ""}
            className={numberInput}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className={sectionTitle}>Calificación mínima</legend>
        {[
          { value: "", label: "Cualquiera" },
          { value: "4", label: "4 o más estrellas" },
          { value: "3", label: "3 o más estrellas" },
        ].map((opt) => (
          <label key={opt.value || "any"} className={checkRow}>
            <input
              type="radio"
              name="rating"
              value={opt.value}
              defaultChecked={String(query.ratingMin ?? "") === opt.value}
              className={checkbox}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={sectionTitle}>Disponibilidad</legend>
        <label className={checkRow}>
          <input type="checkbox" name="stock" value="1" defaultChecked={query.inStock} className={checkbox} />
          Solo con stock
        </label>
        <label className={checkRow}>
          <input type="checkbox" name="oferta" value="1" defaultChecked={query.onSale} className={checkbox} />
          En oferta
        </label>
      </fieldset>

      <div className="flex items-center gap-space-sm">
        <button
          type="submit"
          className="h-11 flex-1 rounded-xl bg-primary px-space-md text-label-lg text-on-primary transition-colors hover:bg-surface-tint"
        >
          Aplicar filtros
        </button>
        <Link
          href={clearHref}
          className="inline-flex h-11 items-center rounded-xl px-space-sm text-label-lg text-secondary hover:underline"
        >
          Limpiar
        </Link>
      </div>
    </Form>
  );
}
