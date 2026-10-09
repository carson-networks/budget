import { useInfiniteQuery } from "@tanstack/react-query";
import { Alert, Box } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { categoryQueries } from "../../../queries/categories.js";
import { yearMonthKey } from "../../../utils/monthRange.js";
import { CategoryTransactions } from "./CategoryTransactions.js";
import { useSelectedYearMonth } from "./useSelectedYearMonth.js";
import { LoadingState } from "../../shared/LoadingState.js";
import { ErrorAlert } from "../../shared/ErrorAlert.js";

export default function BudgetCategoryTransactionsView() {
  const { categoryId = "" } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { selectedMonth, goPrev, goNext, goToToday } = useSelectedYearMonth();
  const {
    data: categories = [],
    isLoading,
    error,
  } = useInfiniteQuery(categoryQueries.list());
  const category = categories.find((c) => c.id === categoryId);

  const goBack = () =>
    navigate(`/budget?view=month&month=${yearMonthKey(selectedMonth)}`);

  return (
    <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      {error ? (
        <ErrorAlert error={error} />
      ) : isLoading ? (
        <LoadingState />
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
