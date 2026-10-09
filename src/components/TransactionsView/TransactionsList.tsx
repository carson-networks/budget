import { Box, Button, Group, Loader, Paper, Text } from "@mantine/core";
import { useEffect, useRef, type ReactNode } from "react";
import type { Transaction } from "../../models";
import { TransactionsTable } from "./TransactionsTable.js";

/** Start loading this far before the end of the list scrolls into view. */
const LOAD_MORE_ROOT_MARGIN = "400px";

export type TransactionsListProps = {
  /** Transactions loaded so far (not necessarily the full corpus). */
  transactions: readonly Transaction[];
  /** Server `total_count` for the same filter. */
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Set when the last `onLoadMore` failed; shows a retry instead of auto-loading. */
  loadMoreError?: Error | null;
  /** Called when the end of the list nears the viewport, and on retry. */
  onLoadMore: () => void;
  accountNameById: ReadonlyMap<string, string>;
  categoryNameById: ReadonlyMap<string, string>;
  /** Optional row click (e.g. open edit). Omitted when no detail handler exists yet. */
  onRowOpen?: (transaction: Transaction) => void;
  renderCategory?: (transaction: Transaction) => ReactNode;
  emptyMessage?: string;
};

/**
 * Reusable infinite-scroll transactions table for the all-transactions view and
 * later account / search surfaces. Presentation only — callers own data fetching.
 */
export function TransactionsList({
  transactions,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  loadMoreError = null,
  onLoadMore,
  accountNameById,
  categoryNameById,
  onRowOpen,
  renderCategory,
  emptyMessage = "No transactions yet.",
}: TransactionsListProps) {
  const isEmpty = totalCount === 0;

  return (
    <Paper
      shadow="sm"
      radius="md"
      p={0}
      withBorder
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {isEmpty ? (
          <Text size="sm" c="dimmed" p="md">
            {emptyMessage}
          </Text>
        ) : (
          <>
            <TransactionsTable
              transactions={transactions}
              accountNameById={accountNameById}
              categoryNameById={categoryNameById}
              onRowOpen={onRowOpen}
              renderCategory={renderCategory}
            />
            <LoadMoreFooter
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              error={loadMoreError}
              onLoadMore={onLoadMore}
            />
          </>
        )}
      </Box>

    </Paper>
  );
}

type LoadMoreFooterProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  onLoadMore: () => void;
};

/**
 * Loads the next batch when it scrolls near the viewport. The observer is
 * re-created after each load, so it also keeps loading while the list is still
 * too short to scroll.
 */
function LoadMoreFooter({
  hasNextPage,
  isFetchingNextPage,
  error,
  onLoadMore,
}: LoadMoreFooterProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canAutoLoad = hasNextPage && !isFetchingNextPage && !error;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!canAutoLoad || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: LOAD_MORE_ROOT_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canAutoLoad, onLoadMore]);

  if (error) {
    return (
      <Group justify="center" gap="sm" py="md">
        <Text size="sm" c="red">
          Could not load more transactions.
        </Text>
        <Button size="compact-sm" variant="light" onClick={onLoadMore}>
          Try again
        </Button>
      </Group>
    );
  }
  if (isFetchingNextPage) {
    return (
      <Group justify="center" py="md">
        <Loader size="sm" aria-label="Loading more transactions" />
      </Group>
    );
  }
  return hasNextPage ? <div ref={sentinelRef} aria-hidden /> : null;
}
