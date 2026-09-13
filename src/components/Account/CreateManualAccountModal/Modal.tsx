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
import { AccountKind } from "../../../models";
import { useCreateManualAccountForm } from "./useCreateManualAccountForm.js";

type CreateManualAccountModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CreateManualAccountModal({
  open,
  onClose,
}: CreateManualAccountModalProps) {
  const {
    name,
    setName,
    type,
    setType,
    subType,
    setSubType,
    startingBalance,
    setStartingBalance,
    createAccount,
    handleClose,
    handleSubmit,
    isFormValid,
  } = useCreateManualAccountForm(open, onClose);

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
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Type"
            value={type}
            onChange={setType}
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
            value={subType}
            onChange={(e) => setSubType(e.target.value)}
            placeholder="e.g. Checking, Savings"
            required
          />

          <TextInput
            label="Starting Balance"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
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
