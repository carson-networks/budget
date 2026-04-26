import { Box } from "@mantine/core";
import { useSelectedYearMonth } from "./useSelectedYearMonth";
import { useBudgetMonthData } from "./useBudgetMonthData";
import { MonthNavigationBar } from "./MonthNavigationBar";
import { SegmentBudgetTable } from "./SegmentBudgetTable";
import { MonthTotalsTable } from "./MonthTotalsTable";
import { ViewErrorAlert } from "../../shared/ViewErrorAlert";
import { ViewLoadingState } from "../../shared/ViewLoadingState";

export default function BudgetMonthView() {
  const { selectedMonth, goPrev, goNext, goToToday } = useSelectedYearMonth();
  const {
    segments,
    budgetByCategoryId,
    actualByCategoryId,
    monthSummary,
    showFullLoader,
    budgetsError,
  } = useBudgetMonthData(selectedMonth);

  if (showFullLoader) {
    return <ViewLoadingState />;
  }

  if (budgetsError) {
    return <ViewErrorAlert message={budgetsError.message} />;
  }

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          paddingRight: 2,
        }}
      >
        <MonthNavigationBar
          selectedMonth={selectedMonth}
          onPrev={goPrev}
          onNext={goNext}
          onGoToToday={goToToday}
        />

        {segments.map((segment) => (
          <SegmentBudgetTable
            key={segment.root.id}
            segment={segment}
            selectedMonth={selectedMonth}
            budgetByCategoryId={budgetByCategoryId}
            actualByCategoryId={actualByCategoryId}
          />
        ))}

        <MonthTotalsTable monthSummary={monthSummary} />
      </Box>
    </Box>
  );
}
