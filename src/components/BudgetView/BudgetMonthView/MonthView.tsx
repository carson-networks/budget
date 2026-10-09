import { useState } from "react";
import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  compareYearMonth,
  currentYearMonth,
  yearMonthKey,
} from "../../../utils/monthRange.js";
import { useSelectedYearMonth } from "./useSelectedYearMonth.js";
import { useBudgetMonthData } from "./useBudgetMonthData.js";
import { MonthNavigationBar } from "./MonthNavigationBar.js";
import { MonthOptionsMenu } from "./MonthOptionsMenu.js";
import { SegmentBudgetTable } from "./SegmentBudgetTable.js";
import { MonthTotalsTable } from "./MonthTotalsTable.js";
import type { Category } from "../../../models";

export default function BudgetMonthView() {
  const { selectedMonth, goPrev, goNext, goToToday } = useSelectedYearMonth();
  const [applyToFollowingMonths, setApplyToFollowingMonths] = useState(false);
  const navigate = useNavigate();
  const canApplyToFollowingMonths =
    compareYearMonth(selectedMonth, currentYearMonth()) >= 0;
  const overwriteFutureMonths =
    canApplyToFollowingMonths && applyToFollowingMonths;
  const {
    segments,
    budgetByCategoryId,
    actualByCategoryId,
    monthSummary,
    showFullLoader,
    error,
  } = useBudgetMonthData(selectedMonth);

  const openCategory = (category: Category) =>
    navigate(
      `/budget/categories/${category.id}?month=${yearMonthKey(selectedMonth)}`,
    );

  if (showFullLoader) {
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
    <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
      <MonthNavigationBar
        selectedMonth={selectedMonth}
        onPrev={goPrev}
        onNext={goNext}
        onGoToToday={goToToday}
        leftSection={
          <MonthOptionsMenu
            canApplyToFollowingMonths={canApplyToFollowingMonths}
            applyToFollowingMonths={applyToFollowingMonths}
            onApplyToFollowingMonthsChange={setApplyToFollowingMonths}
          />
        }
      />

      {segments.length === 0 ? (
        <Text size="sm" c="dimmed">
          No categories yet.
        </Text>
      ) : null}

      {segments.map((segment) => (
        <SegmentBudgetTable
          key={segment.root.id}
          segment={segment}
          selectedMonth={selectedMonth}
          budgetByCategoryId={budgetByCategoryId}
          actualByCategoryId={actualByCategoryId}
          overwriteFutureMonths={overwriteFutureMonths}
          onOpenCategory={openCategory}
        />
      ))}

      <MonthTotalsTable monthSummary={monthSummary} />
    </Box>
  );
}
