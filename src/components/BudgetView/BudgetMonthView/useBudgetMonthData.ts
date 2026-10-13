import { useMemo } from "react";
import { useBudgetInputs } from "../../../hooks/useBudgetInputs.js";
import type { YearMonth } from "../../../utils/monthRange.js";
import { buildBudgetMonthData } from "./buildBudgetMonthData.js";

export function useBudgetMonthData(selectedMonth: YearMonth) {
  const { categories, budgets, totals, error } = useBudgetInputs(
    selectedMonth,
    selectedMonth,
  );

  const data = useMemo(
    () =>
      buildBudgetMonthData(
        categories.data ?? [],
        budgets.data ?? [],
        totals.data,
        selectedMonth,
      ),
    [categories.data, budgets.data, totals.data, selectedMonth],
  );

  return {
    ...data,
    showFullLoader:
      categories.isLoading ||
      (budgets.isLoading && !budgets.isPlaceholderData) ||
      (totals.isLoading && !totals.isPlaceholderData),
    error,
  };
}
