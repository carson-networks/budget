import { Button, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type DeleteConfirmBarProps = {
  armed: boolean;
  /** Shown when `armed` is true, above Cancel / Delete. */
  confirmMessage: ReactNode;
  /** Label for the initial “arm delete” button. */
  armButtonLabel: string;
  onArm: () => void;
  onDisarm: () => void;
  onConfirmDelete: () => void;
  /** When false, both arm and confirm are disabled (API / mock gating). */
  canDelete: boolean;
  deletePending: boolean;
  cancelDisabled?: boolean;
  /** e.g. category form: disable cancel while either mutation runs */
  armDisabled?: boolean;
  /** Mantine margin on the arm button row (varies slightly per modal). */
  armButtonMb?: string;
  /** Mantine margin bottom on the armed Stack */
  armedStackMb?: string;
};

/**
 * Two-step delete: light “Delete …” button, then confirm row with Cancel / Delete.
 */
export function DeleteConfirmBar({
  armed,
  confirmMessage,
  armButtonLabel,
  onArm,
  onDisarm,
  onConfirmDelete,
  canDelete,
  deletePending,
  cancelDisabled = false,
  armDisabled = false,
  armButtonMb = "sm",
  armedStackMb = "md",
}: DeleteConfirmBarProps) {
  if (armed) {
    return (
      <Stack gap="sm" mb={armedStackMb}>
        <Text size="sm" fw={500}>
          {confirmMessage}
        </Text>
        <Group grow>
          <Button
            variant="default"
            disabled={cancelDisabled || deletePending}
            onClick={onDisarm}
          >
            Cancel
          </Button>
          <Button
            color="red"
            loading={deletePending}
            disabled={!canDelete}
            onClick={onConfirmDelete}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Button
      variant="light"
      color="red"
      fullWidth
      mb={armButtonMb}
      disabled={!canDelete || armDisabled}
      onClick={onArm}
    >
      {armButtonLabel}
    </Button>
  );
}
