const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a decimal string amount (e.g. from the API) for display. Non-finite
 * values fall back to the original string.
 */
export function formatCurrency(decimalString: string): string {
  const n = Number.parseFloat(decimalString);
  if (Number.isFinite(n)) {
    return currencyFormatter.format(n);
  }
  return decimalString;
}
