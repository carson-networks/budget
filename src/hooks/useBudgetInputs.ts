import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { budgetQueries } from "../queries/budgets.js";
import { categoryQueries } from "../queries/categories.js";
import { transactionQueries } from "../queries/transactions.js";
import type { YearMonth } from "../utils/monthRange.js";

/** The categories, budgets and transaction totals behind a budget view. */
export function useBudgetInputs(start: YearMonth, end: YearMonth) {
  const categories = useInfiniteQuery(categoryQueries.list());
  const budgets = useQuery(budgetQueries.range(start, end));
  const totals = useQuery(transactionQueries.totals(start, end));
  return {
    categories,
    budgets,
    totals,
    error: categories.error ?? budgets.error ?? totals.error,
  };
}
