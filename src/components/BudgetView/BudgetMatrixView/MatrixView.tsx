import { useRef, useState } from "react";
import { Box, Paper, Text } from "@mantine/core";
import { useBudgetMatrixMonthWindow } from "./useBudgetMatrixMonthWindow.js";
import { useBudgetMatrixData } from "./useBudgetMatrixData.js";
import { useExtendableMonthRange } from "./useExtendableMonthRange.js";
import { MatrixValueMode } from "./budgetMatrix.js";
import { MatrixToolbar } from "./MatrixToolbar.js";
import { MatrixTable } from "./MatrixTable.js";
import "./matrix.css";
import { LoadingState } from "../../shared/LoadingState.js";
import { ErrorAlert } from "../../shared/ErrorAlert.js";

export default function BudgetMatrixView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [valueMode, setValueMode] = useState(MatrixValueMode.Budgeted);
  const [applyToFutureMonths, setApplyToFutureMonths] = useState(false);
  const window = useBudgetMatrixMonthWindow();
  const data = useBudgetMatrixData(window.months);
  const { scrollToCurrentMonth } = useExtendableMonthRange({
    ...window,
    scrollRef,
    monthCount: window.months.length,
    layoutReady: !data.showFullLoader && !data.error,
  });

  if (data.error) return <ErrorAlert error={data.error} />;
  if (data.showFullLoader) return <LoadingState />;

  return (
    <Paper
      shadow="sm"
      radius="md"
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
      {data.segments.length === 0 && (
        <Text size="sm" c="dimmed" p="sm">
          No categories yet.
        </Text>
      )}
      <Box
        ref={scrollRef}
        role="region"
        aria-label="Budget matrix months"
        tabIndex={0}
        style={{ flex: 1, minHeight: 0, overflow: "auto" }}
      >
        <MatrixTable
          months={window.months}
          nowYm={window.nowYm}
          segments={data.segments}
          monthData={data.monthData}
          isRefreshing={data.isRefreshing}
          valueMode={valueMode}
          applyToFutureMonths={applyToFutureMonths}
        />
      </Box>
    </Paper>
  );
}
