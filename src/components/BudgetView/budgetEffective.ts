import { compareYearMonth, type YearMonth } from "../../utils/monthRange";

type SparseBudgetRow = {
  categoryId: string;
  year: number;
  month: number;
  amount: string;
};

/**
 * Latest stored budget for the category on or before `target` (carry-forward).
 * Returns undefined if there is no row at or before that month.
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

/** Map `${categoryId}|${year}|${month}` → carried amount for each month in `months`. */
export function buildEffectiveBudgetKeyMap(
  sparse: SparseBudgetRow[],
  categoryIds: string[],
  months: YearMonth[],
): Map<string, string> {
  const m = new Map<string, string>();
  for (const cid of categoryIds) {
    for (const ym of months) {
      const amt = effectiveBudgetForMonth(sparse, cid, ym);
      if (amt !== undefined) {
        m.set(`${cid}|${ym.year}|${ym.month}`, amt);
      }
    }
  }
  return m;
}
