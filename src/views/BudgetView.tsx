import { useState } from "react";
import { Box, Group, SegmentedControl, Title } from "@mantine/core";
import BudgetMatrixView from "./BudgetMatrixView";
import BudgetMonthView from "./BudgetMonthView";

type BudgetMode = "matrix" | "month";

export default function BudgetView() {
  const [mode, setMode] = useState<BudgetMode>("matrix");

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Group justify="space-between" align="flex-end" wrap="wrap" mb="md" gap="sm">
        <Title order={4} c="dark.6" mb={0}>
          Budget
        </Title>
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as BudgetMode)}
          data={[
            { label: "Matrix", value: "matrix" },
            { label: "Month", value: "month" },
          ]}
          color="brand"
        />
      </Group>

      {mode === "matrix" ? <BudgetMatrixView /> : <BudgetMonthView />}
    </Box>
  );
}
