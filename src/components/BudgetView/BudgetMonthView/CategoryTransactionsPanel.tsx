import { Alert, Box, Button, Loader, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { YearMonth } from "../../../utils/monthRange.js";
import {
  TransactionsList,
  type TransactionsListProps,
} from "../../TransactionsView/TransactionsList.js";
import { CategoryUpdateErrorAlert } from "../../TransactionsView/CategoryUpdateErrorAlert.js";
import { MonthNavigationBar } from "./MonthNavigationBar.js";

type CategoryTransactionsPanelProps = Omit<
  TransactionsListProps,
  "emptyMessage"
> & {
  categoryName: string;
  month: YearMonth;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: Error | null;
  categoryUpdateError: Error | null;
  onDismissCategoryUpdateError: () => void;
};

export function CategoryTransactionsPanel({
  categoryName,
  month,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onBack,
  isLoading,
  error,
  categoryUpdateError,
  onDismissCategoryUpdateError,
  ...listProps
}: CategoryTransactionsPanelProps) {
  return (
    <Box>
      <Title order={3} mb="md">
        {categoryName}
      </Title>
      <MonthNavigationBar
        selectedMonth={month}
        onPrev={onPrevMonth}
        onNext={onNextMonth}
        onGoToToday={onGoToToday}
        leftSection={
          <Button
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onBack}
          >
            Back to budget
          </Button>
        }
      />
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
    </Box>
  );
}
