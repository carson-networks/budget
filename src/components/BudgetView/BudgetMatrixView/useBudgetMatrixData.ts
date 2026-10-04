import { useMemo } from "react";
import { useAllCategories } from "../../../hooks/useCategories.js";
import { useBudgetsForRange } from "../../../hooks/useBudgets.js";
import { useTransactionTotalsForRange } from "../../../hooks/useTransactionTotals.js";
import type { YearMonth } from "../../../utils/monthRange.js";
import { buildBudgetMatrixData } from "./buildBudgetMatrixData.js";

export function useBudgetMatrixData(months: YearMonth[]) {
  const categories = useAllCategories();
  const budgets = useBudgetsForRange(months[0], months[months.length - 1]);
  const totals = useTransactionTotalsForRange(
    months[0],
    months[months.length - 1],
  );
  const data = useMemo(
    () =>
      buildBudgetMatrixData(
        categories.categories,
        budgets.budgets,
        totals.totals,
        months,
      ),
    [categories.categories, budgets.budgets, totals.totals, months],
  );
  return {
    ...data,
    error: categories.error ?? budgets.error ?? totals.error,
    showFullLoader:
      categories.isLoading || budgets.isLoading || totals.isLoading,
    isRefreshing: budgets.isPlaceholderData || totals.isPlaceholderData,
  };
}
