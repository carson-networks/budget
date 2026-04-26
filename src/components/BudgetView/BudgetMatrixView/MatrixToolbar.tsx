import { Box, Group, Button, Checkbox } from "@mantine/core";
import type { MatrixValueMode } from "../budgetMatrix";

const border = "1px solid var(--mantine-color-default-border)";

type MatrixToolbarProps = {
  valueMode: MatrixValueMode;
  onValueModeChange: (mode: MatrixValueMode) => void;
  applyToFutureMonths: boolean;
  onApplyToFutureMonthsChange: (checked: boolean) => void;
  onScrollToToday: () => void;
};

export function MatrixToolbar({
  valueMode,
  onValueModeChange,
  applyToFutureMonths,
  onApplyToFutureMonthsChange,
  onScrollToToday,
}: MatrixToolbarProps) {
  return (
    <Box
      px="md"
      py="sm"
      style={{
        backgroundColor: "var(--mantine-color-gray-0)",
        borderBottom: border,
        flexShrink: 0,
      }}
    >
      <Group justify="space-between" wrap="wrap" align="center" gap="sm">
        <Group gap="sm" wrap="wrap" align="center">
          <Button.Group>
            <Button
              size="xs"
              variant={valueMode === "budgeted" ? "light" : "default"}
              color={valueMode === "budgeted" ? "brand" : "gray"}
              onClick={() => onValueModeChange("budgeted")}
              styles={{
                label: { whiteSpace: "normal", lineHeight: 1.25 },
              }}
            >
              Budgeted
            </Button>
            <Button
              size="xs"
              variant={valueMode === "actual" ? "light" : "default"}
              color={valueMode === "actual" ? "brand" : "gray"}
              onClick={() => onValueModeChange("actual")}
              styles={{
                label: { whiteSpace: "normal", lineHeight: 1.25 },
              }}
            >
              Actual
            </Button>
            <Button
              size="xs"
              variant={valueMode === "net" ? "light" : "default"}
              color={valueMode === "net" ? "brand" : "gray"}
              onClick={() => onValueModeChange("net")}
              styles={{
                label: { whiteSpace: "normal", lineHeight: 1.25 },
              }}
            >
              Net
            </Button>
          </Button.Group>
          {valueMode === "budgeted" && (
            <Checkbox
              label="Apply changes to future months"
              size="xs"
              radius={0}
              checked={applyToFutureMonths}
              onChange={(e) => onApplyToFutureMonthsChange(e.currentTarget.checked)}
              styles={{
                label: { fontSize: "var(--mantine-font-size-xs)" },
                input: { borderRadius: 0 },
                inner: { borderRadius: 0 },
                icon: { borderRadius: 0 },
              }}
            />
          )}
        </Group>
        <Button variant="light" color="brand" size="sm" onClick={onScrollToToday}>
          Today
        </Button>
      </Group>
    </Box>
  );
}
