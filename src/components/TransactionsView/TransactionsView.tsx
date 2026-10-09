import { useMemo } from "react";
import { Alert, Loader, Stack, Text } from "@mantine/core";
import { useAllAccounts } from "../../hooks/useAccounts.js";
import { useAllCategories } from "../../hooks/useCategories.js";
import { useAllTransactions } from "../../hooks/useTransactions.js";
import { useUpdateTransactionCategory } from "../../hooks/useUpdateTransactionCategory.js";
import { ViewShell } from "../shared/ViewShell.js";
import { TransactionsList } from "./TransactionsList.js";
import { CategorySelect } from "./CategorySelect.js";
import { buildTransactionCategorySelectData } from "./transactionCategorySelectData.js";

export default function TransactionsView() {
  const updateCategory = useUpdateTransactionCategory();
  const {
    transactions,
    totalCount,
    page,
    setPage,
    pageSize,
    isLoading: transactionsLoading,
    isPlaceholderData,
    error: transactionsError,
  } = useAllTransactions();
  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useAllAccounts();
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useAllCategories();

  const accountNameById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const categorySelectData = useMemo(
    () => buildTransactionCategorySelectData(categories),
    [categories],
  );

  const isLoading =
    (transactionsLoading && !isPlaceholderData) ||
    accountsLoading ||
    categoriesLoading;
  const error = transactionsError ?? accountsError ?? categoriesError;

  if (isLoading) {
    return (
      <Stack align="center" justify="center" gap="sm" py="xl">
        <Loader size="md" />
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Something went wrong">
        {error.message}
      </Alert>
    );
  }

  return (
    <ViewShell title="Transactions">
      {updateCategory.isError && (
        <Alert
          color="red"
          title="Could not update category"
          withCloseButton
          closeButtonLabel="Dismiss category update error"
          onClose={() => updateCategory.reset()}
        >
          {updateCategory.error.message}
        </Alert>
      )}
      <TransactionsList
        transactions={transactions}
        totalCount={totalCount}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        accountNameById={accountNameById}
        categoryNameById={categoryNameById}
        renderCategory={(transaction) => (
          <CategorySelect
            categories={categories}
            data={categorySelectData}
            currentCategoryId={transaction.categoryId}
            transactionName={transaction.transactionName}
            pending={updateCategory.isPending || isPlaceholderData}
            onCategoryChange={(categoryId) =>
              updateCategory.mutate({
                transactionId: transaction.id,
                categoryId,
              })
            }
          />
        )}
      />
    </ViewShell>
  );
}
