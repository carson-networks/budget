import { useRef, useState } from "react";
import { Box, Paper } from "@mantine/core";
import { useBudgetMatrixMonthWindow } from "./useBudgetMatrixMonthWindow";
import { useBudgetMatrixData } from "./useBudgetMatrixData";
import { useExtendableMonthRange } from "./useExtendableMonthRange";
import type { MatrixValueMode } from "../budgetMatrix";
import { MatrixToolbar } from "./MatrixToolbar";
import { MatrixTableHeader } from "./MatrixTableHeader";
import { MatrixSegmentBody } from "./MatrixSegmentBody";
import { MatrixTotalsFooter } from "./MatrixTotalsFooter";
import { ViewErrorAlert } from "../../shared/ViewErrorAlert";
import { ViewLoadingState } from "../../shared/ViewLoadingState";

export default function BudgetMatrixView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [valueMode, setValueMode] = useState<MatrixValueMode>("budgeted");
  const [applyToFutureMonths, setApplyToFutureMonths] = useState(false);

  const {
    nowYm,
    rangeStart,
    rangeEnd,
    setRangeStart,
    setRangeEnd,
    months,
    currentMonthIndex,
  } = useBudgetMatrixMonthWindow();

  const {
    segments,
    effectiveBudgetByKey,
    actualsByYearMonth,
    monthSummaries,
    budgetsResponse,
    showFullLoader,
    error,
  } = useBudgetMatrixData(rangeStart, rangeEnd, months);

  const layoutReady = !showFullLoader && !!budgetsResponse;

  const { scrollToCurrentMonth } = useExtendableMonthRange({
    scrollRef,
    months,
    rangeStart,
    rangeEnd,
    setRangeStart,
    setRangeEnd,
    currentMonthIndex,
    layoutReady,
    budgetsResponse,
  });

  if (showFullLoader) {
    return <ViewLoadingState />;
  }

  if (error) {
    return <ViewErrorAlert message={error.message} />;
  }

  const stickyBg = "var(--mantine-color-body)";
  const headerBg = "var(--mantine-color-gray-0)";
  const segmentRowBg = "var(--mantine-color-gray-0)";
  const border = "1px solid var(--mantine-color-default-border)";

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        paddingRight: 2,
      }}
    >
      <Paper
        shadow="sm"
        radius="md"
        mb="md"
        p={0}
        withBorder
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <MatrixToolbar
          valueMode={valueMode}
          onValueModeChange={setValueMode}
          applyToFutureMonths={applyToFutureMonths}
          onApplyToFutureMonthsChange={setApplyToFutureMonths}
          onScrollToToday={scrollToCurrentMonth}
        />
        <Box
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <table
            style={{
              borderCollapse: "separate",
              borderSpacing: 0,
              minWidth: "100%",
            }}
          >
            <MatrixTableHeader
              months={months}
              nowYm={nowYm}
              headerBg={headerBg}
              border={border}
            />
            <tbody>
              <MatrixSegmentBody
                segments={segments}
                months={months}
                nowYm={nowYm}
                valueMode={valueMode}
                applyToFutureMonths={applyToFutureMonths}
                effectiveBudgetByKey={effectiveBudgetByKey}
                actualsByYearMonth={actualsByYearMonth}
                stickyBg={stickyBg}
                segmentRowBg={segmentRowBg}
                border={border}
              />
            </tbody>
            <MatrixTotalsFooter
              months={months}
              nowYm={nowYm}
              valueMode={valueMode}
              monthSummaries={monthSummaries}
              border={border}
            />
          </table>
        </Box>
      </Paper>
    </Box>
  );
}
