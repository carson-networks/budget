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
import { DeleteConfirmModal } from "../../shared/DeleteConfirmModal.js";
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
    deleteConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleClose,
    handleConfirmDelete,
    canDelete,
  } = useEditAccountModal(account, onClose);

  return (
    <Modal.Stack>
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
        stackId="account-settings"
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

            <Button
              variant="light"
              color="red"
              fullWidth
              mb="sm"
              disabled={!canDelete || deleteAccount.isPending}
              onClick={openDeleteConfirm}
            >
              Delete account
            </Button>

            <Button fullWidth color="brand" onClick={handleClose}>
              Close
            </Button>
          </Box>
        ) : null}
      </Modal>

      <DeleteConfirmModal
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        message="Delete this account?"
        onConfirm={handleConfirmDelete}
        canDelete={canDelete}
        deletePending={deleteAccount.isPending}
      />
    </Modal.Stack>
  );
}
