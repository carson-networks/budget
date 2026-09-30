import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
  { page: number; pageSize: number },
];

/**
 * Fetches one server page of transactions for UI page `page` (1-based).
 * Uses offset/`limit` matching the UI page size and server `total_count`
 * for pager totals — never invents a total from the loaded slice.
 */
export function useAllTransactions(
  pageSize: number = TRANSACTIONS_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);
  /** Freeze the list window across pages (from first response's next_cursor). */
  const maxCreationTimeRef = useRef<Timestamp | undefined>(undefined);

  const queryKey: TransactionsPageQueryKey = [
    "transactions",
    { page, pageSize },
  ];

  const query = useQuery<ListTransactionsResponse, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const response = await transactionClient.listTransactions({
          cursor: {
            position: (page - 1) * pageSize,
            limit: pageSize,
            maxCreationTime: maxCreationTimeRef.current,
          },
        });
        if (
          maxCreationTimeRef.current === undefined &&
          response.nextCursor?.maxCreationTime !== undefined
        ) {
          maxCreationTimeRef.current = response.nextCursor.maxCreationTime;
        }
        return response;
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    placeholderData: keepPreviousData,
  });

  const transactions: Transaction[] =
    (query.data?.transactions ?? []).filter(Boolean).map(mapTransaction);

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
