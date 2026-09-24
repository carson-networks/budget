const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const amountFormatter = new Intl.NumberFormat(undefined, {
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

/**
 * Formats a decimal string with grouping and two fraction digits, without a
 * currency symbol (for editable amount fields).
 */
export function formatAmount(decimalString: string): string {
  const n = Number.parseFloat(decimalString);
  if (Number.isFinite(n)) {
    return amountFormatter.format(n);
  }
  return decimalString;
}
