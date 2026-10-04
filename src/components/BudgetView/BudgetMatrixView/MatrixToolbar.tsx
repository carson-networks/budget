import { Button, Checkbox, Group } from "@mantine/core";
import type { MatrixValueMode } from "./budgetMatrix.js";

type Props = {
  valueMode: MatrixValueMode;
  onValueModeChange: (mode: MatrixValueMode) => void;
  applyToFutureMonths: boolean;
  onApplyToFutureMonthsChange: (value: boolean) => void;
  onScrollToToday: () => void;
};

export function MatrixToolbar({
  valueMode,
  onValueModeChange,
  applyToFutureMonths,
  onApplyToFutureMonthsChange,
  onScrollToToday,
}: Props) {
  return (
    <Group justify="space-between" p="sm" className="budget-matrix-toolbar">
      <Group gap="sm">
        <Button.Group>
          {(["budgeted", "actual", "net"] as const).map((mode) => (
            <Button
              key={mode}
              size="xs"
              variant={mode === valueMode ? "light" : "default"}
              aria-pressed={mode === valueMode}
              onClick={() => onValueModeChange(mode)}
            >
              {{ budgeted: "Budgeted", actual: "Actual", net: "Net" }[mode]}
            </Button>
          ))}
        </Button.Group>
        {valueMode === "budgeted" && (
          <Checkbox
            label="Apply changes to future months"
            size="xs"
            checked={applyToFutureMonths}
            onChange={(event) =>
              onApplyToFutureMonthsChange(event.currentTarget.checked)
            }
          />
        )}
      </Group>
      <Button variant="light" size="sm" onClick={onScrollToToday}>
        Today
      </Button>
    </Group>
  );
}
