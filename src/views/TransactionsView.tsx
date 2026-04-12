import { useState, useMemo } from "react";
import {
  Box,
  Loader,
  Alert,
  Table,
  Pagination,
  Affix,
  ActionIcon,
  Paper,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useAllTransactions, type Transaction } from "../hooks/useTransactions";
import { useAllAccounts } from "../hooks/useAccounts";
import CreateTransactionModal from "../components/CreateTransactionModal";
import EditTransactionModal from "../components/EditTransactionModal";

const DEFAULT_PAGE_SIZE = 25;

/** Mantine `ActionIcon` `size="md"` height — matches Categories/Accounts settings column. */
const TABLE_LEADING_CELL_HEIGHT_PX = 28;

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(value));
}

export default function TransactionsView() {
  const { transactions, isLoading, error } = useAllTransactions();
  const { accounts } = useAllAccounts();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const accountNameById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );

  const rows = useMemo(
    () =>
      transactions.map((t) => ({
        id: t.id,
        transactionName: t.transactionName,
        accountName: accountNameById.get(t.accountId) ?? t.accountId,
        categoryID: t.categoryId ?? "",
        amount: t.amount,
      })),
    [transactions, accountNameById]
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const totalPages = Math.ceil(rows.length / pageSize) || 1;

  if (isLoading) {
    return (
      <Box
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader color="brand" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ flex: 1, padding: 16 }}>
        <Alert color="red" title="Error">
          {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Title order={4} mb="md" c="dark.6">
        Transactions
      </Title>
      <Paper
        shadow="sm"
        radius="md"
        p={0}
        style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
            verticalSpacing="xs"
            horizontalSpacing="xs"
            fz="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 48 }} />
                <Table.Th>Transaction</Table.Th>
                <Table.Th>Account</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedRows.map((row) => (
                <Table.Tr
                  key={row.id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setEditTransaction(
                      transactions.find((t) => t.id === row.id) ?? null,
                    )
                  }
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
                      />
                    </Box>
                  </Table.Td>
                  <Table.Td style={{ verticalAlign: "middle" }}>
                    {row.transactionName}
                  </Table.Td>
                  <Table.Td style={{ verticalAlign: "middle" }}>
                    {row.accountName}
                  </Table.Td>
                  <Table.Td style={{ verticalAlign: "middle" }}>
                    {row.categoryID}
                  </Table.Td>
                  <Table.Td fw={500} style={{ verticalAlign: "middle" }}>
                    {formatCurrency(row.amount)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        {rows.length > 0 && (
          <Box py="md" style={{ display: "flex", justifyContent: "center", borderTop: "1px solid var(--mantine-color-default-border)" }}>
            <Pagination
            total={totalPages}
            value={page}
            onChange={setPage}
            size="sm"
            color="brand"
          />
          </Box>
        )}
      </Paper>

      <Affix position={{ bottom: 24, right: 24 }}>
        <ActionIcon
          size="xl"
          radius="xl"
          color="brand"
          aria-label="add transaction"
          onClick={() => setCreateModalOpen(true)}
        >
          <IconPlus size={24} />
        </ActionIcon>
      </Affix>

      <CreateTransactionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <EditTransactionModal
        transaction={editTransaction}
        accountLabel={
          editTransaction
            ? accountNameById.get(editTransaction.accountId) ??
              editTransaction.accountId
            : ""
        }
        opened={editTransaction !== null}
        onClose={() => setEditTransaction(null)}
      />
    </Box>
  );
}
