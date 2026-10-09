import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { budgetQueries } from "../../../queries/budgets.js";
import { categoryQueries } from "../../../queries/categories.js";
import { transactionQueries } from "../../../queries/transactions.js";
import type { YearMonth } from "../../../utils/monthRange.js";
import { buildBudgetMatrixData } from "./buildBudgetMatrixData.js";

export function useBudgetMatrixData(months: YearMonth[]) {
  const start = months[0];
  const end = months[months.length - 1];
  const categories = useInfiniteQuery(categoryQueries.list());
  const budgets = useQuery(budgetQueries.range(start, end));
  const totals = useQuery(transactionQueries.totals(start, end));
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
    error: categories.error ?? budgets.error ?? totals.error,
    showFullLoader:
      categories.isLoading || budgets.isLoading || totals.isLoading,
    isRefreshing: budgets.isPlaceholderData || totals.isPlaceholderData,
  };
}
