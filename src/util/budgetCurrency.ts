/**
 * Shared parsing/formatting for budget amount fields (table + modal).
 * Values sent to the API are plain decimal strings, e.g. "1234.56".
 */

export function normalizeBudgetInput(s: string): string {
  return s
    .trim()
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();
}

export function parseBudgetAmount(s: string): number | null {
  const norm = normalizeBudgetInput(s);
  if (norm === "" || norm === "-" || norm === ".") {
    return null;
  }
  const n = parseFloat(norm);
  return Number.isFinite(n) ? n : null;
}

/** Pretty-print the numeric part for display next to a $ prefix (commas, up to 2 decimals). */
export function formatUsdNumberPart(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
