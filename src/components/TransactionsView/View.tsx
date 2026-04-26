import { useMemo } from "react";
import { Box, Pagination, Paper } from "@mantine/core";
import {
  useAllTransactions,
  useUpdateTransactionCategory,
  type Transaction,
} from "../../hooks/useTransactions";
import { useAllAccounts } from "../../hooks/useAccounts";
import { useAllCategories } from "../../hooks/useCategories";
import { useEntityModals } from "../../hooks/useEntityModals";
import { usePagination } from "./usePagination";
import { useSyncedEditEntity } from "./useSyncedEditEntity";
import CreateTransactionModal from "../CreateTransactionModal/Modal";
import EditTransactionModal from "../EditTransactionModal/Modal";
import { buildTransactionCategorySelectData } from "./transactionCategorySelectData";
import { FloatingCreateButton } from "../shared/FloatingCreateButton";
import { MutationErrorBanner } from "./MutationErrorBanner";
import { Table } from "./Table";
import { ViewErrorAlert } from "../shared/ViewErrorAlert";
import { ViewLoadingState } from "../shared/ViewLoadingState";
import { ViewShell } from "../shared/ViewShell";

const DEFAULT_PAGE_SIZE = 25;

export default function TransactionsView() {
  const { transactions, isLoading, error } = useAllTransactions();
  const { accounts } = useAllAccounts();
  const { categories } = useAllCategories();
  const updateCategory = useUpdateTransactionCategory();
  const {
    createOpen,
    closeCreate,
    openCreate,
    editing: editTransaction,
    setEditing: setEditTransaction,
  } = useEntityModals<Transaction>();

  const accountNameById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );

  const categorySelectData = useMemo(
    () => buildTransactionCategorySelectData(categories),
    [categories],
  );

  useSyncedEditEntity(transactions, setEditTransaction);

  const { page, setPage, paginatedItems, totalPages } = usePagination(
    transactions,
    DEFAULT_PAGE_SIZE,
  );

  if (isLoading) {
    return <ViewLoadingState />;
  }

  if (error) {
    return <ViewErrorAlert message={error.message} />;
  }

  return (
    <ViewShell title="Transactions">
      <Paper
        shadow="sm"
        radius="md"
        p={0}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {updateCategory.isError && (
          <MutationErrorBanner
            message={updateCategory.error.message}
            onClose={() => updateCategory.reset()}
          />
        )}
        <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table
            paginatedTransactions={paginatedItems}
            accountNameById={accountNameById}
            categories={categories}
            categorySelectData={categorySelectData}
            updateCategory={updateCategory}
            onRowOpen={setEditTransaction}
          />
        </Box>

        {transactions.length > 0 && (
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
        )}
      </Paper>

      <FloatingCreateButton ariaLabel="add transaction" onClick={openCreate} />

      <CreateTransactionModal open={createOpen} onClose={closeCreate} />

      <EditTransactionModal
        transaction={editTransaction}
        accountLabel={
          editTransaction
            ? (accountNameById.get(editTransaction.accountId) ??
              editTransaction.accountId)
            : ""
        }
        opened={editTransaction !== null}
        onClose={() => setEditTransaction(null)}
      />
    </ViewShell>
  );
}
