import { Alert, Loader, Stack, Text } from "@mantine/core";
import {
  TransactionsList,
  type TransactionsListProps,
} from "../../TransactionsView/TransactionsList.js";
import { CategoryUpdateErrorAlert } from "../../TransactionsView/CategoryUpdateErrorAlert.js";

type CategoryTransactionsTableProps = Omit<
  TransactionsListProps,
  "emptyMessage"
> & {
  categoryName: string;
  isLoading: boolean;
  error: Error | null;
  categoryUpdateError: Error | null;
  onDismissCategoryUpdateError: () => void;
};

export function CategoryTransactionsTable({
  categoryName,
  isLoading,
  error,
  categoryUpdateError,
  onDismissCategoryUpdateError,
  ...listProps
}: CategoryTransactionsTableProps) {
  return (
    <>
      <CategoryUpdateErrorAlert
        error={categoryUpdateError}
        onDismiss={onDismissCategoryUpdateError}
      />
      {error ? (
        <Alert color="red" title="Could not load transactions">
          {error.message}
        </Alert>
      ) : isLoading ? (
        <Stack align="center" gap="sm" py="lg">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        </Stack>
      ) : (
        <TransactionsList
          {...listProps}
          emptyMessage={`No ${categoryName} transactions this month.`}
        />
      )}
    </>
  );
}
