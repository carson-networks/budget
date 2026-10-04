import { compareYearMonth, type YearMonth } from "../../utils/monthRange.js";

type SparseBudgetRow = {
  categoryId: string;
  year: number;
  month: number;
  amount: string;
};

/**
 * Latest stored budget for the category on or before `target` (carry-forward).
 * Returns undefined if there is no row at or before that month.
 *
 * ListBudgets already returns a starting row per category (latest ≤ range
 * start); this still applies when multiple sparse rows are present.
 */
export function effectiveBudgetForMonth(
  sparse: SparseBudgetRow[],
  categoryId: string,
  target: YearMonth,
): string | undefined {
  let best: SparseBudgetRow | null = null;
  for (const b of sparse) {
    if (b.categoryId !== categoryId) continue;
    const bm: YearMonth = { year: b.year, month: b.month };
    if (compareYearMonth(bm, target) > 0) continue;
    if (
      !best ||
      compareYearMonth(bm, { year: best.year, month: best.month }) > 0
    ) {
      best = b;
    }
  }
  return best?.amount;
}
