import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  transactionQueries,
  type TransactionsFilter,
} from "../queries/transactions.js";

/**
 * Transactions for `filter`, loaded a batch at a time via {@link loadMore}.
 * A failed `loadMore` surfaces as `loadMoreError` and leaves `error` (the
 * initial-load failure) null, so the rows already on screen stay visible.
 */
export function useTransactions(
  filter: TransactionsFilter = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  const query = useInfiniteQuery({
    ...transactionQueries.list(filter),
    enabled,
  });
  const { fetchNextPage } = query;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  return {
    ...query,
    transactions: query.data?.transactions ?? [],
    totalCount: query.data?.totalCount ?? 0,
    loadMore,
    error: query.isFetchNextPageError ? null : query.error,
    loadMoreError: query.isFetchNextPageError ? query.error : null,
  };
}
