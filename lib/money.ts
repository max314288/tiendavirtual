const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats a money amount. Amounts travel as decimal strings (numeric(12,2) in
 * the database) and are only converted to a number for display.
 */
export function formatMoney(amount: string | number, currencyCode: string, locale: string): string {
  const key = `${locale}|${currencyCode}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(typeof amount === "string" ? Number(amount) : amount);
}
