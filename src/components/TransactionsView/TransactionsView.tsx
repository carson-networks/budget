import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Alert, Loader, Stack, Text } from "@mantine/core";
import { useTransactionsPager } from "../../hooks/useTransactionsPager.js";
import { accountQueries } from "../../queries/accounts.js";
import { categoryQueries } from "../../queries/categories.js";
import { nameById } from "../../utils/nameById.js";
import { ViewShell } from "../shared/ViewShell.js";
import { TransactionsList } from "./TransactionsList.js";
import { CategoryUpdateErrorAlert } from "./CategoryUpdateErrorAlert.js";
import { useTransactionCategoryEditing } from "./useTransactionCategoryEditing.js";

export default function TransactionsView() {
  const {
    transactions,
    totalCount,
    page,
    setPage,
    pageSize,
    isLoading: transactionsLoading,
    isPlaceholderData,
    error: transactionsError,
  } = useTransactionsPager();
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError,
  } = useInfiniteQuery(accountQueries.list());
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useInfiniteQuery(categoryQueries.list());

  const accountNameById = useMemo(() => nameById(accounts), [accounts]);
  const categoryNameById = useMemo(() => nameById(categories), [categories]);

  const categoryEditing = useTransactionCategoryEditing(categories, {
    disabled: isPlaceholderData,
  });

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
      <CategoryUpdateErrorAlert
        error={categoryEditing.error}
        onDismiss={categoryEditing.dismissError}
      />
      <TransactionsList
        transactions={transactions}
        totalCount={totalCount}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        accountNameById={accountNameById}
        categoryNameById={categoryNameById}
        renderCategory={categoryEditing.renderCategory}
      />
    </ViewShell>
  );
}
