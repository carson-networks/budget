import {
  Modal,
  Box,
  Stack,
  Button,
  Text,
  Title,
  Alert,
} from "@mantine/core";
import type { Account } from "../../../models";
import { DeleteConfirmBar } from "../../shared/DeleteConfirmBar.js";
import { AccountDetailRows } from "./AccountDetailRows.js";
import { useEditAccountModal } from "./useEditAccountModal.js";

type EditAccountModalProps = {
  account: Account | null;
  open: boolean;
  onClose: () => void;
};

export default function EditAccountModal({
  account,
  open,
  onClose,
}: EditAccountModalProps) {
  const {
    deleteAccount,
    deleteArmed,
    arm,
    disarm,
    handleClose,
    handleConfirmDelete,
    canDelete,
  } = useEditAccountModal(account, onClose);

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          Account settings
        </Title>
      }
      centered
      size={440}
    >
      {account ? (
        <Box
          key={account.id}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Stack gap="md" mb="md">
            {deleteAccount.isError ? (
              <Alert color="red" title="Error">
                {deleteAccount.error.message}
              </Alert>
            ) : null}

            <AccountDetailRows account={account} />

            <Text size="sm" c="dimmed">
              Editing account fields is not available in the API yet. You can
              delete this account from the local list until the server supports
              it.
            </Text>
          </Stack>

          <DeleteConfirmBar
            armed={deleteArmed}
            confirmMessage="Delete this account?"
            armButtonLabel="Delete account"
            onArm={arm}
            onDisarm={disarm}
            onConfirmDelete={handleConfirmDelete}
            canDelete={canDelete}
            deletePending={deleteAccount.isPending}
            cancelDisabled={deleteAccount.isPending}
            armButtonMb="sm"
            armedStackMb="md"
          />

          <Button fullWidth color="brand" onClick={handleClose}>
            Close
          </Button>
        </Box>
      ) : null}
    </Modal>
  );
}
