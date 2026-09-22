import {
  Modal,
  Box,
  Stack,
  Button,
  Text,
  TextInput,
  Title,
  Alert,
  Loader,
} from "@mantine/core";
import type { Account } from "../../../models";
import { formatCurrency } from "../../../models";
import { DeleteConfirmModal } from "../../shared/DeleteConfirmModal.js";
import { useEditAccountModal } from "./useEditAccountModal.js";

type EditAccountModalProps = {
  account: Account | null;
  open: boolean;
  onClose: () => void;
};

type AccountSettingsBodyProps = {
  account: Account;
  onClose: () => void;
};

function AccountSettingsBody({ account, onClose }: AccountSettingsBodyProps) {
  const {
    name,
    setName,
    subType,
    setSubType,
    startingBalance,
    setStartingBalance,
    updateAccount,
    deleteAccount,
    deleteConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleClose,
    handleSubmit,
    handleConfirmDelete,
    isFormValid,
    busy,
    canDelete,
  } = useEditAccountModal(account, onClose);

  return (
    <>
      <Modal
        opened
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
        <Box
          component="form"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Stack gap="md" mb="md">
            {updateAccount.isError || deleteAccount.isError ? (
              <Alert color="red" title="Error">
                {(updateAccount.error ?? deleteAccount.error)?.message}
              </Alert>
            ) : null}

            <TextInput
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <TextInput
              label="Sub type"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              required
            />

            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Balance
              </Text>
              <Text size="sm" fw={500}>
                {formatCurrency(account.balance)}
              </Text>
            </div>

            <TextInput
              label="Starting balance"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              description="Changing this adjusts the current balance by the same delta."
              required
            />
          </Stack>

          <Button
            type="submit"
            fullWidth
            color="brand"
            mb="sm"
            disabled={!isFormValid || busy}
            leftSection={updateAccount.isPending ? <Loader size="sm" /> : null}
          >
            {updateAccount.isPending ? "Saving..." : "Save changes"}
          </Button>

          <Button
            variant="light"
            color="red"
            fullWidth
            disabled={!canDelete || busy}
            onClick={openDeleteConfirm}
          >
            Delete account
          </Button>
        </Box>
      </Modal>

      <DeleteConfirmModal
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        message={`Delete “${account.name}”?`}
        onConfirm={handleConfirmDelete}
        canDelete={canDelete}
        deletePending={deleteAccount.isPending}
      />
    </>
  );
}

export default function EditAccountModal({
  account,
  open,
  onClose,
}: EditAccountModalProps) {
  return (
    <Modal.Stack>
      {open && account ? (
        <AccountSettingsBody
          key={account.id}
          account={account}
          onClose={onClose}
        />
      ) : null}
    </Modal.Stack>
  );
}
