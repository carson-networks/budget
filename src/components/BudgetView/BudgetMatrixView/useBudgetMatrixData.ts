import { useMemo } from "react";
import { useBudgetInputs } from "../../../hooks/useBudgetInputs.js";
import type { YearMonth } from "../../../utils/monthRange.js";
import { buildBudgetMatrixData } from "./buildBudgetMatrixData.js";

export function useBudgetMatrixData(months: YearMonth[]) {
  const start = months[0];
  const end = months[months.length - 1];
  const { categories, budgets, totals, error } = useBudgetInputs(start, end);
  const data = useMemo(
    () =>
      buildBudgetMatrixData(
        categories.data ?? [],
        budgets.data ?? [],
        totals.data,
        months,
      ),
    [categories.data, budgets.data, totals.data, months],
  );
  return {
    ...data,
    error,
    showFullLoader:
      categories.isLoading || budgets.isLoading || totals.isLoading,
    isRefreshing: budgets.isPlaceholderData || totals.isPlaceholderData,
  };
}
