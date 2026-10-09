import { useMemo } from "react";
import { useAllAccounts } from "../../../hooks/useAccounts.js";
import { useAllCategories } from "../../../hooks/useCategories.js";
import {
  TRANSACTIONS_PAGE_SIZE,
  useAllTransactions,
} from "../../../hooks/useTransactions.js";
import type { YearMonth } from "../../../utils/monthRange.js";

export function useMonthTransactionsData(
  month: YearMonth,
  categoryId: string | undefined,
) {
  const transactionsQuery = useAllTransactions(TRANSACTIONS_PAGE_SIZE, {
    month,
    categoryId,
  });
  const accountsQuery = useAllAccounts();
  const categoriesQuery = useAllCategories();

  const accountNameById = useMemo(
    () => new Map(accountsQuery.accounts.map((a) => [a.id, a.name])),
    [accountsQuery.accounts],
  );
  const categoryNameById = useMemo(
    () => new Map(categoriesQuery.categories.map((c) => [c.id, c.name])),
    [categoriesQuery.categories],
  );

  return {
    transactions: transactionsQuery.transactions,
    totalCount: transactionsQuery.totalCount,
    page: transactionsQuery.page,
    setPage: transactionsQuery.setPage,
    pageSize: transactionsQuery.pageSize,
    accountNameById,
    categoryNameById,
    categoryName: categoryId ? categoryNameById.get(categoryId) : undefined,
    isLoading:
      (transactionsQuery.isLoading && !transactionsQuery.isPlaceholderData) ||
      accountsQuery.isLoading ||
      categoriesQuery.isLoading,
    error:
      transactionsQuery.error ?? accountsQuery.error ?? categoriesQuery.error,
  };
}
