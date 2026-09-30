import { useMemo } from "react";
import { useAllCategories } from "../../../hooks/useCategories.js";
import { useBudgetsForRange } from "../../../hooks/useBudgets.js";
import { useTransactionTotalsForRange } from "../../../hooks/useTransactionTotals.js";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../../Category/CategoriesView/categorySegments.js";
import type { YearMonth } from "../../../utils/monthRange.js";
import { effectiveBudgetForMonth } from "../budgetEffective.js";
import { rollUpBudgetByType } from "../budgetRollups.js";

export function useBudgetMonthData(selectedMonth: YearMonth) {
  const { categories, isLoading: categoriesLoading } = useAllCategories();
  const {
    budgets,
    isLoading: budgetsLoading,
    error: budgetsError,
    isPlaceholderData: budgetsPlaceholder,
  } = useBudgetsForRange(selectedMonth, selectedMonth);
  const {
    totals,
    isLoading: totalsLoading,
    error: totalsError,
    isPlaceholderData: totalsPlaceholder,
  } = useTransactionTotalsForRange(selectedMonth, selectedMonth);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.isDisabled),
    [categories],
  );

  const segments = useMemo(
    () =>
      sortCategorySegmentsForDisplay(buildCategorySegments(visibleCategories)),
    [visibleCategories],
  );

  const budgetByCategoryId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of visibleCategories) {
      const amt = effectiveBudgetForMonth(budgets, c.id, selectedMonth);
      if (amt !== undefined) m.set(c.id, amt);
    }
    return m;
  }, [budgets, selectedMonth, visibleCategories]);

  const actualByCategoryId = useMemo(() => {
    const m = new Map<string, number>();
    const month = totals?.byMonth.find(
      (row) =>
        row.year === selectedMonth.year && row.month === selectedMonth.month,
    );
    for (const row of month?.byCategory ?? []) {
      const n = parseFloat(row.total);
      if (!Number.isNaN(n)) m.set(row.categoryId, n);
    }
    return m;
  }, [totals, selectedMonth]);

  const monthSummary = useMemo(
    () =>
      rollUpBudgetByType(
        visibleCategories,
        (id) => {
          const raw = budgetByCategoryId.get(id);
          if (raw === undefined) return undefined;
          const n = parseFloat(raw);
          return Number.isNaN(n) ? undefined : n;
        },
        (id) => actualByCategoryId.get(id),
      ),
    [visibleCategories, budgetByCategoryId, actualByCategoryId],
  );

  const showFullLoader =
    categoriesLoading ||
    (budgetsLoading && !budgetsPlaceholder) ||
    (totalsLoading && !totalsPlaceholder);

  const error = budgetsError ?? totalsError;

  return {
    segments,
    budgetByCategoryId,
    actualByCategoryId,
    monthSummary,
    showFullLoader,
    error,
  };
}
