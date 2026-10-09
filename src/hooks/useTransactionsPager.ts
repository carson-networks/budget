import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  TRANSACTIONS_PAGE_SIZE,
  transactionQueries,
  type TransactionsFilter,
  type TransactionWindows,
} from "../queries/transactions.js";

/** Search param holding the 1-based page; absent means page 1. */
export const PAGE_PARAM = "page";

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * One server page of transactions for `filter`. The page number lives in the
 * URL (`?page=`), so it survives reloads and is shareable; everything else is
 * the {@link transactionQueries.list} query.
 */
export function useTransactionsPager(
  filter: TransactionsFilter = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  const pageSize = TRANSACTIONS_PAGE_SIZE;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = parsePage(searchParams.get(PAGE_PARAM));
  // Lives as long as this pager, so a fresh visit sees fresh transactions.
  const [windows] = useState<TransactionWindows>(() => new Map());

  const query = useQuery({
    ...transactionQueries.list(
      { page: requestedPage, pageSize, ...filter },
      windows,
    ),
    enabled,
  });

  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const setPage = useCallback(
    (page: number) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (page <= 1) next.delete(PAGE_PARAM);
        else next.set(PAGE_PARAM, String(page));
        return next;
      }),
    [setSearchParams],
  );

  return {
    ...query,
    transactions: query.data?.transactions ?? [],
    totalCount,
    totalPages,
    page: Math.min(requestedPage, totalPages),
    setPage,
    pageSize,
  };
}
