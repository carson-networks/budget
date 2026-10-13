import { useReferenceData } from "../../../hooks/useReferenceData.js";
import { useTransactions } from "../../../hooks/useTransactions.js";
import type { YearMonth } from "../../../utils/monthRange.js";

export function useCategoryTransactionsData(
  month: YearMonth,
  categoryId: string,
) {
  const transactionsQuery = useTransactions({ month, categoryId });
  const reference = useReferenceData();

  return {
    transactions: transactionsQuery.transactions,
    totalCount: transactionsQuery.totalCount,
    hasNextPage: transactionsQuery.hasNextPage,
    isFetchingNextPage: transactionsQuery.isFetchingNextPage,
    loadMore: transactionsQuery.loadMore,
    loadMoreError: transactionsQuery.loadMoreError,
    accountNameById: reference.accountNameById,
    categories: reference.categories,
    categoryNameById: reference.categoryNameById,
    isLoading: transactionsQuery.isLoading || reference.isLoading,
    error: transactionsQuery.error ?? reference.error,
  };
}
