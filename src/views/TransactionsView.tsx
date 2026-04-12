import { useState, useMemo, useEffect } from "react";
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
  Select,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import {
  useAllTransactions,
  useUpdateTransactionCategory,
  type Transaction,
} from "../hooks/useTransactions";
import { useAllAccounts } from "../hooks/useAccounts";
import { useAllCategories } from "../hooks/useCategories";
import CreateTransactionModal from "../components/CreateTransactionModal";
import EditTransactionModal from "../components/EditTransactionModal";
import {
  buildTransactionCategorySelectData,
  countSelectableTransactionCategories,
  isSelectableTransactionCategory,
} from "../utils/transactionCategorySelectData";

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
  const { categories } = useAllCategories();
  const updateCategory = useUpdateTransactionCategory();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const accountNameById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );

  const categorySelectData = useMemo(
    () => buildTransactionCategorySelectData(categories),
    [categories],
  );

  useEffect(() => {
    setEditTransaction((current) => {
      if (!current) return null;
      return transactions.find((t) => t.id === current.id) ?? null;
    });
  }, [transactions]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, page, pageSize]);

  const totalPages = Math.ceil(transactions.length / pageSize) || 1;

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
        {updateCategory.isError && (
          <Alert
            color="red"
            title="Could not update category"
            mb={0}
            onClose={() => updateCategory.reset()}
            withCloseButton
          >
            {updateCategory.error.message}
          </Alert>
        )}
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
                <Table.Th style={{ minWidth: 150, maxWidth: 250 }}>Category</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedTransactions.map((txn) => {
                const accountName =
                  accountNameById.get(txn.accountId) ?? txn.accountId;
                const currentId = txn.categoryId;
                const currentIsSelectable = isSelectableTransactionCategory(
                  categories,
                  currentId,
                );

                return (
                  <Table.Tr
                    key={txn.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => setEditTransaction(txn)}
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
                      {txn.transactionName}
                    </Table.Td>
                    <Table.Td style={{ verticalAlign: "middle" }}>
                      {accountName}
                    </Table.Td>
                    <Table.Td
                      style={{
                        verticalAlign: "middle",
                        minWidth: 150,
                        maxWidth: 250,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        size="xs"
                        placeholder="Pick category"
                        data={categorySelectData}
                        value={currentIsSelectable ? currentId! : null}
                        onChange={(id) => {
                          if (!id || id === currentId) return;
                          updateCategory.mutate({
                            transactionId: txn.id,
                            categoryId: id,
                          });
                        }}
                        disabled={
                          updateCategory.isPending ||
                          countSelectableTransactionCategories(categories) === 0
                        }
                        searchable
                        nothingFoundMessage="No categories"
                        comboboxProps={{ withinPortal: true }}
                      />
                    </Table.Td>
                    <Table.Td fw={500} style={{ verticalAlign: "middle" }}>
                      {formatCurrency(txn.amount)}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>

        {transactions.length > 0 && (
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
