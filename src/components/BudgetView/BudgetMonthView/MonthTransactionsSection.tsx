import {
  Alert,
  Badge,
  CloseButton,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  TransactionsList,
  type TransactionsListProps,
} from "../../TransactionsView/TransactionsList.js";

type MonthTransactionsSectionProps = Omit<
  TransactionsListProps,
  "emptyMessage"
> & {
  categoryName?: string;
  onClearCategory: () => void;
  isLoading: boolean;
  error: Error | null;
};

export function MonthTransactionsSection({
  categoryName,
  onClearCategory,
  isLoading,
  error,
  ...listProps
}: MonthTransactionsSectionProps) {
  return (
    <section aria-label="Month transactions">
      <Group justify="space-between" align="center" mb="sm" mt="md">
        <Title order={5}>Transactions</Title>
        {categoryName ? (
          <Badge
            variant="light"
            color="brand"
            rightSection={
              <CloseButton
                size="xs"
                variant="transparent"
                aria-label="Clear category filter"
                onClick={onClearCategory}
              />
            }
          >
            {categoryName}
          </Badge>
        ) : null}
      </Group>
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
          emptyMessage={
            categoryName
              ? `No ${categoryName} transactions this month.`
              : "No transactions this month."
          }
        />
      )}
    </section>
  );
}
