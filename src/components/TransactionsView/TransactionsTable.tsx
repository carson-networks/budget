import { Box, Table, rem } from "@mantine/core";
import { useMemo, type ReactNode } from "react";
import { formatSignedCurrency, type Transaction } from "../../models";
import { groupTransactionsByDate } from "./groupTransactionsByDate.js";

/** Matches Mantine `ActionIcon` `size="md"` height used in Accounts settings column. */
const TABLE_LEADING_CELL_HEIGHT_PX = 28;

type TransactionsTableProps = {
  transactions: readonly Transaction[];
  accountNameById: ReadonlyMap<string, string>;
  categoryNameById: ReadonlyMap<string, string>;
  onRowOpen?: (transaction: Transaction) => void;
  renderCategory?: (transaction: Transaction) => ReactNode;
};

const COLUMN_WIDTHS = {
  leading: rem(48),
  merchant: "20%",
  name: undefined,
  account: "18%",
  category: "20%",
  amount: rem(120),
} as const;

const TABLE_MIN_WIDTH = rem(880);

const COLUMN_COUNT = 6;

export function TransactionsTable({
  transactions,
  accountNameById,
  categoryNameById,
  onRowOpen,
  renderCategory,
}: TransactionsTableProps) {
  const sections = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions],
  );

  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
      <Table
        highlightOnHover
        withTableBorder
        withColumnBorders
        horizontalSpacing="md"
        verticalSpacing="xs"
        style={{ tableLayout: "fixed", width: "100%" }}
      >
        <colgroup>
          <col style={{ width: COLUMN_WIDTHS.leading }} />
          <col style={{ width: COLUMN_WIDTHS.merchant }} />
          <col style={{ width: COLUMN_WIDTHS.name }} />
          <col style={{ width: COLUMN_WIDTHS.account }} />
          <col style={{ width: COLUMN_WIDTHS.category }} />
          <col style={{ width: COLUMN_WIDTHS.amount }} />
        </colgroup>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th>Merchant</Table.Th>
            <Table.Th>Transaction</Table.Th>
            <Table.Th>Account</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>
        {sections.map((section) => (
          <Table.Tbody key={section.key}>
            <DateSectionHeader label={section.label} />
            {section.transactions.map((txn) => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                accountNameById={accountNameById}
                categoryNameById={categoryNameById}
                onRowOpen={onRowOpen}
                renderCategory={renderCategory}
              />
            ))}
          </Table.Tbody>
        ))}
      </Table>
    </Table.ScrollContainer>
  );
}

function DateSectionHeader({ label }: { label: string }) {
  return (
    <Table.Tr>
      <Table.Th
        scope="rowgroup"
        colSpan={COLUMN_COUNT}
        fz="xs"
        fw={600}
        c="dimmed"
        tt="uppercase"
        style={{
          backgroundColor: "var(--mantine-color-default-hover)",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </Table.Th>
    </Table.Tr>
  );
}

type TransactionRowProps = Omit<TransactionsTableProps, "transactions"> & {
  transaction: Transaction;
};

function TransactionRow({
  transaction,
  accountNameById,
  categoryNameById,
  onRowOpen,
  renderCategory,
}: TransactionRowProps) {
  const accountName =
    accountNameById.get(transaction.accountId) ?? transaction.accountId;
  const merchantName = transaction.merchantName?.trim()
    ? transaction.merchantName
    : "—";
  const categoryName = transaction.categoryId
    ? (categoryNameById.get(transaction.categoryId) ?? transaction.categoryId)
    : "—";

  return (
    <Table.Tr
      style={onRowOpen ? { cursor: "pointer" } : undefined}
      onClick={onRowOpen ? () => onRowOpen(transaction) : undefined}
    >
      <Table.Td style={{ verticalAlign: "middle", textAlign: "center" }}>
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
      <Table.Td style={{ verticalAlign: "middle" }}>{merchantName}</Table.Td>
      <Table.Td style={{ verticalAlign: "middle" }}>
        {transaction.transactionName}
      </Table.Td>
      <Table.Td style={{ verticalAlign: "middle" }}>{accountName}</Table.Td>
      <Table.Td
        style={{ verticalAlign: "middle" }}
        onClick={
          renderCategory ? (event) => event.stopPropagation() : undefined
        }
      >
        {renderCategory ? renderCategory(transaction) : categoryName}
      </Table.Td>
      <Table.Td fw={500} style={{ verticalAlign: "middle" }}>
        {formatSignedCurrency(transaction.amount)}
      </Table.Td>
    </Table.Tr>
  );
}
