import {
  Alert,
  Button,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  TransactionsList,
  type TransactionsListProps,
} from "../../TransactionsView/TransactionsList.js";

type CategoryTransactionsPanelProps = Omit<
  TransactionsListProps,
  "emptyMessage"
> & {
  categoryName: string;
  onBack: () => void;
  isLoading: boolean;
  error: Error | null;
};

export function CategoryTransactionsPanel({
  categoryName,
  onBack,
  isLoading,
  error,
  ...listProps
}: CategoryTransactionsPanelProps) {
  return (
    <section aria-label={`${categoryName} transactions`}>
      <Group justify="space-between" align="center" mb="sm">
        <Title order={5}>{categoryName} transactions</Title>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
        >
          Back to budget
        </Button>
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
          emptyMessage={`No ${categoryName} transactions this month.`}
        />
      )}
    </section>
  );
}
