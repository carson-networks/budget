import { Button, Checkbox, Group } from "@mantine/core";
import { MatrixValueMode } from "./budgetMatrix.js";

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
    <Group
      justify="space-between"
      p="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
        flexShrink: 0,
      }}
    >
      <Group gap="sm">
        <Button.Group>
          {Object.values(MatrixValueMode).map((mode) => (
            <Button
              key={mode}
              size="xs"
              variant={mode === valueMode ? "light" : "default"}
              aria-pressed={mode === valueMode}
              onClick={() => onValueModeChange(mode)}
            >
              {
                {
                  [MatrixValueMode.Budgeted]: "Budgeted",
                  [MatrixValueMode.Actual]: "Actual",
                  [MatrixValueMode.Net]: "Net",
                }[mode]
              }
            </Button>
          ))}
        </Button.Group>
        {valueMode === MatrixValueMode.Budgeted && (
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
