import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTransactionsPager } from "../../../hooks/useTransactionsPager.js";
import { accountQueries } from "../../../queries/accounts.js";
import { categoryQueries } from "../../../queries/categories.js";
import type { Category } from "../../../models";
import type { YearMonth } from "../../../utils/monthRange.js";
import { nameById } from "../../../utils/nameById.js";

const NO_CATEGORIES: Category[] = [];

export function useCategoryTransactionsData(
  month: YearMonth,
  categoryId: string,
) {
  const transactionsQuery = useTransactionsPager({ month, categoryId });
  const accountsQuery = useInfiniteQuery(accountQueries.list());
  const categoriesQuery = useInfiniteQuery(categoryQueries.list());
  const accounts = accountsQuery.data;
  const categories = categoriesQuery.data;

  const accountNameById = useMemo(() => nameById(accounts ?? []), [accounts]);
  const categoryNameById = useMemo(
    () => nameById(categories ?? []),
    [categories],
  );

  return {
    transactions: transactionsQuery.transactions,
    totalCount: transactionsQuery.totalCount,
    page: transactionsQuery.page,
    setPage: transactionsQuery.setPage,
    pageSize: transactionsQuery.pageSize,
    accountNameById,
    categories: categories ?? NO_CATEGORIES,
    categoryNameById,
    isPlaceholderData: transactionsQuery.isPlaceholderData,
    isLoading:
      (transactionsQuery.isLoading && !transactionsQuery.isPlaceholderData) ||
      accountsQuery.isLoading ||
      categoriesQuery.isLoading,
    error:
      transactionsQuery.error ?? accountsQuery.error ?? categoriesQuery.error,
  };
}
