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
import { useAllAccounts } from "../../hooks/useAccounts";
import { useAccountSelectData } from "./useAccountSelectData";
import { useCreateTransactionForm } from "./useCreateTransactionForm";

interface CreateTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateTransactionModal({
  open,
  onClose,
}: CreateTransactionModalProps) {
  const { accounts } = useAllAccounts();
  const accountOptions = useAccountSelectData(accounts);

  const {
    transactionName,
    setTransactionName,
    accountID,
    setAccountID,
    categoryID,
    setCategoryID,
    amount,
    setAmount,
    transactionDate,
    setTransactionDate,
    createTransaction,
    handleSubmit,
    handleClose,
    isFormValid,
  } = useCreateTransactionForm(open, onClose);

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          New Transaction
        </Title>
      }
      centered
      size={440}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Stack gap="md" mb="md">
          {createTransaction.isError && (
            <Alert color="red" title="Error">
              {createTransaction.error.message}
            </Alert>
          )}

          <TextInput
            label="Transaction Name"
            value={transactionName}
            onChange={(e) => setTransactionName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Account"
            value={accountID}
            onChange={setAccountID}
            data={accountOptions}
            placeholder="Select an account"
            required
            searchable
          />

          <TextInput
            label="Category ID"
            value={categoryID}
            onChange={(e) => setCategoryID(e.target.value)}
            placeholder="UUID"
            description="Enter the category UUID"
            required
          />

          <TextInput
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            description="Decimal amount (e.g. 12.50)"
            required
          />

          <TextInput
            label="Transaction Date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            description="Optional, defaults to today"
          />
        </Stack>

        <Button
          type="submit"
          fullWidth
          color="brand"
          disabled={!isFormValid || createTransaction.isPending}
          leftSection={createTransaction.isPending ? <Loader size="sm" /> : null}
        >
          {createTransaction.isPending ? "Creating..." : "Create Transaction"}
        </Button>
      </Box>
    </Modal>
  );
}
