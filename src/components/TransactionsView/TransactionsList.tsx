import { Box, Pagination, Paper, Text } from "@mantine/core";
import type { Transaction } from "../../models";
import { TransactionsTable } from "./TransactionsTable.js";
import { usePagination } from "./usePagination.js";

export const DEFAULT_TRANSACTIONS_PAGE_SIZE = 25;

export type TransactionsListProps = {
  /** Full list for this view (all / account / search). Pagination is internal. */
  transactions: readonly Transaction[];
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
  accountNameById,
  categoryNameById,
  onRowOpen,
  pageSize = DEFAULT_TRANSACTIONS_PAGE_SIZE,
  emptyMessage = "No transactions yet.",
}: TransactionsListProps) {
  const { page, setPage, paginatedItems, totalPages } = usePagination(
    transactions,
    pageSize,
  );

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
        {transactions.length === 0 ? (
          <Text size="sm" c="dimmed" p="md">
            {emptyMessage}
          </Text>
        ) : (
          <TransactionsTable
            transactions={paginatedItems}
            accountNameById={accountNameById}
            categoryNameById={categoryNameById}
            onRowOpen={onRowOpen}
          />
        )}
      </Box>

      {transactions.length > 0 ? (
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
            onChange={setPage}
            size="sm"
            color="brand"
          />
        </Box>
      ) : null}
    </Paper>
  );
}
