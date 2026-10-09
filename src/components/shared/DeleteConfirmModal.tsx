import { Modal, Stack, Button, Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type DeleteConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  canDelete?: boolean;
  deletePending?: boolean;
  stackId?: string;
};

/**
 * Second-step delete confirmation as its own modal (settings stays open underneath).
 */
export function DeleteConfirmModal({
  open,
  onClose,
  title = "Delete account",
  message,
  confirmLabel = "Delete",
  onConfirm,
  canDelete = true,
  deletePending = false,
  stackId = "delete-confirm",
}: DeleteConfirmModalProps) {
  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          {title}
        </Title>
      }
      centered
      size={400}
      stackId={stackId}
      closeOnClickOutside={!deletePending}
      closeOnEscape={!deletePending}
    >
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        <Group grow>
          <Button
            variant="default"
            disabled={deletePending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            color="red"
            loading={deletePending}
            disabled={!canDelete}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
