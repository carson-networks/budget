import {
  Modal,
  Box,
  Stack,
  Button,
  Text,
  Title,
  Alert,
} from "@mantine/core";
import { useDeleteAccount, type Account } from "../../hooks/useAccounts";
import { isFakeBudgetData } from "../../data/fakeData";
import { useDeleteConfirmation } from "../../hooks/useDeleteConfirmation";
import { DeleteConfirmBar } from "../shared/DeleteConfirmBar";
import { AccountDetailRows } from "./AccountDetailRows";

interface EditAccountModalProps {
  account: Account | null;
  opened: boolean;
  onClose: () => void;
}

export default function EditAccountModal({
  account,
  opened,
  onClose,
}: EditAccountModalProps) {
  const deleteAccount = useDeleteAccount();
  const { armed: deleteArmed, arm, disarm, reset: resetDelete } =
    useDeleteConfirmation();

  const handleModalClose = () => {
    resetDelete();
    deleteAccount.reset();
    onClose();
  };

  const canDelete = isFakeBudgetData();

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          Account settings
        </Title>
      }
      centered
      size={440}
    >
      {account ? (
        <Box key={account.id} style={{ display: "flex", flexDirection: "column" }}>
          <Stack gap="md" mb="md">
            {deleteAccount.isError && (
              <Alert color="red" title="Error">
                {deleteAccount.error.message}
              </Alert>
            )}

            <AccountDetailRows account={account} />

            <Text size="sm" c="dimmed">
              Editing account fields is not available in the API yet. With mock data you
              can delete this account; linked mock transactions are removed too.
            </Text>

            {!canDelete && (
              <Text size="sm" c="dimmed">
                Deleting accounts requires mock data until the API supports it.
              </Text>
            )}
          </Stack>

          <DeleteConfirmBar
            armed={deleteArmed}
            confirmMessage="Delete this account and all transactions on it (mock data only)?"
            armButtonLabel="Delete account"
            onArm={arm}
            onDisarm={disarm}
            onConfirmDelete={() =>
              deleteAccount.mutate(account.id, {
                onSuccess: () => {
                  resetDelete();
                  handleModalClose();
                },
              })
            }
            canDelete={canDelete}
            deletePending={deleteAccount.isPending}
            cancelDisabled={deleteAccount.isPending}
            armButtonMb="sm"
            armedStackMb="md"
          />

          <Button fullWidth color="brand" onClick={handleModalClose}>
            Close
          </Button>
        </Box>
      ) : null}
    </Modal>
  );
}
