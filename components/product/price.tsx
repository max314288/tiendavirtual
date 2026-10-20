import { discountPercent } from "@/lib/catalog/pricing";
import type { Money } from "@/lib/catalog/types";
import { formatMoney } from "@/lib/money";

type PriceProps = {
  price: Money;
  compareAtPrice: Money | null;
  currencyCode: string;
  locale: string;
  size?: "md" | "lg";
  /** Prefix for products whose variants have different prices. */
  fromLabel?: boolean;
};

export function Price({ price, compareAtPrice, currencyCode, locale, size = "md", fromLabel }: PriceProps) {
  const hasDiscount = discountPercent(price, compareAtPrice) !== null;
  return (
    <span className="flex flex-wrap items-baseline gap-x-space-sm gap-y-0.5">
      <span className={`font-bold tracking-tight text-on-surface ${size === "lg" ? "text-headline-lg" : "text-headline-sm"}`}>
        {fromLabel && <span className="mr-1 text-label-md font-normal text-on-surface-variant">Desde</span>}
        {formatMoney(price, currencyCode, locale)}
      </span>
      {hasDiscount && compareAtPrice && (
        <s className="text-body-md text-on-surface-variant">
          <span className="sr-only">Precio anterior: </span>
          {formatMoney(compareAtPrice, currencyCode, locale)}
        </s>
      )}
    </span>
  );
}
