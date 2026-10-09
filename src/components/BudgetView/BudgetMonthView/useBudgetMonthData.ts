import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { budgetQueries } from "../../../queries/budgets.js";
import { categoryQueries } from "../../../queries/categories.js";
import { transactionQueries } from "../../../queries/transactions.js";
import type { YearMonth } from "../../../utils/monthRange.js";
import { buildBudgetMonthData } from "./buildBudgetMonthData.js";

export function useBudgetMonthData(selectedMonth: YearMonth) {
  const categories = useInfiniteQuery(categoryQueries.list());
  const budgets = useQuery(budgetQueries.range(selectedMonth, selectedMonth));
  const totals = useQuery(
    transactionQueries.totals(selectedMonth, selectedMonth),
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
    error: budgets.error ?? totals.error,
  };
}
