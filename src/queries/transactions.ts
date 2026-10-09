import {
  keepPreviousData,
  mutationOptions,
  queryOptions,
} from "@tanstack/react-query";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { transactionClient } from "../connectRPC/connect.js";
import type { ListTransactionsResponse } from "../connectRPC/types.js";
import { mapGetTransactionTotalsResponse, mapTransaction } from "../models";
import type { YearMonth } from "../utils/monthRange.js";
import { invalidatesOnSettled } from "./invalidate.js";
import { patchQueries } from "./optimistic.js";
import { rpc } from "./rpc.js";

/** UI + API page size for transaction lists. */
export const TRANSACTIONS_PAGE_SIZE = 25;

export type TransactionsFilter = {
  accountId?: string;
  categoryId?: string;
  month?: YearMonth;
};

export type TransactionsListParams = {
  page: number;
  pageSize: number;
} & TransactionsFilter;

/**
 * Frozen `maxCreationTime` per filter scope. The first response for a scope
 * pins the window so later pages don't shift as new transactions arrive; the
 * owner (one pager) decides how long that window lives.
 */
export type TransactionWindows = Map<string, Timestamp>;

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

/** Identifies a filter + page size, independent of the page number. */
export function transactionsScope(
  filter: TransactionsFilter,
  pageSize: number,
): string {
  return JSON.stringify([
    filter.accountId,
    filter.categoryId,
    filter.month?.year,
    filter.month?.month,
    pageSize,
  ]);
}

export const transactionQueries = {
  all: () => ["transactions"] as const,
  lists: () => [...transactionQueries.all(), "list"] as const,

  /**
   * One server page (UI page is 1-based). Uses offset/`limit` matching the page
   * size and the server `total_count` for pager totals — never a client guess.
   */
  list: (params: TransactionsListParams, windows: TransactionWindows) => {
    const { page, pageSize, ...rest } = params;
    const filter = definedFilter(rest);
    const scope = transactionsScope(filter, pageSize);
    return queryOptions({
      queryKey: [
        ...transactionQueries.lists(),
        { page, pageSize, ...filter },
      ] as const,
      queryFn: async () => {
        const response = await rpc(
          transactionClient.listTransactions({
            ...filter,
            cursor: {
              position: (page - 1) * pageSize,
              limit: pageSize,
              maxCreationTime: windows.get(scope),
            },
          }),
        );
        const frozen = response.nextCursor?.maxCreationTime;
        if (!windows.has(scope) && frozen !== undefined) {
          windows.set(scope, frozen);
        }
        return response;
      },
      select: (response) => ({
        transactions: response.transactions.filter(Boolean).map(mapTransaction),
        /** Server `total_count`; never derived from the loaded slice. */
        totalCount: response.totalCount,
      }),
      // Keep the previous page on screen while paging, never across filters.
      placeholderData: (previousData, previousQuery) => {
        const previous = previousQuery?.queryKey[2] as
          | TransactionsListParams
          | undefined;
        return previous &&
          transactionsScope(definedFilter(previous), previous.pageSize) ===
            scope
          ? previousData
          : undefined;
      },
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
      patchQueries<ListTransactionsResponse>(
        context.client,
        { queryKey: transactionQueries.lists() },
        (data, queryKey) => {
          const filter = queryKey[2] as TransactionsListParams | undefined;
          const movesOutOfFilter =
            filter?.categoryId !== undefined &&
            filter.categoryId !== categoryId;
          if (
            movesOutOfFilter &&
            data.transactions.some(({ id }) => id === transactionId)
          ) {
            return {
              ...data,
              transactions: data.transactions.filter(
                ({ id }) => id !== transactionId,
              ),
              totalCount: data.totalCount - 1,
            };
          }
          return {
            ...data,
            transactions: data.transactions.map((transaction) =>
              transaction.id === transactionId
                ? { ...transaction, categoryId }
                : transaction,
            ),
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
