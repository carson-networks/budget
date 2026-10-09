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
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import type { Account } from "../../../models";
import { formatCurrency, truncateToTwoDecimals } from "../../../models";
import { accountMutations } from "../../../queries/accounts.js";
import { DeleteConfirmModal } from "../../shared/DeleteConfirmModal.js";
import {
  accountFormFrom,
  isAccountFormValid,
  toUpdateAccountInput,
  type AccountFormValues,
} from "../accountForm.js";

type EditAccountModalProps = {
  account: Account | null;
  open: boolean;
  onClose: () => void;
};

type AccountSettingsBodyProps = {
  account: Account;
  onClose: () => void;
};

/** Form + delete state for a single account. Remounted via `key={account.id}`. */
function AccountSettingsBody({ account, onClose }: AccountSettingsBodyProps) {
  const [values, setValues] = useState(() => accountFormFrom(account));
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const updateAccount = useMutation(accountMutations.update);
  const deleteAccount = useMutation(accountMutations.delete);
  const isFormValid = isAccountFormValid(values, { requireType: false });
  const busy = updateAccount.isPending || deleteAccount.isPending;
  const canDelete = true;

  const setField = <K extends keyof AccountFormValues>(
    key: K,
    value: AccountFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    setDeleteConfirmOpen(false);
    updateAccount.reset();
    deleteAccount.reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    updateAccount.mutate(toUpdateAccountInput(account.id, values), {
      onSuccess: handleClose,
    });
  };

  const handleConfirmDelete = () =>
    deleteAccount.mutate(account.id, { onSuccess: handleClose });

  return (
    <Modal.Stack>
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
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              autoFocus
            />

            <TextInput
              label="Sub type"
              value={values.subType}
              onChange={(e) => setField("subType", e.target.value)}
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
              leftSection="$"
              value={values.startingBalance}
              onChange={(e) =>
                setField(
                  "startingBalance",
                  truncateToTwoDecimals(e.target.value),
                )
              }
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
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete account
          </Button>
        </Box>
      </Modal>

      <DeleteConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        message={`Delete “${account.name}”?`}
        onConfirm={handleConfirmDelete}
        canDelete={canDelete}
        deletePending={deleteAccount.isPending}
      />
    </Modal.Stack>
  );
}

export default function EditAccountModal({
  account,
  open,
  onClose,
}: EditAccountModalProps) {
  if (!open || !account) {
    return null;
  }

  return (
    <AccountSettingsBody
      key={account.id}
      account={account}
      onClose={onClose}
    />
  );
}
