import { Button, Group, Paper, Stack, Text } from "@mantine/core";

type FollowMonthsConfirmProps = {
  onYes: () => void;
  onNo: () => void;
};

/**
 * Spike: ask whether a budget edit should also apply to following months.
 * Default action is No (current month only).
 */
export function FollowMonthsConfirm({ onYes, onNo }: FollowMonthsConfirmProps) {
  return (
    <Paper
      shadow="md"
      radius="sm"
      p="sm"
      withBorder
      role="dialog"
      aria-label="Apply budget to following months"
      style={{ maxWidth: 260 }}
    >
      <Stack gap="sm">
        <Text size="sm">
          Change the budget for all months following this one?
        </Text>
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Button size="xs" variant="default" onClick={onYes}>
            Yes
          </Button>
          <Button size="xs" autoFocus onClick={onNo}>
            No
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
