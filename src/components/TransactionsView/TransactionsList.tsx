import { Box, Pagination, Paper, Text } from "@mantine/core";
import type { Transaction } from "../../models";
import { TRANSACTIONS_PAGE_SIZE } from "../../hooks/useTransactions.js";
import { TransactionsTable } from "./TransactionsTable.js";

export const DEFAULT_TRANSACTIONS_PAGE_SIZE = TRANSACTIONS_PAGE_SIZE;

/** ~10 numbered slots: 1 boundary each side + 4 siblings around current. */
const PAGINATION_SIBLINGS = 4;
const PAGINATION_BOUNDARIES = 1;

export type TransactionsListProps = {
  /** Current server page of transactions (not the full corpus). */
  transactions: readonly Transaction[];
  /** Server `total_count` for the same filter as this page. */
  totalCount: number;
  page: number;
  onPageChange: (page: number) => void;
  accountNameById: ReadonlyMap<string, string>;
  categoryNameById: ReadonlyMap<string, string>;
  /** Optional row click (e.g. open edit). Omitted when no detail handler exists yet. */
  onRowOpen?: (transaction: Transaction) => void;
  pageSize?: number;
  emptyMessage?: string;
};

/**
 * Reusable paginated transactions table for the all-transactions view and later
 * account / search surfaces. Presentation only — callers own data fetching.
 */
export function TransactionsList({
  transactions,
  totalCount,
  page,
  onPageChange,
  accountNameById,
  categoryNameById,
  onRowOpen,
  pageSize = DEFAULT_TRANSACTIONS_PAGE_SIZE,
  emptyMessage = "No transactions yet.",
}: TransactionsListProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
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
          <TransactionsTable
            transactions={transactions}
            accountNameById={accountNameById}
            categoryNameById={categoryNameById}
            onRowOpen={onRowOpen}
          />
        )}
      </Box>

      {!isEmpty ? (
        <Box
          py="md"
          style={{
            display: "flex",
            justifyContent: "center",
            borderTop: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Pagination
            total={totalPages}
            value={page}
            onChange={onPageChange}
            size="sm"
            color="brand"
            withEdges
            siblings={PAGINATION_SIBLINGS}
            boundaries={PAGINATION_BOUNDARIES}
          />
        </Box>
      ) : null}
    </Paper>
  );
}
