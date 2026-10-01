import { useState } from "react";
import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import { ViewShell } from "../../shared/ViewShell.js";
import { useSelectedYearMonth } from "./useSelectedYearMonth.js";
import { useBudgetMonthData } from "./useBudgetMonthData.js";
import { MonthNavigationBar } from "./MonthNavigationBar.js";
import { SegmentBudgetTable } from "./SegmentBudgetTable.js";
import { MonthTotalsTable } from "./MonthTotalsTable.js";

export default function BudgetMonthView() {
  const { selectedMonth, goPrev, goNext, goToToday } = useSelectedYearMonth();
  const [applyToFollowingMonths, setApplyToFollowingMonths] = useState(false);
  const {
    segments,
    budgetByCategoryId,
    actualByCategoryId,
    monthSummary,
    showFullLoader,
    error,
  } = useBudgetMonthData(selectedMonth);

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
    <ViewShell title="Budget">
      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
        <MonthNavigationBar
          selectedMonth={selectedMonth}
          onPrev={goPrev}
          onNext={goNext}
          onGoToToday={goToToday}
          applyToFollowingMonths={applyToFollowingMonths}
          onApplyToFollowingMonthsChange={setApplyToFollowingMonths}
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
            overwriteFutureMonths={applyToFollowingMonths}
          />
        ))}

        <MonthTotalsTable monthSummary={monthSummary} />
      </Box>
    </ViewShell>
  );
}
