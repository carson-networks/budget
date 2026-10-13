import {
  Modal,
  Box,
  Stack,
  TextInput,
  Select,
  Button,
  Alert,
  Loader,
  Title,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AccountKind, truncateToTwoDecimals } from "../../../models";
import { accountMutations } from "../../../queries/accounts.js";
import {
  emptyAccountForm,
  isAccountFormValid,
  toCreateAccountInput,
  type AccountFormValues,
} from "../accountForm.js";

type CreateManualAccountModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CreateManualAccountModal({
  open,
  onClose,
}: CreateManualAccountModalProps) {
  const [values, setValues] = useState(emptyAccountForm);
  const createAccount = useMutation(accountMutations.createManual);
  const isFormValid = isAccountFormValid(values, { requireType: true });

  const setField = <K extends keyof AccountFormValues>(
    key: K,
    value: AccountFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    setValues(emptyAccountForm());
    createAccount.reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    createAccount.mutate(toCreateAccountInput(values), {
      onSuccess: handleClose,
    });
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          New manual account
        </Title>
      }
      centered
      size={520}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Stack gap="md" mb="md">
          {createAccount.isError && (
            <Alert color="red" title="Error">
              {createAccount.error.message}
            </Alert>
          )}

          <TextInput
            label="Name"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Type"
            value={values.type}
            onChange={(value) => setField("type", value)}
            data={[
              { value: String(AccountKind.Cash), label: "Cash" },
              {
                value: String(AccountKind.CreditCards),
                label: "Credit Cards",
              },
            ]}
            required
            comboboxProps={{ withinPortal: true }}
          />

          <TextInput
            label="Sub Type"
            value={values.subType}
            onChange={(e) => setField("subType", e.target.value)}
            placeholder="e.g. Checking, Savings"
            required
          />

          <TextInput
            label="Starting Balance"
            leftSection="$"
            value={values.startingBalance}
            onChange={(e) =>
              setField("startingBalance", truncateToTwoDecimals(e.target.value))
            }
            placeholder="0.00"
            description="Decimal amount (e.g. 0.00 or -500.00)"
            required
          />
        </Stack>

        <Button
          type="submit"
          fullWidth
          color="brand"
          disabled={createAccount.isPending || !isFormValid}
          leftSection={createAccount.isPending ? <Loader size="sm" /> : null}
        >
          {createAccount.isPending ? "Creating..." : "Create account"}
        </Button>
      </Box>
    </Modal>
  );
}
