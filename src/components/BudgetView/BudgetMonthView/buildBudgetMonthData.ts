import type {
  Budget,
  Category,
  TransactionTotalsByMonth,
} from "../../../models";
import type { YearMonth } from "../../../utils/monthRange.js";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../../Category/CategoriesView/categorySegments.js";
import { effectiveBudgetForMonth } from "../budgetEffective.js";
import { rollUpBudgetByType } from "../budgetRollups.js";

/** Everything the month view renders, derived from the three raw query results. */
export function buildBudgetMonthData(
  categories: readonly Category[],
  budgets: Budget[],
  totals: TransactionTotalsByMonth | undefined,
  selectedMonth: YearMonth,
) {
  const visibleCategories = categories.filter((c) => !c.isDisabled);
  const segments = sortCategorySegmentsForDisplay(
    buildCategorySegments(visibleCategories),
  );

  const budgetByCategoryId = new Map<string, string>();
  for (const c of visibleCategories) {
    const amount = effectiveBudgetForMonth(budgets, c.id, selectedMonth);
    if (amount !== undefined) budgetByCategoryId.set(c.id, amount);
  }

  const actualByCategoryId = new Map<string, number>();
  const month = totals?.byMonth.find(
    (row) =>
      row.year === selectedMonth.year && row.month === selectedMonth.month,
  );
  for (const row of month?.byCategory ?? []) {
    const n = parseFloat(row.total);
    if (!Number.isNaN(n)) actualByCategoryId.set(row.categoryId, n);
  }

  const monthSummary = rollUpBudgetByType(
    visibleCategories,
    (id) => {
      const raw = budgetByCategoryId.get(id);
      if (raw === undefined) return undefined;
      const n = parseFloat(raw);
      return Number.isNaN(n) ? undefined : n;
    },
    (id) => actualByCategoryId.get(id),
  );

  return { segments, budgetByCategoryId, actualByCategoryId, monthSummary };
}
