import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { transactionClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { ListTransactionsResponse } from "../connectRPC/types.js";
import { mapTransaction, type Transaction } from "../models";

/** UI + API page size for the all-transactions list. */
export const TRANSACTIONS_PAGE_SIZE = 25;

export type TransactionsPageQueryKey = readonly [
  "transactions",
  { page: number; pageSize: number; accountId?: string },
];

/**
 * Fetches one server page of transactions for UI page `page` (1-based).
 * Uses offset/`limit` matching the UI page size and server `total_count`
 * for pager totals — never invents a total from the loaded slice.
 */
export function useAllTransactions(
  pageSize: number = TRANSACTIONS_PAGE_SIZE,
  { accountId, enabled = true }: { accountId?: string; enabled?: boolean } = {},
) {
  const [pagination, setPagination] = useState({
    accountId,
    pageSize,
    page: 1,
  });
  const scopeChanged =
    pagination.accountId !== accountId || pagination.pageSize !== pageSize;
  const page = scopeChanged ? 1 : pagination.page;
  if (scopeChanged) setPagination({ accountId, pageSize, page: 1 });
  const setPage = (page: number) =>
    setPagination({ accountId, pageSize, page });

  /** Keep each filter's frozen window separate, including concurrent requests. */
  const maxCreationTimes = useRef(new Map<string, Timestamp>());
  const scope = JSON.stringify([accountId, pageSize]);

  const queryKey: TransactionsPageQueryKey = [
    "transactions",
    { page, pageSize, ...(accountId === undefined ? {} : { accountId }) },
  ];

  const query = useQuery<ListTransactionsResponse, Error>({
    queryKey,
    enabled,
    queryFn: async () => {
      try {
        const response = await transactionClient.listTransactions({
          ...(accountId === undefined ? {} : { accountId }),
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
      const previousScope = previousQuery?.queryKey[1] as
        | TransactionsPageQueryKey[1]
        | undefined;
      return previousScope?.accountId === accountId &&
        previousScope?.pageSize === pageSize
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
