import { useState } from "react";
import { Box, Group, SegmentedControl, Title } from "@mantine/core";
import BudgetMonthView from "./BudgetMonthView/MonthView.js";
import BudgetMatrixView from "./BudgetMatrixView/MatrixView.js";

export default function BudgetView() {
  const [mode, setMode] = useState("month");
  return (
    <Box
      style={{
        flex: "0 0 auto",
        height:
          "calc(100dvh - var(--app-shell-header-offset, 0px) - 2 * var(--mantine-spacing-md))",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Group justify="space-between" mb="md">
        <Title order={4} c="dimmed">
          Budget
        </Title>
        <SegmentedControl
          aria-label="Budget view"
          value={mode}
          onChange={setMode}
          data={[
            { label: "Matrix", value: "matrix" },
            { label: "Month", value: "month" },
          ]}
        />
      </Group>
      {mode === "matrix" ? <BudgetMatrixView /> : <BudgetMonthView />}
    </Box>
  );
}
