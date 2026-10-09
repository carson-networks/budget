import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { useAllCategories } from "../../../hooks/useCategories.js";
import { yearMonthKey } from "../../../utils/monthRange.js";
import { CategoryTransactions } from "./CategoryTransactions.js";
import { useSelectedYearMonth } from "./useSelectedYearMonth.js";

export default function BudgetCategoryTransactionsView() {
  const { categoryId = "" } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { selectedMonth, goPrev, goNext, goToToday } = useSelectedYearMonth();
  const { categories, isLoading, error } = useAllCategories();
  const category = categories.find((c) => c.id === categoryId);

  const goBack = () =>
    navigate(`/budget?view=month&month=${yearMonthKey(selectedMonth)}`);

  return (
    <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      {error ? (
        <Alert color="red" title="Something went wrong">
          {error.message}
        </Alert>
      ) : isLoading ? (
        <Stack align="center" justify="center" gap="sm" py="xl">
          <Loader size="md" />
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        </Stack>
      ) : !category ? (
        <Alert color="gray" title="Category not found">
          This category is no longer available.
        </Alert>
      ) : (
        <CategoryTransactions
          month={selectedMonth}
          category={category}
          onPrevMonth={goPrev}
          onNextMonth={goNext}
          onGoToToday={goToToday}
          onBack={goBack}
        />
      )}
    </Box>
  );
}
