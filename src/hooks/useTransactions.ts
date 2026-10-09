import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { transactionClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { ListTransactionsResponse } from "../connectRPC/types.js";
import { mapTransaction, type Transaction } from "../models";
import type { YearMonth } from "../utils/monthRange.js";

/** UI + API page size for the all-transactions list. */
export const TRANSACTIONS_PAGE_SIZE = 25;

export type TransactionsFilter = {
  accountId?: string;
  categoryId?: string;
  month?: YearMonth;
};

export type TransactionsPageQueryKey = readonly [
  "transactions",
  { page: number; pageSize: number } & TransactionsFilter,
];

function definedFilter({
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

function filterScope(filter: TransactionsFilter, pageSize: number): string {
  return JSON.stringify([
    filter.accountId,
    filter.categoryId,
    filter.month?.year,
    filter.month?.month,
    pageSize,
  ]);
}

/**
 * Fetches one server page of transactions for UI page `page` (1-based).
 * Uses offset/`limit` matching the UI page size and server `total_count`
 * for pager totals — never invents a total from the loaded slice.
 */
export function useAllTransactions(
  pageSize: number = TRANSACTIONS_PAGE_SIZE,
  {
    enabled = true,
    ...filterOptions
  }: TransactionsFilter & { enabled?: boolean } = {},
) {
  const filter = definedFilter(filterOptions);
  const scope = filterScope(filter, pageSize);
  const [pagination, setPagination] = useState({ scope, page: 1 });
  const scopeChanged = pagination.scope !== scope;
  const page = scopeChanged ? 1 : pagination.page;
  if (scopeChanged) setPagination({ scope, page: 1 });
  const setPage = (page: number) => setPagination({ scope, page });

  /** Keep each filter's frozen window separate, including concurrent requests. */
  const maxCreationTimes = useRef(new Map<string, Timestamp>());

  const queryKey: TransactionsPageQueryKey = [
    "transactions",
    { page, pageSize, ...filter },
  ];

  const query = useQuery<ListTransactionsResponse, Error>({
    queryKey,
    enabled,
    queryFn: async () => {
      try {
        const response = await transactionClient.listTransactions({
          ...filter,
          cursor: {
            position: (page - 1) * pageSize,
            limit: pageSize,
            maxCreationTime: maxCreationTimes.current.get(scope),
          },
        });
        if (
          !maxCreationTimes.current.has(scope) &&
          response.nextCursor?.maxCreationTime !== undefined
        ) {
          maxCreationTimes.current.set(
            scope,
            response.nextCursor.maxCreationTime,
          );
        }
        return response;
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey[1] as
        | TransactionsPageQueryKey[1]
        | undefined;
      return previousKey &&
        filterScope(previousKey, previousKey.pageSize) === scope
        ? previousData
        : undefined;
    },
  });

  const transactions: Transaction[] = (query.data?.transactions ?? [])
    .filter(Boolean)
    .map(mapTransaction);

  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const currentPage = Math.min(page, totalPages);

  return {
    ...query,
    transactions,
    /** Server `total_count` (0 while no response yet). */
    totalCount,
    totalPages,
    page: currentPage,
    setPage,
    pageSize,
  };
}
