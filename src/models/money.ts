const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat(undefined, {
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
export function formatDecimal(decimalString: string): string {
  const n = Number.parseFloat(decimalString);
  if (Number.isFinite(n)) {
    return decimalFormatter.format(n);
  }
  return decimalString;
}

/**
 * Mirrors server UpdateAccount: when starting balance changes,
 * `balance += (newStarting − oldStarting)`.
 */
export function balanceAfterStartingChange(
  currentBalance: string,
  oldStartingBalance: string,
  newStartingBalance: string,
): string {
  if (oldStartingBalance === newStartingBalance) {
    return currentBalance;
  }
  const balance = Number.parseFloat(currentBalance);
  const oldStarting = Number.parseFloat(oldStartingBalance);
  const newStarting = Number.parseFloat(newStartingBalance);
  if (
    !Number.isFinite(balance) ||
    !Number.isFinite(oldStarting) ||
    !Number.isFinite(newStarting)
  ) {
    return currentBalance;
  }
  const next = balance + (newStarting - oldStarting);
  return next.toFixed(2);
}
