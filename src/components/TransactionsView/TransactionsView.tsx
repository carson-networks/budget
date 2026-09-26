import { useMemo } from "react";
import { Alert, Loader, Stack, Text } from "@mantine/core";
import { useAllAccounts } from "../../hooks/useAccounts.js";
import { useAllCategories } from "../../hooks/useCategories.js";
import { useAllTransactions } from "../../hooks/useTransactions.js";
import { ViewShell } from "../shared/ViewShell.js";
import { TransactionsList } from "./TransactionsList.js";

export default function TransactionsView() {
  const {
    transactions,
    isLoading: transactionsLoading,
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

  const isLoading =
    transactionsLoading || accountsLoading || categoriesLoading;
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
      <TransactionsList
        transactions={transactions}
        accountNameById={accountNameById}
        categoryNameById={categoryNameById}
      />
    </ViewShell>
  );
}
