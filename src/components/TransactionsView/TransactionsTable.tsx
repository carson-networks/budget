import { Box, Table, rem } from "@mantine/core";
import { formatCurrency, type Transaction } from "../../models";

/** Matches Mantine `ActionIcon` `size="md"` height used in Accounts settings column. */
const TABLE_LEADING_CELL_HEIGHT_PX = 28;

type TransactionsTableProps = {
  transactions: Transaction[];
  accountNameById: ReadonlyMap<string, string>;
  categoryNameById: ReadonlyMap<string, string>;
  onRowOpen?: (transaction: Transaction) => void;
};

const COLUMN_WIDTHS = {
  leading: rem(48),
  name: undefined,
  account: rem(160),
  category: rem(180),
  amount: rem(120),
} as const;

export function TransactionsTable({
  transactions,
  accountNameById,
  categoryNameById,
  onRowOpen,
}: TransactionsTableProps) {
  return (
    <Table.ScrollContainer minWidth={rem(700)}>
      <Table
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        horizontalSpacing="md"
        verticalSpacing="xs"
        style={{ tableLayout: "fixed", width: "100%" }}
      >
        <colgroup>
          <col style={{ width: COLUMN_WIDTHS.leading }} />
          <col style={{ width: COLUMN_WIDTHS.name }} />
          <col style={{ width: COLUMN_WIDTHS.account }} />
          <col style={{ width: COLUMN_WIDTHS.category }} />
          <col style={{ width: COLUMN_WIDTHS.amount }} />
        </colgroup>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th>Transaction</Table.Th>
            <Table.Th>Account</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {transactions.map((txn) => {
            const accountName =
              accountNameById.get(txn.accountId) ?? txn.accountId;
            const categoryName = txn.categoryId
              ? (categoryNameById.get(txn.categoryId) ?? txn.categoryId)
              : "—";

            return (
              <Table.Tr
                key={txn.id}
                style={onRowOpen ? { cursor: "pointer" } : undefined}
                onClick={onRowOpen ? () => onRowOpen(txn) : undefined}
              >
                <Table.Td
                  style={{ verticalAlign: "middle", textAlign: "center" }}
                >
                  <Box
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: TABLE_LEADING_CELL_HEIGHT_PX,
                    }}
                  >
                    <Box
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: "var(--mantine-color-brand-1)",
                        borderRadius: 5,
                        flexShrink: 0,
                      }}
                      aria-hidden
                    />
                  </Box>
                </Table.Td>
                <Table.Td style={{ verticalAlign: "middle" }}>
                  {txn.transactionName}
                </Table.Td>
                <Table.Td style={{ verticalAlign: "middle" }}>
                  {accountName}
                </Table.Td>
                <Table.Td style={{ verticalAlign: "middle" }}>
                  {categoryName}
                </Table.Td>
                <Table.Td fw={500} style={{ verticalAlign: "middle" }}>
                  {formatCurrency(txn.amount)}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
