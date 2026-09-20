import {
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { transactionClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type {
  ListTransactionsCursor,
  ListTransactionsResponse,
} from "../connectRPC/types.js";
import { mapTransaction, type Transaction } from "../models";

const PAGE_SIZE = 50;

export function useAllTransactions() {
  const query = useInfiniteQuery<
    ListTransactionsResponse,
    Error,
    InfiniteData<ListTransactionsResponse>,
    string[],
    ListTransactionsCursor | undefined
  >({
    queryKey: ["transactions"],
    queryFn: async ({ pageParam }) => {
      try {
        return await transactionClient.listTransactions({
          cursor:
            pageParam === undefined
              ? { position: 0, limit: PAGE_SIZE }
              : pageParam,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const transactions: Transaction[] =
    query.data?.pages
      .flatMap((page) => (page.transactions ?? []).filter(Boolean))
      .map(mapTransaction) ?? [];

  return {
    ...query,
    transactions,
  };
}
