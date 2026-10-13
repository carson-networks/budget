import {
  infiniteQueryOptions,
  keepPreviousData,
  mutationOptions,
  queryOptions,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { transactionClient } from "../connectRPC/connect.js";
import type { ListTransactionsResponse } from "../connectRPC/types.js";
import { mapGetTransactionTotalsResponse, mapTransaction } from "../models";
import type { YearMonth } from "../utils/monthRange.js";
import { invalidatesOnSettled } from "./invalidate.js";
import { patchQueries } from "./optimistic.js";
import { rpc } from "./rpc.js";

/** Rows fetched per request while scrolling through a transaction list. */
export const TRANSACTIONS_PAGE_SIZE = 25;

export type TransactionsFilter = {
  accountId?: string;
  categoryId?: string;
  month?: YearMonth;
};

type TransactionsCursor = {
  position: number;
  limit: number;
  maxCreationTime?: Timestamp;
};

export function definedFilter({
  accountId,
  categoryId,
  month,
}: TransactionsFilter): TransactionsFilter {
  return {
    ...(accountId === undefined ? {} : { accountId }),
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(month === undefined
      ? {}
      : { month: { year: month.year, month: month.month } }),
  };
}

export const transactionQueries = {
  all: () => ["transactions"] as const,
  lists: () => [...transactionQueries.all(), "list"] as const,

  /**
   * Transactions for `filter`, newest first, fetched `TRANSACTIONS_PAGE_SIZE`
   * rows at a time (offset/`limit`) and flattened by `select`. `totalCount` is
   * the server's, never derived from what has loaded so far. The first response
   * pins `maxCreationTime`, so rows created while scrolling don't shift later
   * pages; a refetch re-pins it.
   */
  list: (filter: TransactionsFilter = {}) => {
    const scope = definedFilter(filter);
    return infiniteQueryOptions({
      queryKey: [...transactionQueries.lists(), scope] as const,
      queryFn: ({ pageParam }) =>
        rpc(transactionClient.listTransactions({ ...scope, cursor: pageParam })),
      initialPageParam: {
        position: 0,
        limit: TRANSACTIONS_PAGE_SIZE,
      } as TransactionsCursor,
      getNextPageParam: (lastPage, allPages): TransactionsCursor | undefined => {
        const loaded = allPages.reduce(
          (count, page) => count + page.transactions.length,
          0,
        );
        if (lastPage.transactions.length === 0 || loaded >= lastPage.totalCount) {
          return undefined;
        }
        return {
          position: loaded,
          limit: TRANSACTIONS_PAGE_SIZE,
          maxCreationTime: allPages[0].nextCursor?.maxCreationTime,
        };
      },
      select: (data) => ({
        transactions: data.pages
          .flatMap((page) => page.transactions)
          .filter(Boolean)
          .map(mapTransaction),
        /** Server `total_count`; never derived from the loaded rows. */
        totalCount: data.pages.at(-1)?.totalCount ?? 0,
      }),
    });
  },

  /** Category totals by month for an inclusive calendar range. */
  totals: (start: YearMonth, end: YearMonth) =>
    queryOptions({
      queryKey: [
        ...transactionQueries.all(),
        "totals",
        start.year,
        start.month,
        end.year,
        end.month,
      ] as const,
      queryFn: () =>
        rpc(
          transactionClient.getTransactionTotals({
            startMonth: start.month,
            startYear: start.year,
            endMonth: end.month,
            endYear: end.year,
          }),
        ),
      placeholderData: keepPreviousData,
      select: mapGetTransactionTotalsResponse,
    }),
};

export type UpdateTransactionCategoryInput = {
  transactionId: string;
  categoryId: string;
};

export const transactionMutations = {
  /**
   * Inline category edit: patched optimistically in every cached page so the
   * table doesn't flicker, then refetched. A row leaving a category-filtered
   * list is removed from it.
   */
  updateCategory: mutationOptions({
    mutationKey: ["transactions", "updateCategory"],
    mutationFn: (body: UpdateTransactionCategoryInput) =>
      rpc(
        transactionClient.updateTransaction({
          id: body.transactionId,
          categoryId: body.categoryId,
        }),
      ),
    onMutate: ({ transactionId, categoryId }, context) =>
      patchQueries<InfiniteData<ListTransactionsResponse>>(
        context.client,
        { queryKey: transactionQueries.lists() },
        (data, queryKey) => {
          const filter = queryKey[2] as TransactionsFilter | undefined;
          const movesOutOfFilter =
            filter?.categoryId !== undefined &&
            filter.categoryId !== categoryId;
          const holdsRow = data.pages.some((page) =>
            page.transactions.some(({ id }) => id === transactionId),
          );
          if (movesOutOfFilter && holdsRow) {
            return {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                transactions: page.transactions.filter(
                  ({ id }) => id !== transactionId,
                ),
                totalCount: page.totalCount - 1,
              })),
            };
          }
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              transactions: page.transactions.map((transaction) =>
                transaction.id === transactionId
                  ? { ...transaction, categoryId }
                  : transaction,
              ),
            })),
          };
        },
      ),
    onError: (_error, _variables, onMutateResult) => {
      onMutateResult?.rollback();
    },
    // Totals live under the same root as the lists, so one prefix covers both.
    ...invalidatesOnSettled(transactionQueries.all()),
  }),
};
