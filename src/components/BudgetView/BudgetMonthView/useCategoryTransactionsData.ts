import { useReferenceData } from "../../../hooks/useReferenceData.js";
import { useTransactionsPager } from "../../../hooks/useTransactionsPager.js";
import type { YearMonth } from "../../../utils/monthRange.js";

export function useCategoryTransactionsData(
  month: YearMonth,
  categoryId: string,
) {
  const transactionsQuery = useTransactionsPager({ month, categoryId });
  const reference = useReferenceData();

  return {
    transactions: transactionsQuery.transactions,
    totalCount: transactionsQuery.totalCount,
    page: transactionsQuery.page,
    setPage: transactionsQuery.setPage,
    pageSize: transactionsQuery.pageSize,
    accountNameById: reference.accountNameById,
    categories: reference.categories,
    categoryNameById: reference.categoryNameById,
    isPlaceholderData: transactionsQuery.isPlaceholderData,
    isLoading:
      (transactionsQuery.isLoading && !transactionsQuery.isPlaceholderData) ||
      reference.isLoading,
    error: transactionsQuery.error ?? reference.error,
  };
}
